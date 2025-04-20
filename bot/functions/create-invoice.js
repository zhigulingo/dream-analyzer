// bot/functions/create-invoice.js (Исправлено: Добавлена обработка deep_analysis)
const { Api, GrammyError } = require('grammy');
const crypto = require('crypto');

const BOT_TOKEN = process.env.BOT_TOKEN;
const ALLOWED_TMA_ORIGIN = process.env.ALLOWED_TMA_ORIGIN;

// --- Функция валидации InitData ---
function validateTelegramData(initData, botToken) { /* ... ваш код валидации ... */ }
// --- Вставьте сюда ТОЧНО ТАКУЮ ЖЕ функцию validateTelegramData, как в user-profile.js ---

// --- Генерация Заголовков CORS ---
const generateCorsHeaders = () => { /* ... ваш код ... */ };

exports.handler = async (event) => {
    const corsHeaders = generateCorsHeaders();

    // OPTIONS
    if (event.httpMethod === 'OPTIONS') { return { statusCode: 204, headers: corsHeaders, body: '' }; }
    // POST
    if (event.httpMethod !== 'POST') { return { statusCode: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Method Not Allowed' }) }; }
    // Config Check
    if (!BOT_TOKEN || !ALLOWED_TMA_ORIGIN) { console.error("[create-invoice] Server config missing."); return { statusCode: 500, headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ error: 'Internal Server Error: Bot config missing.' }) }; }

    // --- Валидация InitData ---
    const initDataHeader = event.headers['x-telegram-init-data'];
    let verifiedUserId;
    if (!initDataHeader) { return { statusCode: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized: Missing InitData' }) }; }
    const validationResult = validateTelegramData(initDataHeader, BOT_TOKEN);
    if (!validationResult.valid || !validationResult.data?.id) { return { statusCode: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: `Forbidden: Invalid InitData (${validationResult.error})` }) }; }
    verifiedUserId = validationResult.data.id;
    console.log(`[create-invoice] Access validated for user: ${verifiedUserId}`);

    // --- Получение и валидация данных из тела запроса ---
    let requestBody;
    try {
        if (!event.body) throw new Error('Missing request body');
        requestBody = JSON.parse(event.body);
        console.log(`[create-invoice] Parsed request body for user ${verifiedUserId}:`, requestBody);
    } catch (e) { console.error(`[create-invoice] Failed to parse JSON body:`, e); return { statusCode: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: `Bad Request: ${e.message}` }) }; }

    // Определяем тип запроса: подписка или глубокий анализ
    const { plan, duration, amount, payload } = requestBody;
    let isDeepAnalysisPurchase = plan === 'deep_analysis'; // Признак покупки глубокого анализа

    // --- Валидация параметров ---
    if (!payload || typeof payload !== 'string') { return { statusCode: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Bad Request: Missing or invalid payload' }) }; }

    // Проверка совпадения ID в payload и проверенного ID (делаем для обоих типов)
    const payloadParts = payload.split('_');
    const expectedUserIdIndex = isDeepAnalysisPurchase ? 1 : 3; // Индекс ID пользователя в payload
    const payloadUserId = payloadParts.length > expectedUserIdIndex ? parseInt(payloadParts[expectedUserIdIndex], 10) : null;
    if (!payloadUserId || payloadUserId !== verifiedUserId) {
         console.error(`[create-invoice] Security Alert: Payload user ID (${payloadUserId}) != validated InitData user ID (${verifiedUserId}). Payload: ${payload}`);
         return { statusCode: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Forbidden: User ID mismatch' }) };
    }
    console.log(`[create-invoice] Payload user ID matches validated user ID for ${verifiedUserId}.`);

    // --- Формирование данных для инвойса ---
    let title, description, currency, prices;

    if (isDeepAnalysisPurchase) {
        // --- Параметры для глубокого анализа ---
        console.log(`[create-invoice] Preparing invoice for DEEP ANALYSIS for user ${verifiedUserId}`);
        if (amount !== 1) { // Цена должна быть ровно 1 звезда
             console.error(`[create-invoice] Invalid amount for deep analysis: ${amount}. Must be 1.`);
             return { statusCode: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Bad Request: Invalid amount for deep analysis' }) };
        }
        title = "Глубокий анализ снов";
        description = `Оплата глубокого анализа последних ${process.env.REQUIRED_DREAMS || 5} снов за Telegram Stars`;
        currency = 'XTR';
        prices = [{ label: "Глубокий анализ", amount: 1 }]; // Цена = 1 XTR

    } else {
        // --- Параметры для подписки (как было раньше) ---
         console.log(`[create-invoice] Preparing invoice for SUBSCRIPTION (${plan} ${duration}mo) for user ${verifiedUserId}`);
        // Валидация параметров подписки
        if (!plan || typeof plan !== 'string' || !duration || typeof duration !== 'number' || !Number.isInteger(duration) || duration <= 0 || !amount || typeof amount !== 'number' || !Number.isInteger(amount) || amount < 1) {
            return { statusCode: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Bad Request: Missing or invalid parameters for subscription' }) };
        }
        title = `Подписка ${plan.charAt(0).toUpperCase() + plan.slice(1)} (${duration} мес.)`;
        description = `Оплата подписки "${plan}" на ${duration} месяца в Dream Analyzer за Telegram Stars`;
        currency = 'XTR';
        prices = [{ label: `Подписка ${plan} ${duration} мес.`, amount: amount }];
    }

    // --- Создание ссылки на инвойс ---
    let api;
    try {
        api = new Api(BOT_TOKEN);
        console.log(`[create-invoice] Calling api.raw.createInvoiceLink with payload ${payload}...`);
        const invoiceLink = await api.raw.createInvoiceLink({ title, description, payload, currency, prices });
        console.log(`[create-invoice] Successfully created invoice link for ${isDeepAnalysisPurchase ? 'deep analysis' : 'subscription'}.`);
        return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ invoiceUrl: invoiceLink }) };

    } catch (error) {
        console.error(`[create-invoice] Error during createInvoiceLink call:`, error);
        let errorMessage = 'Internal Server Error: Failed to create invoice link.';
        let statusCode = 500;
        if (error instanceof GrammyError) { /* ... обработка ошибок Grammy ... */ }
        else if (error.message) { errorMessage = error.message; }
        return { statusCode: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: errorMessage }) };
    }
};
