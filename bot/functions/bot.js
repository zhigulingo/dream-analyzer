// bot/functions/bot.js

// --- Imports ---
const { Bot, Api, GrammyError, HttpError, webhookCallback } = require("grammy");
const { createClient } = require("@supabase/supabase-js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const crypto = require('crypto');
const util = require('util');
const scryptAsync = util.promisify(crypto.scrypt);

// --- Environment Variables ---
const BOT_TOKEN = process.env.BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const TMA_URL = process.env.TMA_URL;

// --- Global Initialization ---
let bot;
let supabaseAdmin;
let genAI; // Only GoogleGenerativeAI instance
let geminiModel = null; // The model itself will be initialized on demand
let initializationError = null;
let botInitializedAndHandlersSet = false;

try {
    console.log("[Bot Global Init] Starting initialization...");
    if (!BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_KEY || !GEMINI_API_KEY || !TMA_URL) {
        throw new Error("FATAL: Missing one or more environment variables!");
    }

    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY); // Create the main Google AI object
    bot = new Bot(BOT_TOKEN);
    console.log("[Bot Global Init] Clients and bot instance created.");

    // --- Setting up Handlers ---
    console.log("[Bot Global Init] Setting up handlers...");

    // /start handler
    bot.command("start", async (ctx) => {
        console.log("[Bot Handler /start] Command received.");
        const userId = ctx.from?.id; const chatId = ctx.chat.id;
        // Extract startParam from /start command, if present
        let startParam;
        if (ctx.message && ctx.message.text) {
            const parts = ctx.message.text.split(' ');
            if (parts.length > 1) {
                startParam = parts[1];
            }
        }
        if (!userId || !chatId) { console.warn("[Bot Handler /start] No user ID or chat ID."); return; }
        console.log(`[Bot Handler /start] User ${userId} in chat ${chatId}`);
        try {
            const userData = await getOrCreateUser(supabaseAdmin, userId);
            console.log(`[Bot Handler /start] User data received: ID=${userData.id}, Claimed=${userData.claimed}, LastMsgId=${userData.lastMessageId}`);
            
            // Deleting previous message
            if (userData.lastMessageId) { /* ... deletion logic unchanged ... */ }
            // Determining text and button
            let messageText, buttonText, buttonUrl;
            if (userData.claimed) {
                messageText = "Welcome back! 👋 Analyze dreams or visit your Personal Account.";
                buttonText = "Personal Account";
                buttonUrl = TMA_URL;
            } else if (startParam === 'weblogin') {
                // Handle weblogin parameter with direct link to web app login
                messageText = "🔐 Click the button below to log in to the web version.";
                buttonText = "Open Web Version";
                buttonUrl = `${TMA_URL}/login`;
                buttonText = "Открыть веб-версию";
                buttonUrl = `${TMA_URL}/login`;
            } else {
                // Fixed: Using template literal for multi-line string
                messageText = `Hello! 👋 Dream Analyzer bot.

Press the button to get your <b>first free token</b> for subscribing!`;
                buttonText = "🎁 Open and claim token";
                    buttonUrl = `${TMA_URL}?action=claim_reward`; 
            }
            // Sending new message
            console.log(`[Bot Handler /start] Sending new message (Claimed: ${userData.claimed})`);
            const sentMessage = await ctx.reply(messageText, { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: buttonText, web_app: { url: buttonUrl } }]] } });
            // Saving new message ID
            const { error: updateError } = await supabaseAdmin.from('users').update({ last_start_message_id: sentMessage.message_id }).eq('id', userData.id);
            if (updateError) console.error(`[Bot Handler /start] Failed update last_start_message_id:`, updateError);
            else console.log(`[Bot Handler /start] Updated last_start_message_id to ${sentMessage.message_id}.`);
        } catch (e) {
             console.error("[Bot Handler /start] CRITICAL Error (likely from getOrCreateUser):", e.message); // Log the specific error
             try { await ctx.reply(`An error occurred while fetching user data (${e.message}). Please try again later.`).catch(logReplyError); } catch {}
        }
    });

    // --- New Handler for /setpassword ---
    bot.command("setpassword", async (ctx) => {
        console.log("[Bot Handler /setpassword] Command received.");
        const userId = ctx.from?.id;
        if (!userId) { console.warn("[Bot Handler /setpassword] No user ID."); return; }

        const messageText = ctx.message.text;
        const parts = messageText.split(/\s+/).filter(Boolean);

        if (parts.length < 2) {
            await ctx.reply("Please provide a password after the command, e.g., `/setpassword your_secure_password`").catch(logReplyError);
            return;
        }

        const password = parts.slice(1).join(' '); // Allow spaces in password

        if (password.length < 8) {
            await ctx.reply("Password should be at least 8 characters long.").catch(logReplyError);
            return;
        }

        try {
            // Ensure user exists (or create if not)
            const userData = await getOrCreateUser(supabaseAdmin, userId);
            const userDbId = userData.id;
            if (!userDbId) { throw new Error("Could not retrieve user ID from database."); }

            // Generate salt and hash password using scrypt
            const salt = crypto.randomBytes(16).toString('hex');
            const derivedKey = await scryptAsync(password, salt, 64); // 64 bytes for hash
            const webPasswordHash = `${salt}:${derivedKey.toString('hex')}`;

            // Save hash to Supabase
            console.log(`[Bot Handler /setpassword] Updating password hash for user ${userId}...`);
            const { error: updateError } = await supabaseAdmin
                .from('users')
                .update({ web_password_hash: webPasswordHash })
                .eq('tg_id', userId);

            if (updateError) {
                console.error(`[Bot Handler /setpassword] Supabase update error for user ${userId}:`, updateError);
                 throw new Error("Database update failed.");
            }

            console.log(`[Bot Handler /setpassword] Password hash updated for user ${userId}.`);
            await ctx.reply("Your web password has been set successfully! You can now use your Telegram ID and this password to log in on the web.").catch(logReplyError);

        } catch (error) {
            console.error(`[Bot Handler /setpassword] Error setting password for user ${userId}:`, error);
            await ctx.reply(`An error occurred while setting your password: ${error.message || 'Unknown error'}`).catch(logReplyError);
        }
    });

    // Text message handler (PASSING geminiModel)
    bot.on("message:text", async (ctx) => {
        console.log("[Bot Handler text] Received text message.");
        const dreamText = ctx.message.text; const userId = ctx.from?.id; const chatId = ctx.chat.id; const messageId = ctx.message.message_id;
        if (!userId || !chatId) { console.warn("[Bot Handler text] No user/chat ID."); return; }
        if (dreamText.startsWith('/')) { console.log(`[Bot Handler text] Ignoring command.`); return; }
        console.log(`[Bot Handler text] Processing dream for ${userId}`);
        let statusMessage;
        try {
            console.log(`[Bot Handler text] Deleting user message ${messageId}`);
            await ctx.api.deleteMessage(chatId, messageId).catch(delErr => { /* ... deletion error handling ... */});
            statusMessage = await ctx.reply("Analyzing your dream... 🧠✨").catch(logReplyError);
            if (!statusMessage) throw new Error("Failed to send status message.");
            // <<<--- FIX: PASSING geminiModel to analyzeDream ---
            await analyzeDream(ctx, supabaseAdmin, geminiModel, dreamText); // Pass the current (possibly null) geminiModel
            // <<<--- END FIX ---
            console.log(`[Bot Handler text] Deleting status message ${statusMessage.message_id}`);
            await ctx.api.deleteMessage(chatId, statusMessage.message_id).catch(delErr => { console.warn(`[Bot Handler text] Failed delete status msg ${statusMessage.message_id}:`, delErr); });
            console.log(`[Bot Handler text] Analysis complete. Sending confirmation.`);
            // Fixed: Using template literal for multi-line string
            await ctx.reply(`Your dream analysis is ready and saved! ✨

See it in your history in the Personal Account.`, { reply_markup: { inline_keyboard: [[{ text: "Open Personal Account", web_app: { url: TMA_URL } }]] } }).catch(logReplyError);
        } catch (error) { // Catch errors from analyzeDream
            console.error(`[Bot Handler text] Error processing dream for ${userId}:`, error); // Log the specific error
            if (statusMessage) { await ctx.api.deleteMessage(chatId, statusMessage.message_id).catch(e => {}); }
            await ctx.reply(`An error occurred: ${error.message || 'Unknown error'}`).catch(logReplyError); // Show error to user
        }
    });

   // pre_checkout_query handler (UNCHANGED)
    bot.on('pre_checkout_query', async (ctx) => {
        console.log("[Bot:Handler pre_checkout_query] Received:", JSON.stringify(ctx.preCheckoutQuery));
        try {
            await ctx.answerPreCheckoutQuery(true);
            console.log("[Bot:Handler pre_checkout_query] Answered TRUE.");
        } catch (error) { console.error("[Bot:Handler pre_checkout_query] Failed to answer:", error); try { await ctx.answerPreCheckoutQuery(false, "Internal error"); } catch (e) {} }
    });

    // successful_payment handler (MODIFIED to handle deepanalysis payload)
    bot.on('message:successful_payment', async (ctx) => {
        console.log("[Bot Handler successful_payment] Received:", JSON.stringify(ctx.message.successful_payment));
        const payment = ctx.message.successful_payment;
        const userId = ctx.from.id;
        const payload = payment.invoice_payload;
    
        if (!payload) { console.error(`[Bot Handler successful_payment] Missing payload from user ${userId}`); return; }
    
        const parts = payload.split(/\s+/).filter(Boolean);
        const paymentType = parts[0]; // 'sub' или 'deepanalysis'
    
        try {
            if (!supabaseAdmin) { throw new Error("Supabase client unavailable"); }
    
            if (paymentType === 'sub' && parts.length >= 4) {
                // --- Handling SUBSCRIPTION payment (via RPC) ---
                const plan = parts[1];
                const durationMonths = parseInt(parts[2].replace('mo', ''), 10);
                const payloadUserId = parseInt(parts[3], 10);
                if (isNaN(durationMonths) || isNaN(payloadUserId) || payloadUserId !== userId) { console.error(`[Bot Handler successful_payment] Sub Payload error/mismatch: ${payload}`); await ctx.reply("Subscription payment data error.").catch(logReplyError); return; }
    
                console.log(`[Bot Handler successful_payment] Processing SUBSCRIPTION payment for ${userId}: Plan=${plan}, Duration=${durationMonths}mo.`);
                const { error: txError } = await supabaseAdmin.rpc('process_successful_payment', { user_tg_id: userId, plan_type: plan, duration_months: durationMonths });
                if (txError) { console.error(`[Bot Handler successful_payment] RPC error for sub payment ${userId}:`, txError); throw new Error("DB update failed for subscription."); }
                console.log(`[Bot Handler successful_payment] Subscription payment processed via RPC for ${userId}.`);
                await ctx.reply(`Thank you! Your "${plan.toUpperCase()}" subscription is active/extended. ✨`).catch(logReplyError);
    
            } else if (paymentType === 'deepanalysis' && parts.length >= 2) {
                // --- Handling DEEP ANALYSIS payment ---
                const payloadUserId = parseInt(parts[1], 10);
                 if (isNaN(payloadUserId) || payloadUserId !== userId) { console.error(`[Bot Handler successful_payment] Deep Analysis Payload error/mismatch: ${payload}`); await ctx.reply("Deep analysis payment data error.").catch(logReplyError); return; }
    
                console.log(`[Bot Handler successful_payment] Processing DEEP ANALYSIS payment for ${userId}.`);
                
                // Ensure user exists or create them
                await getOrCreateUser(supabaseAdmin, userId);
                
                // Record deep analysis purchase in database
                const { data: currentUser, error: fetchError } = await supabaseAdmin
                    .from('users').select('deep_analysis_credits').eq('tg_id', userId).single();
                if (fetchError) {
                    console.error(`[Bot Handler successful_payment] Error fetching user for deep analysis credit: ${fetchError.message}`);
                    await ctx.reply("Payment received but there was an error processing it. Please contact support.").catch(logReplyError);
                    return;
                }
                
                const newCredits = (currentUser?.deep_analysis_credits || 0) + 1;
                const { error: updateError } = await supabaseAdmin
                    .from('users').update({ deep_analysis_credits: newCredits }).eq('tg_id', userId);
                if (updateError) {
                    console.error(`[Bot Handler successful_payment] Error updating deep analysis credits: ${updateError.message}`);
                    await ctx.reply("Payment received but there was an error processing it. Please contact support.").catch(logReplyError);
                    return;
                }
                
                console.log(`[Bot Handler successful_payment] Deep analysis credit added for user ${userId}. New total: ${newCredits}`);
                await ctx.reply("Спасибо за покупку! Вам добавлен 1 кредит глубокого анализа. Используйте его в приложении.").catch(logReplyError);
    
            } else {
                // Unknown payload format
                console.error(`[Bot Handler successful_payment] Unknown or invalid payload format: ${payload} from user ${userId}`);
                await ctx.reply("Received payment with unknown purpose.").catch(logReplyError);
            }
    
        } catch (error) {
            console.error(`[Bot Handler successful_payment] Failed process payment for ${userId}:`, error);
            await ctx.reply("Your payment was received, but an error occurred during processing. Please contact support.").catch(logReplyError);
        }
    });

    // Error handler (UNCHANGED)
    bot.catch((err) => {
        const ctx = err.ctx; const e = err.error;
        console.error(`[Bot] Error caught by bot.catch for update ${ctx?.update?.update_id}:`);
        if (e instanceof GrammyError) console.error("GrammyError:", e.description, e.payload);
        else if (e instanceof HttpError) console.error("HttpError:", e);
        else if (e instanceof Error) console.error("Error:", e.stack || e.message); // Log stack for standard errors
        else console.error("Unknown error object:", e);
    });

    console.log("[Bot Global Init] Handlers setup complete.");
    botInitializedAndHandlersSet = true;

} catch (error) {
    console.error("[Bot Global Init] CRITICAL INITIALIZATION ERROR:", error);
    initializationError = error;
    bot = null;
    botInitializedAndHandlersSet = false;
}

// --- Helper Functions ---

// getOrCreateUser (Ensures user exists or creates one)
async function getOrCreateUser(supabase, userId) {
    if (!supabase) { throw new Error("Supabase client not provided to getOrCreateUser."); }
    console.log(`[getOrCreateUser] Processing user ${userId}...`);
    try {
        console.log(`[getOrCreateUser] Selecting user ${userId}...`);
        let { data: existingUser, error: selectError } = await supabase
            .from('users').select('id, channel_reward_claimed, last_start_message_id').eq('tg_id', userId).single();

        if (selectError && selectError.code !== 'PGRST116') {
             console.error(`[getOrCreateUser] Supabase SELECT error: ${selectError.message}`);
             throw new Error(`DB Select Error: ${selectError.message}`);
        }
        if (existingUser) {
            console.log(`[getOrCreateUser] Found existing user ${userId}.`);
            return { id: existingUser.id, claimed: existingUser.channel_reward_claimed ?? false, lastMessageId: existingUser.last_start_message_id };
        } else {
            console.log(`[getOrCreateUser] User ${userId} not found. Creating...`);
            const { data: newUser, error: insertError } = await supabase
                .from('users').insert({ tg_id: userId, subscription_type: 'free', tokens: 0, channel_reward_claimed: false }).select('id').single();

            if (insertError) {
                 console.error(`[getOrCreateUser] Supabase INSERT error: ${insertError.message}`);
                 if (insertError.code === '23505') { // Race condition
                     console.warn(`[getOrCreateUser] Race condition for ${userId}. Re-fetching...`);
                     let { data: raceUser, error: raceError } = await supabase.from('users').select('id, channel_reward_claimed, last_start_message_id').eq('tg_id', userId).single();
                     if (raceError) { throw new Error(`DB Re-fetch Error: ${raceError.message}`); }
                     if (raceUser) { console.log(`[getOrCreateUser] Found user ${userId} on re-fetch.`); return { id: raceUser.id, claimed: raceUser.channel_reward_claimed ?? false, lastMessageId: raceUser.last_start_message_id }; }
                     else { throw new Error("DB Inconsistent state after unique violation."); }
                 }
                 throw new Error(`DB Insert Error: ${insertError.message}`);
            }
            if (!newUser) { throw new Error("DB Insert Error: No data returned after user creation."); }
            console.log(`[getOrCreateUser] Created new user ${userId} with ID ${newUser.id}.`);
            return { id: newUser.id, claimed: false, lastMessageId: null };
        }
    } catch (error) {
        console.error(`[getOrCreateUser] FAILED for user ${userId}:`, error);
        throw error;
    }
}


// getGeminiAnalysis (Takes model, initializes if needed)
async function getGeminiAnalysis(passedModel, dreamText) {
     console.log("[getGeminiAnalysis] Function called.");
     let modelToUse = passedModel;

     if (!modelToUse) {
         console.log("[getGeminiAnalysis] Model not passed or null, attempting initialization...");
         try {
             if (!genAI) { throw new Error("GoogleGenerativeAI instance (genAI) is not available."); }
             modelToUse = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
             geminiModel = modelToUse;
             console.log("[getGeminiAnalysis] Gemini model initialized successfully within function.");
         } catch (initErr) {
             console.error("[getGeminiAnalysis] Failed to initialize Gemini model:", initErr);
             throw new Error(`Failed to initialize analysis service: ${initErr.message}`);
         }
     } else {
          console.log("[getGeminiAnalysis] Using pre-initialized/passed model.");
     }

     const MAX_DREAM_LENGTH = 4000;
     if (!dreamText || dreamText.trim().length === 0) { throw new Error("Empty dream text."); }
     if (dreamText.length > MAX_DREAM_LENGTH) { throw new Error(`Dream too long (>${MAX_DREAM_LENGTH} chars).`); }

     try {
         console.log("[getGeminiAnalysis] Requesting Gemini analysis...");
         const prompt = `You are an empathetic dream interpreter. Analyze the dream, maintaining confidentiality, avoiding medical diagnoses/predictions. Dream: "${dreamText}". Analysis (2-4 paragraphs): 1. Symbols/meanings. 2. Emotions/connection to reality (if applicable). 3. Themes/messages. Respond softly, supportively.`;
         const result = await modelToUse.generateContent(prompt);
         const response = await result.response;

         if (response.promptFeedback?.blockReason) {
             console.warn(`[getGeminiAnalysis] Gemini blocked: ${response.promptFeedback.blockReason}`);
             throw new Error(`Analysis blocked (${response.promptFeedback.blockReason}).`);
         }
         const analysisText = response.text();
         if (!analysisText || analysisText.trim().length === 0) {
             console.error("[getGeminiAnalysis] Gemini returned empty response.");
             throw new Error("Empty response from analysis service.");
         }
         console.log("[getGeminiAnalysis] Gemini analysis received successfully.");
         return analysisText;
     } catch (error) {
         console.error("[getGeminiAnalysis] Error during Gemini API call:", error);
         if (error.message?.includes("API key not valid")) throw new Error("Invalid Gemini API key.");
         else if (error.status === 404 || error.message?.includes("404") || error.message?.includes("is not found")) throw new Error("Gemini model not found.");
         else if (error.message?.includes("quota")) throw new Error("Gemini API quota exceeded.");
         throw new Error(`Error communicating with analysis service (${error.message})`);
     }
}

// analyzeDream (Takes model, passes it, catches errors)
async function analyzeDream(ctx, supabase, passedGeminiModel, dreamText) {
    console.log("[analyzeDream] Function called.");
    const userId = ctx.from?.id;
    if (!userId) { throw new Error("Could not identify user."); }

    try {
        // 1. Get user DB ID
        console.log(`[analyzeDream] Getting user DB ID for ${userId}...`);
        const userData = await getOrCreateUser(supabase, userId);
        const userDbId = userData.id;
        if (!userDbId) { throw new Error("Error accessing user profile."); }
        console.log(`[analyzeDream] User DB ID: ${userDbId}`);

        // 2. Check and decrement token
        console.log(`[analyzeDream] Checking/decrementing token for ${userId}...`);
        const { data: tokenDecremented, error: rpcError } = await supabase
            .rpc('decrement_token_if_available', { user_tg_id: userId });
        if (rpcError) { throw new Error(`Internal token error: ${rpcError.message}`); }
        if (!tokenDecremented) { throw new Error("Insufficient tokens for analysis."); }
        console.log(`[analyzeDream] Token decremented for user ${userId}.`);

        // 3. Get analysis from Gemini (pass model, catch errors)
        console.log(`[analyzeDream] Requesting analysis...`);
        // <<<--- FIX: Passing passedGeminiModel ---
        const analysisResultText = await getGeminiAnalysis(passedGeminiModel, dreamText);
        // <<<--- END FIX ---
        console.log(`[analyzeDream] Analysis received successfully.`);

        // 4. Save result to DB
        console.log(`[analyzeDream] Saving analysis to DB for user ${userDbId}...`);
        const { error: insertError } = await supabase
            .from('analyses').insert({ user_id: userDbId, dream_text: dreamText, analysis: analysisResultText });
        if (insertError) { throw new Error(`Error saving analysis: ${insertError.message}`); }
        console.log(`[analyzeDream] Analysis saved successfully.`);

        return; // Successful completion

    } catch (error) {
        console.error(`[analyzeDream] FAILED for user ${userId}: ${error.message}`);
        throw error;
    }
}

// logReplyError (unchanged)
function logReplyError(error) { console.error("[Bot Reply Error]", error instanceof Error ? error.message : error); }

// --- Export handler for Netlify with webhookCallback ---
let netlifyWebhookHandler = null;
if (botInitializedAndHandlersSet && bot) {
    try {
        netlifyWebhookHandler = webhookCallback(bot, 'aws-lambda-async');
        console.log("[Bot Global Init] webhookCallback created successfully.");
    } catch (callbackError) { console.error("[Bot Global Init] FAILED TO CREATE webhookCallback:", callbackError); initializationError = callbackError; }
} else { console.error("[Bot Global Init] Skipping webhookCallback creation due to errors."); }

exports.handler = async (event) => {
    console.log("[Netlify Handler] Invoked.");
    if (initializationError || !netlifyWebhookHandler) { console.error("[Netlify Handler] Initialization/webhookCallback failed.", initializationError); return { statusCode: 500, body: "Internal Server Error: Bot failed to initialize." }; }
    console.log("[Netlify Handler] Calling pre-created webhookCallback handler...");
    return netlifyWebhookHandler(event);
};

console.log("[Bot Global Init] Netlify handler exported.");
