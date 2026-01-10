// bot/functions/bot.js

const { Bot, GrammyError, HttpError } = require("grammy");
const { createClient } = require("@supabase/supabase-js");

// Services & Handlers
const UserService = require("./bot/services/user-service");
const MessageService = require("./bot/services/message-service");
const AnalysisService = require("./bot/services/analysis-service");
const createStartCommandHandler = require("./bot/handlers/start-command");
const createTextMessageHandler = require("./bot/handlers/text-message");
const createGoLiveCommandHandler = require("./bot/handlers/golive-command");
const { createPreCheckoutQueryHandler, createSuccessfulPaymentHandler } = require("./bot/handlers/payment-handlers");

// Env Vars
const BOT_TOKEN = process.env.BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(s => s.trim()).filter(Boolean);

let cachedBot = null;

async function initBot() {
    if (cachedBot) return cachedBot;

    if (!BOT_TOKEN) throw new Error("BOT_TOKEN is missing!");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error("Supabase config is missing!");

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    const bot = new Bot(BOT_TOKEN);
    const TMA_APP_URL = process.env.TMA_URL || process.env.ALLOWED_TMA_ORIGIN || '';

    const userService = new UserService(supabaseAdmin);
    const messageService = new MessageService(bot.api);
    const analysisService = new AnalysisService(supabaseAdmin);

    // --- Handlers ---

    // 1. Guest & Admin Check
    bot.on('message', async (ctx, next) => {
        const userId = ctx.from?.id;
        const msgTs = Number(ctx.message?.date || 0);
        if (Math.floor(Date.now() / 1000) - msgTs > 60) return;

        // Admin bypass
        if (userId && ADMIN_IDS.includes(String(userId))) {
            return next();
        }

        let subType = 'guest';
        try {
            const { data: u } = await supabaseAdmin.from('users').select('subscription_type').eq('tg_id', userId).single();
            subType = String(u?.subscription_type || 'guest').toLowerCase();
        } catch (_) { }

        if (subType !== 'guest') {
            return next();
        }

        // Guest stub
        const text = 'Привет! Наш бот в процессе обновления и скоро будет вновь доступен. Следи за новостями и подпишись на нашу группу: @TheDreamsHub';
        await messageService.sendReply(ctx, text);
    });

    // 2. Command: /startbeta [текст]
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

    // 3. Main Commands & Actions
    bot.command("golive", createGoLiveCommandHandler(userService, messageService, ADMIN_IDS, TMA_APP_URL));
    bot.command("start", createStartCommandHandler(userService, messageService, TMA_APP_URL));
    bot.on("message:text", createTextMessageHandler(userService, messageService, analysisService, TMA_APP_URL));
    bot.on('pre_checkout_query', createPreCheckoutQueryHandler(messageService));
    bot.on('message:successful_payment', createSuccessfulPaymentHandler(userService, messageService));

    // 4. Callback Queries (including Admin Approvals)
    bot.on('callback_query:data', async (ctx) => {
        const data = ctx.callbackQuery.data;
        const adminId = ctx.from.id;

        // Admin Action: Approve Beta
        if (data.startsWith('approve_beta_')) {
            if (!ADMIN_IDS.includes(String(adminId))) {
                return ctx.answerCallbackQuery({ text: '⛔ У вас нет прав администратора', show_alert: true });
            }

            const targetTgId = data.replace('approve_beta_', '');
            if (!targetTgId) return ctx.answerCallbackQuery();

            try {
                // 1. Update User in DB
                const now = new Date();
                const accessAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // +24h

                const { error } = await supabaseAdmin
                    .from('users')
                    .update({
                        beta_whitelisted: true,
                        beta_approved_at: now.toISOString(),
                        beta_access_at: accessAt,
                        subscription_type: 'whitelisted',
                        beta_notified_approved: true // Сразу ставим флаг, так как уведомим прямо сейчас
                    })
                    .eq('tg_id', targetTgId);

                if (error) throw error;

                // 2. Also update survey response status
                await supabaseAdmin
                    .from('beta_survey_responses')
                    .update({ approved: true })
                    .eq('tg_id', targetTgId);

                // 3. Notify User
                const hoursLeft = 24;
                const message = `🎉 <b>Поздравляем!</b>\n\nВы прошли отбор в бета-тестирование Dream Analyzer!\n\n⏰ Доступ к приложению откроется примерно через <b>${hoursLeft} часа</b>.\n\nМы пришлем вам уведомление, как только приложение станет доступным.`;

                try {
                    await ctx.api.sendMessage(targetTgId, message, { parse_mode: 'HTML' });
                } catch (sendErr) {
                    console.warn(`[Approve] Failed to notify user ${targetTgId}:`, sendErr.message);
                }

                // 4. Update Admin Message
                await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } }); // remove buttons
                await ctx.reply(`✅ Пользователь ${targetTgId} одобрен! Уведомление отправлено.`);
                await ctx.answerCallbackQuery({ text: 'Доступ одобрен!' });

            } catch (err) {
                console.error(`[Approve] Error approving user ${targetTgId}:`, err);
                await ctx.answerCallbackQuery({ text: '❌ Ошибка при обновлении базы', show_alert: true });
            }
        }
    });


    bot.catch((err) => {
        console.error("Grammy error:", err.error);
    });

    // Initialize bot info (required for handleUpdate)
    try {
        await bot.init();
        console.log(`[Bot] Initialized as ${bot.botInfo.username}`);
    } catch (e) {
        console.error("[Bot] Failed to fetch bot info:", e.message);
        // We can continue, but some middleware might fail if they depend on botInfo
    }

    cachedBot = bot;
    return bot;
}

exports.handler = async (event) => {
    try {
        const bot = await initBot();
        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        await bot.handleUpdate(body);
        return { statusCode: 200, body: 'ok' };
    } catch (e) {
        console.error('Bot Handler Error:', e);
        return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
    }
};
