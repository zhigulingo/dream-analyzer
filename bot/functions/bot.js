// --- Импорты ---
const { Bot, GrammyError, HttpError } = require("grammy");
const { createClient } = require("@supabase/supabase-js");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- Получение Переменных Окружения ---
const BOT_TOKEN = process.env.BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const TMA_URL = process.env.TMA_URL;

// --- Вспомогательные Функции (без изменений) ---

async function getOrCreateUser(supabase, userId) {
    if (!supabase) throw new Error("Supabase client not available in getOrCreateUser.");
    try {
        let { data: existingUser, error: selectError } = await supabase
            .from('users').select('id').eq('tg_id', userId).single();
        if (selectError && selectError.code !== 'PGRST116') throw selectError;
        if (existingUser) return existingUser.id;
        else {
            const { data: newUser, error: insertError } = await supabase
                .from('users').insert({ tg_id: userId, subscription_type: 'free', tokens: 1 }).select('id').single();
            if (insertError) throw insertError;
            if (!newUser) throw new Error("User creation returned no data.");
            console.log(`Created new user: tg_id=${userId}, id=${newUser.id}`);
            return newUser.id;
        }
    } catch (error) {
        console.error(`Error in getOrCreateUser for ${userId}:`, error.message); return null;
    }
}

async function getGeminiAnalysis(geminiModel, dreamText) {
    if (!geminiModel) throw new Error("Gemini model not available in getGeminiAnalysis.");
    const MAX_DREAM_LENGTH = 4000;
    if (!dreamText || dreamText.trim().length === 0) return "Пожалуйста, опишите свой сон.";
    if (dreamText.length > MAX_DREAM_LENGTH) return `Сон слишком длинный (>${MAX_DREAM_LENGTH} символов). Попробуйте короче.`;
    try {
        console.log("Requesting Gemini analysis...");
        const prompt = `Ты - эмпатичный толкователь снов. Проанализируй сон, сохраняя конфиденциальность, избегая мед. диагнозов/предсказаний. Сон: "${dreamText}". Анализ (2-4 абзаца): 1. Символы/значения. 2. Эмоции/связь с реальностью (если уместно). 3. Темы/сообщения. Отвечай мягко, поддерживающе.`;
        const result = await geminiModel.generateContent(prompt);
        const response = result.response;
        if (response.promptFeedback?.blockReason) {
            console.warn(`Gemini blocked: ${response.promptFeedback.blockReason}`);
            return `Анализ не выполнен из-за ограничений безопасности (${response.promptFeedback.blockReason}). Попробуйте переформулировать.`;
        }
        const analysisText = response.text();
        if (!analysisText || analysisText.trim().length === 0) {
            console.error("Gemini returned empty response.");
            return "К сожалению, не удалось получить анализ (пустой ответ).";
        }
        console.log("Gemini analysis received.");
        return analysisText;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return "Ошибка при связи с сервисом анализа. Попробуйте позже.";
    }
}

async function analyzeDream(ctx, supabase, geminiModel, dreamText) {
    const userId = ctx.from?.id;
    if (!userId) { await ctx.reply("Не удалось идентифицировать пользователя.").catch(logReplyError); return; }
    let userDbId; let processingMessage;
    try {
        userDbId = await getOrCreateUser(supabase, userId);
        if (!userDbId) { await ctx.reply("Ошибка доступа к профилю. Попробуйте позже.").catch(logReplyError); return; }
        processingMessage = await ctx.reply("Проверяем токены...").catch(logReplyError);
        const { data: tokenDecremented, error: rpcError } = await supabase
            .rpc('decrement_token_if_available', { user_tg_id: userId });
        if (rpcError) throw new Error(`RPC Error: ${rpcError.message}`);
        if (!tokenDecremented) {
            if (processingMessage) await ctx.api.deleteMessage(ctx.chat.id, processingMessage.message_id).catch(logReplyError);
            await ctx.reply("У вас закончились токены. Пополните баланс в Личном кабинете.", {
                reply_markup: TMA_URL ? { inline_keyboard: [[{ text: "Открыть Личный кабинет 👤", web_app: { url: TMA_URL } }]] } : undefined
            }).catch(logReplyError); return;
        }
        if (processingMessage) { await ctx.api.editMessageText(ctx.chat.id, processingMessage.message_id, "Токен использован. Анализирую ваш сон... 🧠✨").catch(logReplyError); }
        else { await ctx.reply("Токен использован. Анализирую ваш сон... 🧠✨").catch(logReplyError); }
        const analysisResult = await getGeminiAnalysis(geminiModel, dreamText);
        if (processingMessage) { await ctx.api.deleteMessage(ctx.chat.id, processingMessage.message_id).catch(e => console.warn("Could not delete status message:", e)); processingMessage = null; }
        const isErrorResult = !analysisResult || ["Пожалуйста,", "Извините,", "К сожалению,", "Ошибка:", "Анализ не выполнен"].some(prefix => analysisResult.startsWith(prefix));
        if (isErrorResult) { await ctx.reply(analysisResult || "Не удалось получить анализ.").catch(logReplyError); console.warn(`Analysis for ${userId} failed/blocked, token consumed.`); return; }
        const { error: insertError } = await supabase
            .from('analyses').insert({ user_id: userDbId, dream_text: dreamText, analysis: analysisResult });
        if (insertError) { console.error(`Error saving analysis for user_id ${userDbId}:`, insertError); await ctx.reply("Сон проанализирован, но не удалось сохранить в историю. Вот результат:\n\n" + analysisResult).catch(logReplyError); return; }
        console.log(`Analysis for ${userId} successful.`);
        await ctx.reply(`Вот анализ вашего сна:\n\n${analysisResult}\n\nИстория доступна в Личном кабинете.`, {
            reply_markup: TMA_URL ? { inline_keyboard: [[{ text: "Открыть Личный кабинет 👤", web_app: { url: TMA_URL } }]] } : undefined
        }).catch(logReplyError);
    } catch (error) {
        console.error(`Critical error in analyzeDream for ${userId}:`, error);
         if (processingMessage) { await ctx.api.deleteMessage(ctx.chat.id, processingMessage.message_id).catch(e => console.warn("Could not delete status message on error:", e)); }
        await ctx.reply("Произошла непредвиденная ошибка при обработке сна.").catch(logReplyError);
    }
}

function logReplyError(error) { console.error("Failed to send message to Telegram:", error); }


// --- Главный Обработчик Netlify Function ---
exports.handler = async (event) => {
    console.log("Handler invoked.");

    // --- 1. Проверка Переменных и Тела Запроса ---
    if (!BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_KEY || !GEMINI_API_KEY) {
        console.error("FATAL: Missing required environment variables!");
        return { statusCode: 500, body: "Internal Server Error: Configuration missing." };
    }
    if (!event.body) {
        console.warn("Handler called without event body.");
        return { statusCode: 400, body: "Bad Request: Missing event body" };
    }
    let update;
    try { update = JSON.parse(event.body); } catch (e) {
        console.error("Failed to parse event body:", e);
        return { statusCode: 400, body: "Bad Request: Invalid JSON" };
    }

    // --- 2. Инициализация клиентов ВНУТРИ хендлера ---
    let supabase; let geminiModel; let bot;
    try {
        console.log("Initializing clients inside handler...");
        supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        geminiModel = genAI.getGenerativeModel({ model: "gemini-pro" });
        bot = new Bot(BOT_TOKEN); // Создаем экземпляр
        console.log("Bot instance created. Calling bot.init()...");
        await bot.init(); // <<<--- ДОБАВЛЕНО: Явно инициализируем бота (вызов getMe)
        console.log("bot.init() successful. Bot info:", bot.botInfo); // Логируем информацию о боте
    } catch (initError) {
        console.error("FATAL: Failed to initialize clients or bot.init() failed:", initError);
        // Если bot.init() упал, вероятно, неверный токен или проблема с сетью до Telegram
        return { statusCode: 500, body: "Internal Server Error: Bot initialization failed." };
    }

    // --- 3. Настройка обработчиков (после bot.init) ---
    console.log("Setting up bot handlers...");
    bot.command("start", async (ctx) => {
        // ... (код обработчика /start без изменений) ...
        const userId = ctx.from?.id; if (!userId) return; console.log(`User ${userId} started bot.`);
        try {
            await getOrCreateUser(supabase, userId);
            await ctx.reply(
                "Добро пожаловать в Анализатор Снов! ✨\n\n" +
                "Опишите свой сон, и я помогу его растолковать (у вас 1 бесплатный анализ).\n\n" +
                "Личный кабинет для истории и токенов 👇", {
                reply_markup: TMA_URL ? { inline_keyboard: [[{ text: "Открыть Личный кабинет 👤", web_app: { url: TMA_URL } }]] } : undefined
            }).catch(logReplyError);
        } catch (e) { console.error("Error in /start handler:", e); await ctx.reply("Ошибка инициализации. Попробуйте /start еще раз.").catch(logReplyError); }
    });
    bot.on("message:text", async (ctx) => {
        // ... (код обработчика message:text без изменений) ...
         const dreamText = ctx.message.text; const userId = ctx.from?.id; if (!userId) return;
         if (dreamText.startsWith('/')) { console.log(`Ignoring command: ${dreamText}`); return; }
         console.log(`Received text from ${userId}: "${dreamText.substring(0, 50)}..."`);
         await analyzeDream(ctx, supabase, geminiModel, dreamText);
    });
    bot.catch((err) => {
        // ... (код bot.catch без изменений) ...
        const ctx = err.ctx; const e = err.error; console.error(`Error caught by bot.catch for update ${ctx.update.update_id}:`);
        if (e instanceof GrammyError) console.error("GrammyError:", e.description, e.payload);
        else if (e instanceof HttpError) console.error("HttpError:", e);
        else if (e instanceof Error) console.error("Error:", e.stack || e.message);
        else console.error("Unknown error object:", e);
    });
    console.log("Bot handlers configured.");

    // --- 4. Обработка обновления ---
    try {
        console.log("Passing update to bot.handleUpdate...");
        await bot.handleUpdate(update); // Используем await
        console.log("bot.handleUpdate finished.");
        return { statusCode: 200, body: "" };
    } catch (error) {
        console.error("Error during bot.handleUpdate call:", error); // Ошибка именно при вызове handleUpdate
        return { statusCode: 500, body: "Internal Server Error during update processing." };
    }
};

console.log("Netlify function bot.js (handler-init + bot.init() version) loaded.");
