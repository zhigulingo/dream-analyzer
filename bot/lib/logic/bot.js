// bot/functions/bot.js

// --- Imports ---
const { Bot, GrammyError, HttpError } = require("grammy");
const { createClient } = require("@supabase/supabase-js");
const { createLogger } = require("./shared/utils/logger");

// Import services
const UserService = require("./bot/services/user-service");
const MessageService = require("./bot/services/message-service");
const AnalysisService = require("./bot/services/analysis-service");

// Import handlers
const createStartCommandHandler = require("./bot/handlers/start-command");
const createTextMessageHandler = require("./bot/handlers/text-message");
const {
    createPreCheckoutQueryHandler,
    createSuccessfulPaymentHandler
} = require("./bot/handlers/payment-handlers");

// --- Environment Variables ---
const BOT_TOKEN = process.env.BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const TMA_URL = process.env.TMA_URL;
const ALLOWED_TMA_ORIGIN = process.env.ALLOWED_TMA_ORIGIN;
const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(s => s.trim()).filter(Boolean);

// --- Global Initialization ---
let bot;
let supabaseAdmin;
let userService;
let messageService;
let analysisService;
const logger = createLogger({ module: 'telegram-bot' });

try {
    if (!BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_KEY || !GEMINI_API_KEY) {
        throw new Error("Missing critical environment variables!");
    }

    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
    bot = new Bot(BOT_TOKEN);

    const TMA_APP_URL = TMA_URL || ALLOWED_TMA_ORIGIN || '';
    userService = new UserService(supabaseAdmin);
    messageService = new MessageService(bot.api);
    analysisService = new AnalysisService(supabaseAdmin);

    // --- Setting up Handlers ---

    // 1. Global Stub for Guests
    bot.on('message', async (ctx, next) => {
        try {
            const userId = ctx.from?.id;
            const msgTs = Number(ctx.message?.date || 0);
            if (Math.floor(Date.now() / 1000) - msgTs > 60) return;

            let subType = 'guest';
            try {
                if (userId && supabaseAdmin) {
                    const { data: u } = await supabaseAdmin.from('users').select('subscription_type').eq('tg_id', userId).single();
                    subType = String(u?.subscription_type || 'guest').toLowerCase();
                }
            } catch (_) { }

            // Admins and non-guests proceed
            if (ADMIN_IDS.includes(String(userId)) || subType !== 'guest') {
                return next();
            }

            // Guest stub
            const text = 'Привет! Наш бот в процессе обновления и скоро будет вновь доступен. Следи за новостями и подпишись на нашу группу: @TheDreamsHub';
            await messageService.sendReply(ctx, text);
        } catch (e) {
            logger.warn('Stub handler failed', { error: e?.message });
        }
    });

    // 2. Admin Command: /startbeta [текст]
    bot.command('startbeta', async (ctx) => {
        if (!ADMIN_IDS.includes(String(ctx.from?.id))) return;

        const text = ctx.match || 'Дорогие друзья, наконец мы готовы пригласить вас принять участие в бета тесте! Откликнуться и принять участие можно кликнув по кнопке ниже';
        const channelId = process.env.BETA_CHANNEL_ID;
        const appUrl = process.env.SURVEY_APP_URL || 'https://t.me/dreamtestaibot/betasurvey';

        if (!channelId) return ctx.reply('Ошибка: BETA_CHANNEL_ID не настроен.');

        try {
            const payload = {
                chat_id: channelId,
                text: text,
                reply_markup: {
                    inline_keyboard: [[{ text: 'Принять участие', url: appUrl }]]
                }
            };
            const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await resp.json();
            if (result.ok) await ctx.reply('✅ Анонс опубликован!');
            else await ctx.reply(`❌ Ошибка: ${result.description}`);
        } catch (e) {
            await ctx.reply(`❌ Ошибка: ${e.message}`);
        }
    });

    // 3. Command: /start
    bot.command("start", createStartCommandHandler(userService, messageService, TMA_APP_URL));

    // 4. Main Dream Analysis Handler
    bot.on("message:text", createTextMessageHandler(userService, messageService, analysisService, TMA_APP_URL));

    // 5. Payment Handlers
    bot.on('pre_checkout_query', createPreCheckoutQueryHandler(messageService));
    bot.on('message:successful_payment', createSuccessfulPaymentHandler(userService, messageService));

    bot.catch((err) => {
        logger.error("Bot error", err.error);
    });

} catch (e) {
    logger.error("Failed to initialize bot", e);
}

exports.handler = async (event) => {
    try {
        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        await bot.handleUpdate(body);
        return { statusCode: 200, body: 'ok' };
    } catch (e) {
        console.error('Webhook error:', e);
        return { statusCode: 500, body: 'error' };
    }
};
