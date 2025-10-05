// bot/functions/bot.js

// --- Imports ---
const { Bot, GrammyError, HttpError, webhookCallback } = require("grammy");
const { createClient } = require("@supabase/supabase-js");

// Импорт structured logger
const { createLogger } = require("./shared/utils/logger");

// Import services
const UserService = require("./bot/services/user-service");
const MessageService = require("./bot/services/message-service");
const AnalysisService = require("./bot/services/analysis-service");

// Import handlers
const createStartCommandHandler = require("./bot/handlers/start-command");
const createSetPasswordCommandHandler = require("./bot/handlers/setpassword-command");
const createTextMessageHandler = require("./bot/handlers/text-message");
const createGoLiveCommandHandler = require("./bot/handlers/golive-command");
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
let initializationError = null;
let botInitializedAndHandlersSet = false;

// Создание логгера для бота
const logger = createLogger({ module: 'telegram-bot' });

try {
    // Генерируем correlation ID для инициализации
    const correlationId = logger.generateCorrelationId();
    
    logger.info("Bot initialization started", { 
        correlationId,
        environment: process.env.NODE_ENV || 'development'
    });
    
    // Validate environment variables
    if (!BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_KEY || !GEMINI_API_KEY) {
        throw new Error("FATAL: Missing one or more critical environment variables! (BOT_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY)");
    }

    // Initialize clients
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
    bot = new Bot(BOT_TOKEN);
    
    logger.info("Bot clients and instance created", { 
        botToken: BOT_TOKEN ? 'configured' : 'missing',
        supabaseUrl: SUPABASE_URL ? 'configured' : 'missing'
    });

    // Resolve TMA app URL (fallback to allowed origin if TMA_URL is not set)
    // Updated fallback to current production TMA domain
    const TMA_APP_URL = TMA_URL || ALLOWED_TMA_ORIGIN || 'https://dream-analyzer.netlify.app';
    logger.info("Resolved TMA app URL", { TMA_APP_URL, hasExplicitTmaUrl: !!TMA_URL, allowedOrigin: ALLOWED_TMA_ORIGIN });

    // Initialize services
    userService = new UserService(supabaseAdmin);
    messageService = new MessageService(bot.api);
    analysisService = new AnalysisService(supabaseAdmin);
    
    logger.info("Bot services initialized", {
        services: ['UserService', 'MessageService', 'AnalysisService']
    });

    // --- Setting up Handlers ---
    logger.info("Setting up bot handlers");

    // Global 5‑minute stub for any incoming messages/commands to prevent spam during beta survey
    bot.on('message', async (ctx) => {
        try {
            const cache = require('./shared/services/cache-service');
            const userId = ctx.from?.id;
            const updateId = ctx.update?.update_id;
            // Ignore stale updates (>60s)
            try {
                const msgTs = Number(ctx.message?.date || 0);
                const ageSec = Math.floor(Date.now() / 1000) - msgTs;
                if (ageSec > 60) return; // silent ignore
            } catch (_) {}
            // Idempotency by update_id (1 hour)
            if (updateId) {
                const idemKey = `bot:idem:update:${updateId}`;
                if (cache.get(idemKey)) return;
                cache.set(idemKey, true, 60 * 60 * 1000);
            }
            // Debounce per user (5 minutes)
            const debounceKey = userId ? `bot:stub:5m:${userId}` : null;
            if (debounceKey && cache.get(debounceKey)) {
                return; // swallow within buffer window
            }
            if (debounceKey) cache.set(debounceKey, true, 5 * 60 * 1000);

            // Resolve user type to customize message for guests
            let isGuest = true;
            try {
                if (userId && supabaseAdmin) {
                    const { data: u } = await supabaseAdmin
                        .from('users')
                        .select('subscription_type')
                        .eq('tg_id', userId)
                        .single();
                    const sub = String(u?.subscription_type || 'guest').toLowerCase();
                    isGuest = (sub === 'guest');
                }
            } catch (_) { /* default to guest */ }

            let sent;
            if (isGuest) {
                const text = 'Привет! Наш бот в процессе обновления и скоро будет вновь доступен. Следи за новостями и подпишись на нашу группу: @TheDreamsHub';
                sent = await messageService.sendReply(ctx, text);
            } else {
                const text = 'Мы запускаем бета-тест. Пожалуйста, заполните короткий опрос — это займёт пару минут.';
                // Use URL button to open survey TMA via t.me link
                const SURVEY_URL = process.env.SURVEY_APP_URL || 'https://t.me/dreamtestaibot/betasurvey';
                sent = await messageService.sendReply(ctx, text, {
                    reply_markup: { inline_keyboard: [[{ text: 'Принять участие', url: SURVEY_URL }]] }
                });
            }
            // Persist last message id for later edits
            try {
                if (sent && sent.message_id && userId) {
                    const { createClient } = require('@supabase/supabase-js');
                    const SUPABASE_URL = process.env.SUPABASE_URL;
                    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
                    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
                        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
                        // Ensure user exists then update last_start_message_id
                        const { data: u } = await supabase.from('users').select('id').eq('tg_id', userId).single();
                        if (!u) {
                            await supabase.from('users').insert({ tg_id: userId, subscription_type: 'guest', tokens: 0, channel_reward_claimed: false });
                        }
                        await supabase.from('users').update({ last_start_message_id: sent.message_id }).eq('tg_id', userId);
                    }
                }
            } catch (e) { logger.warn('Failed to persist stub message id', { error: e?.message }); }
        } catch (e) {
            logger.warn('Stub handler failed', { error: e?.message });
        }
        return; // stop further handlers
    });

    // Command handlers
    bot.command("start", createStartCommandHandler(userService, messageService, TMA_APP_URL));
    bot.command("setpassword", createSetPasswordCommandHandler(userService, messageService));
    bot.command("golive", createGoLiveCommandHandler(userService, messageService, ADMIN_IDS, TMA_APP_URL));
    // Ingest command (one-time, open access, with strong idempotency)
    bot.command('ingest_database', async (ctx) => {
        const cache = require('./shared/services/cache-service');
        try {
            const updateId = ctx.update?.update_id;
            // Ignore stale updates (>60s)
            try {
                const msgTs = Number(ctx.message?.date || 0);
                const ageSec = Math.floor(Date.now() / 1000) - msgTs;
                if (ageSec > 60) {
                    return; // silent ignore
                }
            } catch (_) {}

            // Idempotency by update_id (1 hour)
            const idemKey = `bot:idem:update:${updateId}`;
            if (cache.get(idemKey)) {
                return;
            }
            cache.set(idemKey, true, 60 * 60 * 1000);

            // Single-flight lock for ingest (10 minutes)
            const lockKey = 'bot:ingest:lock';
            if (cache.get(lockKey)) {
                return ctx.reply('Инжест уже выполняется, подождите...');
            }
            cache.set(lockKey, true, 10 * 60 * 1000);

            await ctx.reply('Запускаю инжест базы знаний (фоново)...');

            const siteUrl = process.env.FUNCTIONS_BASE_URL || process.env.URL || process.env.WEB_URL || process.env.TMA_URL || process.env.ALLOWED_TMA_ORIGIN;
            if (!siteUrl) {
                throw new Error('Site URL is not configured');
            }
            const url = new URL('/.netlify/functions/ingest-knowledge-background', siteUrl).toString();
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reset: true, chatId: ctx.chat?.id })
            });
            const txt = await res.text();
            await ctx.reply(`Инжест запущен. Ответ функции: ${txt.slice(0, 100)}`);
        } catch (e) {
            try { cache.delete('bot:ingest:lock'); } catch (_) {}
            await ctx.reply(`Ошибка инжеста: ${e?.message || 'неизвестная ошибка'}`);
        } finally {
            // Release lock after short delay to avoid immediate re-entry
            setTimeout(() => { try { cache.delete('bot:ingest:lock'); } catch (_) {} }, 5 * 1000);
        }
    });

    // Message handlers (inactive due to global stub above)
    bot.on("message:text", createTextMessageHandler(userService, messageService, analysisService, TMA_APP_URL));

    // Payment handlers
    bot.on('pre_checkout_query', createPreCheckoutQueryHandler(messageService));
    bot.on('message:successful_payment', createSuccessfulPaymentHandler(userService, messageService));

    // Error handler
    bot.catch((err) => {
        const ctx = err.ctx;
        const e = err.error;
        const updateId = ctx?.update?.update_id;
        const userId = ctx?.from?.id;
        const chatId = ctx?.chat?.id;
        
        if (e instanceof GrammyError) {
            logger.botError("grammy_error", e, userId, chatId, {
                updateId,
                description: e.description,
                payload: e.payload
            });
        } else if (e instanceof HttpError) {
            logger.botError("http_error", e, userId, chatId, {
                updateId
            });
        } else if (e instanceof Error) {
            logger.botError("general_error", e, userId, chatId, {
                updateId
            });
        } else {
            logger.error("Unknown error object in bot.catch", {
                updateId,
                userId,
                chatId,
                errorType: typeof e,
                error: e
            });
        }
    });

    logger.info("Bot handlers setup completed successfully");
    botInitializedAndHandlersSet = true;

} catch (error) {
    logger.error("Critical bot initialization error", {}, error);
    initializationError = error;
    bot = null;
    botInitializedAndHandlersSet = false;
}



// --- Export handler for Netlify with webhookCallback ---
let netlifyWebhookHandler = null;
if (botInitializedAndHandlersSet && bot) {
    try {
        // Используем async-режим AWS Lambda, совместимый с нашей обёрткой
        netlifyWebhookHandler = webhookCallback(bot, 'aws-lambda-async');
        logger.info("Webhook callback created successfully");
    } catch (callbackError) { 
        logger.error("Failed to create webhook callback", {}, callbackError); 
        initializationError = callbackError; 
    }
} else { 
    logger.error("Skipping webhook callback creation due to initialization errors", {
        botInitialized: botInitializedAndHandlersSet,
        botExists: !!bot,
        initError: initializationError?.message
    }); 
}

exports.handler = async (event, context) => {
    // Не ждём очистки event loop, чтобы ускорить возврат ответа
    try { context.callbackWaitsForEmptyEventLoop = false; } catch (_) {}
    const handlerLogger = logger.child({ handler: 'netlify-webhook' });
    handlerLogger.generateCorrelationId();
    
    handlerLogger.info("Netlify handler invoked", {
        method: event.httpMethod,
        path: event.path
    });
    
    if (initializationError || !netlifyWebhookHandler) { 
        handlerLogger.error("Handler failed due to initialization errors", {
            hasInitError: !!initializationError,
            hasWebhookHandler: !!netlifyWebhookHandler,
            initErrorMessage: initializationError?.message
        }, initializationError);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: "Internal Server Error: Bot failed to initialize." })
        }; 
    }
    
    handlerLogger.info("Calling webhook callback handler");
    return netlifyWebhookHandler(event, context);
};

logger.info("Netlify handler exported successfully");
