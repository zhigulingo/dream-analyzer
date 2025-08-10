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
    const TMA_APP_URL = TMA_URL || ALLOWED_TMA_ORIGIN || 'https://tourmaline-eclair-9d40ea.netlify.app';

    // Initialize services
    userService = new UserService(supabaseAdmin);
    messageService = new MessageService(bot.api);
    analysisService = new AnalysisService(supabaseAdmin);
    
    logger.info("Bot services initialized", {
        services: ['UserService', 'MessageService', 'AnalysisService']
    });

    // --- Setting up Handlers ---
    logger.info("Setting up bot handlers");

    // Command handlers
    bot.command("start", createStartCommandHandler(userService, messageService, TMA_APP_URL));
    bot.command("setpassword", createSetPasswordCommandHandler(userService, messageService));

    // Message handlers
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
        netlifyWebhookHandler = webhookCallback(bot, 'aws-lambda');
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
