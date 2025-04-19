// bot/functions/create-invoice.js
import { Telegraf } from 'telegraf';
import { validate } from '@tma.js/init-data-node'; // Для валидации initData
import { supabase } from './_supabaseClient.js'; // Импорт клиента Supabase - ДОБАВЛЕНО .js

const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);

// Цены (лучше хранить в переменных окружения или конфигурации)
const SUBSCRIPTION_PRICE_STARS = 5; // Цена подписки в Telegram Stars
const DEEP_ANALYSIS_PRICE_STARS = 1; // Цена глубокого анализа в Telegram Stars

// Валидация initData (примерная реализация, настройте под свои нужды)
const validateInitData = (initDataHeader) => {
    if (!initDataHeader) {
        throw new Error('Missing X-Telegram-Init-Data header');
    }
    try {
        // Здесь вы можете использовать @tma.js/init-data-node или другую библиотеку
        // для полной валидации и извлечения данных пользователя
        // validate(initDataHeader, BOT_TOKEN, { expiresIn: 3600 }); // Пример с @tma.js/init-data-node
        console.log("Skipping full initData validation in this example."); // Упрощено для примера
        // Простая проверка наличия данных пользователя (требует доработки!)
        const params = new URLSearchParams(initDataHeader);
        const user = params.get('user');
        if (!user) throw new Error('User data not found in initData');
        const userData = JSON.parse(user);
        if (!userData?.id) throw new Error('User ID not found in initData');
        console.log("[create-invoice] Validated user ID from initData:", userData.id);
        return userData.id; // Возвращаем ID пользователя для использования
    } catch (error) {
        console.error('[create-invoice] InitData validation failed:', error);
        throw new Error(`Invalid or expired Telegram InitData: ${error.message}`);
    }
};

export const handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        console.log("[create-invoice] Received request");
        const initDataHeader = event.headers['x-telegram-init-data'];
        const telegramUserId = validateInitData(initDataHeader); // Валидируем и получаем ID
        console.log(`[create-invoice] Processing request for Telegram User ID: ${telegramUserId}`);

        const body = JSON.parse(event.body || '{}');
        const requestUserId = body.userId; // ID пользователя из тела запроса
        const type = body.type; // Получаем тип инвойса: 'subscription' или 'deepAnalysis'

        // Дополнительная проверка: совпадает ли ID из тела запроса с ID из initData
        if (!requestUserId || String(requestUserId) !== String(telegramUserId)) {
             console.error(`[create-invoice] User ID mismatch or missing. Body: ${requestUserId}, Header: ${telegramUserId}`);
             throw new Error('User ID mismatch or missing in request body.');
        }

        console.log(`[create-invoice] Request details - User ID: ${requestUserId}, Type: ${type}`);

        let title, description, payload, priceInStars, invoiceParams;

        if (type === 'subscription') {
            title = 'Месячная Подписка';
            description = 'Неограниченный анализ снов на 1 месяц.';
            // Генерируем уникальный payload для отслеживания
            payload = `sub_${requestUserId}_${Date.now()}`;
            priceInStars = SUBSCRIPTION_PRICE_STARS;

            invoiceParams = {
                title: title,
                description: description,
                payload: payload,
                provider_token: '', // Пусто для Telegram Stars
                currency: 'XTR', // Валюта Telegram Stars
                prices: [{ label: 'Подписка на 1 месяц', amount: priceInStars }],
                // start_parameter: 'get_access', // Не обязательно для Stars?
                // provider_data: '{}', // Не нужно для Stars
                // photo_url: 'URL_К_ИЗОБРАЖЕНИЮ_ПОДПИСКИ', // Опционально
                // photo_width: 500,
                // photo_height: 300,
                // need_name: false,
                // need_phone_number: false,
                // need_email: false,
                // need_shipping_address: false,
                // send_phone_number_to_provider: false,
                // send_email_to_provider: false,
                // is_flexible: false,
            };
             console.log("[create-invoice] Creating SUBSCRIPTION invoice link with params:", invoiceParams);

        } else if (type === 'deepAnalysis') {
            title = '✨ Глубокий Анализ Снов';
            description = 'Анализ закономерностей и символов в ваших последних 5 снах.';
             // Генерируем уникальный payload для отслеживания
            payload = `deep_${requestUserId}_${Date.now()}`;
            priceInStars = DEEP_ANALYSIS_PRICE_STARS;

             invoiceParams = {
                title: title,
                description: description,
                payload: payload,
                provider_token: '',
                currency: 'XTR',
                prices: [{ label: 'Глубокий анализ (5 снов)', amount: priceInStars }],
                 // photo_url: 'URL_К_ИЗОБРАЖЕНИЮ_АНАЛИЗА', // Опционально
            };
            console.log("[create-invoice] Creating DEEP ANALYSIS invoice link with params:", invoiceParams);

        } else {
            console.error(`[create-invoice] Invalid invoice type requested: ${type}`);
            return { statusCode: 400, body: JSON.stringify({ error: 'Invalid invoice type specified.' }) };
        }

        // Вызов метода Telegram API для создания ссылки на инвойс
        const invoiceLink = await bot.telegram.createInvoiceLink(invoiceParams);
        console.log(`[create-invoice] Successfully created invoice link: ${invoiceLink}`);

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invoice_slug: invoiceLink }), // Возвращаем ссылку (слаг)
        };

    } catch (error) {
        console.error('[create-invoice] Error processing invoice creation:', error);
        // Определяем, была ли это ошибка валидации или другая ошибка
        const isAuthError = error.message.includes('Invalid or expired Telegram InitData') || error.message.includes('User ID mismatch');
        return {
            statusCode: isAuthError ? 401 : 500,
            body: JSON.stringify({ error: `Failed to create invoice: ${error.message || 'Internal server error.'}` }),
        };
    }
};
