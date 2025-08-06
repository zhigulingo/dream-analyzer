// bot/functions/create-invoice.js (Исправлено: без внешних библиотек, без provider_token для Stars)
const { Api, GrammyError } = require('grammy');
const crypto = require('crypto'); // Используем встроенный crypto
const { validateTelegramData } = require('./shared/auth/telegram-validator');
const { wrapApiHandler, createApiError } = require('./shared/middleware/api-wrapper');
const { createSuccessResponse, createErrorResponse, parseJsonBody } = require('./shared/middleware/error-handler');

const BOT_TOKEN = process.env.BOT_TOKEN;
// Убедитесь, что эта переменная установлена в Netlify UI для сайта бэкенда!
const ALLOWED_TMA_ORIGIN = process.env.ALLOWED_TMA_ORIGIN;

// --- Используем общую библиотеку авторизации ---

// --- Internal Handler Function ---
async function handleCreateInvoice(event, context, corsHeaders) {
    console.log(`[create-invoice] Processing invoice creation request`);

    // --- Валидация InitData ---
    const initDataHeader = event.headers['x-telegram-init-data'];
    if (!initDataHeader) {
        throw createApiError('Unauthorized: Missing InitData', 401);
    }
    
    const validationResult = validateTelegramData(initDataHeader, BOT_TOKEN);
    if (!validationResult.valid || !validationResult.data?.id) {
        throw createApiError(`Forbidden: Invalid InitData (${validationResult.error})`, 403);
    }
    
    const verifiedUserId = validationResult.data.id;
    console.log(`[create-invoice] Access validated for user: ${verifiedUserId}`);

    // --- Получение и валидация данных из тела запроса ---
    const bodyResult = parseJsonBody(event, corsHeaders);
    if (bodyResult.error) {
        throw createApiError(`Bad Request: ${bodyResult.error.body}`, 400);
    }
    
    const requestBody = bodyResult.body;
    console.log(`[create-invoice] Parsed request body for user ${verifiedUserId}:`, requestBody);

    // Определяем тип запроса: подписка или глубокий анализ
    const { plan, duration, amount, payload } = requestBody;
    let isDeepAnalysisPurchase = plan === 'deep_analysis'; // Признак покупки глубокого анализа

    // --- Валидация параметров ---
    if (!payload || typeof payload !== 'string') {
        throw createApiError('Bad Request: Missing or invalid payload', 400);
    }

    // Проверка совпадения ID в payload и проверенного ID (делаем для обоих типов)
    const payloadParts = payload.split('_');
    const expectedUserIdIndex = isDeepAnalysisPurchase ? 1 : 3; // Индекс ID пользователя в payload
    const payloadUserId = payloadParts.length > expectedUserIdIndex ? parseInt(payloadParts[expectedUserIdIndex], 10) : null;
    if (!payloadUserId || payloadUserId !== verifiedUserId) {
         console.error(`[create-invoice] Security Alert: Payload user ID (${payloadUserId}) != validated InitData user ID (${verifiedUserId}). Payload: ${payload}`);
         throw createApiError('Forbidden: User ID mismatch', 403);
    }
    console.log(`[create-invoice] Payload user ID matches validated user ID for ${verifiedUserId}.`);

    // --- Формирование данных для инвойса ---
    let title, description, currency, prices;

    if (isDeepAnalysisPurchase) {
        // --- Параметры для глубокого анализа ---
        console.log(`[create-invoice] Preparing invoice for DEEP ANALYSIS for user ${verifiedUserId}`);
        if (amount !== 1) { // Цена должна быть ровно 1 звезда
             console.error(`[create-invoice] Invalid amount for deep analysis: ${amount}. Must be 1.`);
             throw createApiError('Bad Request: Invalid amount for deep analysis', 400);
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
            throw createApiError('Bad Request: Missing or invalid parameters for subscription', 400);
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
        return createSuccessResponse({ invoiceUrl: invoiceLink }, corsHeaders);

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

        throw createApiError(errorMessage, statusCode);
    }
}

// --- Exported Handler ---
exports.handler = wrapApiHandler(handleCreateInvoice, {
    allowedMethods: 'POST',
    allowedOrigins: [ALLOWED_TMA_ORIGIN],
    requiredEnvVars: ['BOT_TOKEN', 'ALLOWED_TMA_ORIGIN']
});
