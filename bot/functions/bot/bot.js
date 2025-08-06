// bot/functions/bot/bot.js

// --- Imports ---
const { Bot, GrammyError, HttpError, webhookCallback } = require("grammy");
const { createClient } = require("@supabase/supabase-js");

// Import services
const UserService = require("./services/user-service");
const MessageService = require("./services/message-service");
const AnalysisService = require("./services/analysis-service");

// Import handlers
const createStartCommandHandler = require("./handlers/start-command");
const createSetPasswordCommandHandler = require("./handlers/setpassword-command");
const createTextMessageHandler = require("./handlers/text-message");
const { 
    createPreCheckoutQueryHandler, 
    createSuccessfulPaymentHandler 
} = require("./handlers/payment-handlers");

// --- Environment Variables ---
const BOT_TOKEN = process.env.BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const TMA_URL = process.env.TMA_URL;

// --- Global Initialization ---
let bot;
let supabaseAdmin;
let userService;
let messageService;
let analysisService;
let initializationError = null;
let botInitializedAndHandlersSet = false;

try {
    console.log("[Bot Global Init] Starting initialization...");
    
    // Validate environment variables
    if (!BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_KEY || !GEMINI_API_KEY || !TMA_URL) {
        throw new Error("FATAL: Missing one or more environment variables!");
    }

    // Initialize clients
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
    bot = new Bot(BOT_TOKEN);
    
    console.log("[Bot Global Init] Clients and bot instance created.");

    // Initialize services
    userService = new UserService(supabaseAdmin);
    messageService = new MessageService(bot.api);
    analysisService = new AnalysisService(supabaseAdmin);
    
    console.log("[Bot Global Init] Services initialized.");

    // --- Setting up Handlers ---
    console.log("[Bot Global Init] Setting up handlers...");

    // Command handlers
    bot.command("start", createStartCommandHandler(userService, messageService, TMA_URL));
    bot.command("setpassword", createSetPasswordCommandHandler(userService, messageService));

    // Message handlers
    bot.on("message:text", createTextMessageHandler(userService, messageService, analysisService, TMA_URL));

    // Payment handlers
    bot.on('pre_checkout_query', createPreCheckoutQueryHandler(messageService));
    bot.on('message:successful_payment', createSuccessfulPaymentHandler(userService, messageService));

    // Error handler
    bot.catch((err) => {
        const ctx = err.ctx;
        const e = err.error;
        console.error(`[Bot] Error caught by bot.catch for update ${ctx?.update?.update_id}:`);
        
        if (e instanceof GrammyError) {
            console.error("GrammyError:", e.description, e.payload);
        } else if (e instanceof HttpError) {
            console.error("HttpError:", e);
        } else if (e instanceof Error) {
            console.error("Error:", e.stack || e.message);
        } else {
            console.error("Unknown error object:", e);
        }
    });

    console.log("[Bot Global Init] Handlers setup complete.");
    botInitializedAndHandlersSet = true;

} catch (error) {
    console.error("[Bot Global Init] CRITICAL INITIALIZATION ERROR:", error);
    initializationError = error;
    bot = null;
    botInitializedAndHandlersSet = false;
}

// --- Export handler for Netlify with webhookCallback ---
let netlifyWebhookHandler = null;

if (botInitializedAndHandlersSet && bot) {
    try {
        netlifyWebhookHandler = webhookCallback(bot, 'aws-lambda-async');
        console.log("[Bot Global Init] webhookCallback created successfully.");
    } catch (callbackError) {
        console.error("[Bot Global Init] FAILED TO CREATE webhookCallback:", callbackError);
        initializationError = callbackError;
    }
} else {
    console.error("[Bot Global Init] Skipping webhookCallback creation due to errors.");
}

exports.handler = async (event) => {
    console.log("[Netlify Handler] Invoked.");
    
    if (initializationError || !netlifyWebhookHandler) {
        console.error("[Netlify Handler] Initialization/webhookCallback failed.", initializationError);
        return {
            statusCode: 500,
            body: "Internal Server Error: Bot failed to initialize."
        };
    }
    
    console.log("[Netlify Handler] Calling pre-created webhookCallback handler...");
    return netlifyWebhookHandler(event);
};

console.log("[Bot Global Init] Netlify handler exported.");