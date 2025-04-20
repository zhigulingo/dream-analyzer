// bot/functions/create-invoice.js (Исправлено: без внешних библиотек, без provider_token для Stars)
const { Api, GrammyError } = require('grammy');
const crypto = require('crypto'); // Используем встроенный crypto

const BOT_TOKEN = process.env.BOT_TOKEN;
// Убедитесь, что эта переменная установлена в Netlify UI для сайта бэкенда!
const ALLOWED_TMA_ORIGIN = process.env.ALLOWED_TMA_ORIGIN;

// --- ВАША Функция валидации Telegram InitData (без внешних библиотек) ---
function validateTelegramData(initData, botToken) {
    // ... (ТОЧНО ТАКАЯ ЖЕ ФУНКЦИЯ, КАК В user-profile.js) ...
    if (!initData || !botToken) {
        console.warn("[validateTelegramData] Missing initData or botToken");
        return { valid: false, data: null, error: "Missing initData or botToken" };
    }
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) {
        console.warn("[validateTelegramData] Hash is missing in initData");
        return { valid: false, data: null, error: "Hash is missing" };
    }
    params.delete('hash');
    const dataCheckArr = [];
    params.sort();
    params.forEach((value, key) => dataCheckArr.push(`${key}=${value}`));
    const dataCheckString = dataCheckArr.join('\n');
    try {
        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
        const checkHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
        if (checkHash === hash) {
            const userDataString = params.get('user');
            if (!userDataString) { return { valid: true, data: null, error: "User data missing" }; }
            try {
                const userData = JSON.parse(decodeURIComponent(userDataString));
                 if (!userData || typeof userData.id === 'undefined') { return { valid: true, data: null, error: "User ID missing in parsed data" }; }
                return { valid: true, data: userData, error: null };
            } catch (parseError) { return { valid: true, data: null, error: "Failed to parse user data" }; }
        } else { return { valid: false, data: null, error: "Hash mismatch" }; }
    } catch (error) { return { valid: false, data: null, error: "Validation crypto error" }; }
}

// --- Генерация Заголовков CORS ---
const generateCorsHeaders = () => {
    const originToAllow = ALLOWED_TMA_ORIGIN || '*'; // Используем переменную или '*' если она не задана
    console.log(`[create-invoice] CORS Headers: Allowing Origin: ${originToAllow}`);
    return {
        'Access-Control-Allow-Origin': originToAllow,
        'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-Init-Data',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };
};

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

        if (error instanceof GrammyError) {
            errorMessage = `Telegram API Error: ${error.description} (Code: ${error.error_code})`;
            if (error.error_code >= 400 && error.error_code < 500) {
                 statusCode = 400;
                 errorMessage = `Bad Request to Telegram API: ${error.description}`;
            }
        } else if (error.message) {
            errorMessage = error.message;
        }

        return {
            statusCode: statusCode,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: errorMessage })
        };
    }
};
