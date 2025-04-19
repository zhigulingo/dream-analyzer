// bot/functions/bot.js
import { Telegraf, Markup } from 'telegraf';
import { supabase } from './_supabaseClient'; // Импорт клиента Supabase
import { validate as validateTma } from '@tma.js/init-data-node'; // Для валидации данных из Web App

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEB_APP_URL = process.env.NETLIFY_URL; // URL вашего развернутого фронтенда (должен быть в переменных окружения Netlify)
const BOT_USERNAME = process.env.BOT_USERNAME || 'YourBotUsername'; // Замените или установите переменную окружения

if (!BOT_TOKEN || !WEB_APP_URL) {
    console.error("FATAL ERROR: BOT_TOKEN or NETLIFY_URL (WEB_APP_URL) is not defined in environment variables.");
    // В реальном приложении лучше остановить запуск или обработать ошибку иначе
}

const bot = new Telegraf(BOT_TOKEN);

// --- Базовая обработка команд ---

bot.start(async (ctx) => {
    const telegramUser = ctx.from;
    console.log(`[bot.js /start] User started bot: ${telegramUser.id} (${telegramUser.username || telegramUser.first_name})`);

    // Upsert пользователя в базу данных
    try {
        const { data, error } = await supabase
            .from('users')
            .upsert(
                {
                    telegram_id: telegramUser.id,
                    username: telegramUser.username,
                    first_name: telegramUser.first_name,
                    last_name: telegramUser.last_name,
                    language_code: telegramUser.language_code,
                    last_interaction_at: new Date().toISOString(),
                },
                {
                    onConflict: 'telegram_id', // Если пользователь с таким telegram_id уже существует, обновляем
                    ignoreDuplicates: false, // Не игнорируем, а обновляем
                }
            )
            .select(); // Выбираем данные после upsert

        if (error) {
            console.error('[bot.js /start] Error upserting user:', error);
            await ctx.reply('Произошла ошибка при сохранении вашего профиля. Попробуйте позже.');
            return;
        }
        console.log('[bot.js /start] User profile upserted/updated:', data);

        // Отправляем приветственное сообщение с кнопкой для открытия Web App
        await ctx.reply(
            `👋 Привет, ${telegramUser.first_name || 'пользователь'}!\n\nЯ бот для анализа снов. Откройте Личный Кабинет, чтобы начать!`,
            Markup.inlineKeyboard([
                Markup.button.webApp('Личный кабинет', WEB_APP_URL)
            ])
        );

    } catch (dbError) {
        console.error('[bot.js /start] Database operation failed:', dbError);
        await ctx.reply('Не удалось связаться с базой данных. Пожалуйста, попробуйте команду /start еще раз через некоторое время.');
    }
});

bot.help((ctx) => ctx.reply('Откройте "Личный кабинет" с помощью кнопки ниже или команды /start, чтобы управлять анализами и подпиской.', Markup.inlineKeyboard([
    Markup.button.webApp('Личный кабинет', WEB_APP_URL)
])));

// --- Обработка запросов из Web App (Пример: запрос на анализ) ---
// Важно: Фронтенд (tma/src/services/api.js) теперь вызывает отдельные Netlify функции.
// Этот обработчик может быть не нужен, если вся логика вынесена в /user-profile, /analyze-dream и т.д.
// Оставляем его как пример или для будущих действий, инициируемых из бота.

bot.on('message', async (ctx) => {
    // Проверяем, не является ли сообщение успешной оплатой (будет обработано ниже)
     if (ctx.message && 'successful_payment' in ctx.message) {
        return; // Передаем обработку специальному хендлеру
    }

    // Проверяем, не является ли сообщение сервисным (вход пользователя и т.д.)
    // которые не нужно обрабатывать как обычный текст
    if (!ctx.message || !('text' in ctx.message)) {
        console.log("[bot.js message] Received non-text message, ignoring.");
        return;
    }

    const text = ctx.message.text;
    const userId = ctx.from.id;
    console.log(`[bot.js message] Received text message from ${userId}: "${text}"`);

    // Если это не команда, предлагаем открыть Web App
    if (!text.startsWith('/')) {
        await ctx.reply(
            'Для анализа снов, просмотра истории или управления подпиской, пожалуйста, используйте Личный кабинет.',
            Markup.inlineKeyboard([
                Markup.button.webApp('Открыть Личный кабинет', WEB_APP_URL)
            ])
        );
    }
    // Команды (/start, /help) уже обработаны выше
});


// --- ОБРАБОТКА ПЛАТЕЖЕЙ TELEGRAM STARS ---

// 1. Обработчик PreCheckoutQuery (Ответ на запрос подтверждения перед оплатой)
bot.on('pre_checkout_query', async (ctx) => {
    const query = ctx.preCheckoutQuery;
    console.log(`[bot.js pre_checkout_query] Received pre-checkout query:`, JSON.stringify(query, null, 2));

    // Здесь можно добавить проверки (например, доступность товара/услуги),
    // но для Stars часто достаточно просто подтвердить.
    // Важно ответить в течение 10 секунд!

    try {
        await ctx.answerPreCheckoutQuery(true);
        console.log(`[bot.js pre_checkout_query] Answered YES to query ID: ${query.id}`);
    } catch (error) {
        console.error(`[bot.js pre_checkout_query] Error answering pre-checkout query ${query.id}:`, error);
        // Попытаться ответить отрицательно, если первая попытка не удалась
        try {
            await ctx.answerPreCheckoutQuery(false, "Произошла внутренняя ошибка. Попробуйте позже.");
        } catch (finalError) {
            console.error(`[bot.js pre_checkout_query] Failed to answer NO to query ${query.id}:`, finalError);
        }
    }
});

// 2. Обработчик SuccessfulPayment (Сообщение об успешной оплате)
bot.on('message', async (ctx) => {
    // Проверяем, содержит ли сообщение объект successful_payment
    if (ctx.message && 'successful_payment' in ctx.message) {
        const payment = ctx.message.successful_payment;
        const userId = ctx.from.id; // ID пользователя, совершившего платеж
        console.log(`[bot.js successful_payment] Received successful payment from User ID ${userId}:`, JSON.stringify(payment, null, 2));

        const payload = payment.invoice_payload;
        const amount = payment.total_amount; // Сумма в XTR
        const currency = payment.currency; // Должно быть 'XTR'

        // Проверяем валюту
        if (currency !== 'XTR') {
            console.warn(`[bot.js successful_payment] Received payment in unexpected currency: ${currency}. Payload: ${payload}`);
            // Можно уведомить администратора или просто проигнорировать
            return;
        }

        try {
            // Определяем тип покупки по payload (например, 'sub_USERID_TIMESTAMP' или 'deep_USERID_TIMESTAMP')
            if (payload.startsWith('sub_')) {
                // --- ОБРАБОТКА ПОКУПКИ ПОДПИСКИ ---
                console.log(`[bot.js successful_payment] Processing SUBSCRIPTION purchase for user ${userId}. Amount: ${amount} XTR.`);

                // Рассчитываем дату окончания подписки (например, +30 дней)
                const expiryDate = new Date();
                expiryDate.setDate(expiryDate.getDate() + 30);
                const expiryIsoString = expiryDate.toISOString();

                // Обновляем профиль пользователя в Supabase
                const { data, error } = await supabase
                    .from('users')
                    .update({
                        has_active_subscription: true,
                        subscription_expires_at: expiryIsoString
                    })
                    .eq('telegram_id', userId)
                    .select(); // Возвращаем обновленные данные

                if (error) {
                    console.error(`[bot.js successful_payment] Error updating subscription for user ${userId}:`, error);
                    await ctx.reply('✅ Оплата получена, но произошла ошибка при активации подписки. Пожалуйста, свяжитесь с поддержкой.');
                    // Здесь можно добавить логику уведомления администратора
                    return;
                }

                 if (!data || data.length === 0) {
                    console.error(`[bot.js successful_payment] User ${userId} not found in database during subscription update.`);
                     await ctx.reply('✅ Оплата получена, но не удалось найти ваш профиль для активации подписки. Пожалуйста, свяжитесь с поддержкой.');
                    return;
                }

                console.log(`[bot.js successful_payment] Subscription activated for user ${userId}. Expires: ${expiryIsoString}`);
                await ctx.reply(`🎉 Ваша подписка успешно активирована! Она будет действовать до ${expiryDate.toLocaleDateString('ru-RU')}. Теперь вам доступны безлимитные анализы снов.`);

            } else if (payload.startsWith('deep_')) {
                 // --- ОБРАБОТКА ПОКУПКИ ГЛУБОКОГО АНАЛИЗА ---
                console.log(`[bot.js successful_payment] Processing DEEP ANALYSIS purchase for user ${userId}. Amount: ${amount} XTR.`);

                // 1. Получаем последние 5 ОБЫЧНЫХ анализов пользователя
                const { data: recentAnalyses, error: fetchError } = await supabase
                    .from('analyses')
                    .select('id, dream_text, created_at') // Выбираем текст сна и дату
                    .eq('user_telegram_id', userId)
                    .eq('is_deep_analysis', false) // Только обычные анализы
                    .order('created_at', { ascending: false }) // Сортируем по убыванию даты
                    .limit(5); // Берем последние 5

                if (fetchError) {
                    console.error(`[bot.js successful_payment] Error fetching recent analyses for user ${userId}:`, fetchError);
                    await ctx.reply('✅ Оплата получена, но не удалось получить вашу историю для глубокого анализа. Свяжитесь с поддержкой.');
                    return;
                }

                 if (!recentAnalyses || recentAnalyses.length < 5) {
                    console.warn(`[bot.js successful_payment] User ${userId} purchased deep analysis but has only ${recentAnalyses?.length ?? 0} regular analyses.`);
                    // Этого не должно было случиться, так как кнопка появляется при >= 5
                    // Но лучше обработать этот случай
                    await ctx.reply(`✅ Оплата получена! Однако, для глубокого анализа требуется минимум 5 обычных анализов в вашей истории. Мы сохранили ваш платеж, анализ будет проведен, как только у вас накопится достаточно записей, или свяжитесь с поддержкой.`);
                    // Возможно, стоит вернуть средства или выдать токен? Зависит от бизнес-логики.
                    // Пока просто уведомляем.
                    return;
                }

                // 2. (ЗАГЛУШКА) Генерация глубокого анализа
                // !!! ЗДЕСЬ ДОЛЖЕН БЫТЬ ВЫЗОВ AI ДЛЯ ГЕНЕРАЦИИ АНАЛИЗА !!!
                // Собираем тексты снов
                const dreamTexts = recentAnalyses.map(a => a.dream_text).join('\n\n---\n\n'); // Объединяем тексты
                console.log(`[bot.js successful_payment] Generating deep analysis based on ${recentAnalyses.length} dreams for user ${userId}.`);
                // Пример заглушки
                const deepAnalysisResultText = `(Заглушка) Глубокий анализ ${recentAnalyses.length} снов пользователя ${userId}:\n\nОбнаружены повторяющиеся темы [тема1] и [тема2]. Частые символы: [символ1], [символ2]. Общий эмоциональный фон: [эмоция].\n\n(Полный анализ будет доступен после интеграции с AI.)`;

                // 3. Сохраняем результат глубокого анализа в Supabase
                const { data: insertData, error: insertError } = await supabase
                    .from('analyses')
                    .insert({
                        user_telegram_id: userId,
                        dream_text: `Глубокий анализ ${recentAnalyses.length} последних снов`, // Текст исходного "сна" - это описание анализа
                        analysis_text: deepAnalysisResultText, // Результат от AI (или заглушка)
                        is_deep_analysis: true, // Устанавливаем флаг
                        // Можно добавить ID снов, на которых основан анализ, в доп. поле (например, JSONB)
                        // source_analysis_ids: recentAnalyses.map(a => a.id)
                    })
                    .select(); // Возвращаем созданную запись

                if (insertError) {
                    console.error(`[bot.js successful_payment] Error saving deep analysis for user ${userId}:`, insertError);
                     await ctx.reply('✅ Оплата получена, но произошла ошибка при сохранении результата глубокого анализа. Свяжитесь с поддержкой.');
                    return;
                }

                console.log(`[bot.js successful_payment] Deep analysis saved for user ${userId}. ID: ${insertData?.[0]?.id}`);
                await ctx.reply(`✨ Ваш глубокий анализ готов! Он основан на ваших последних ${recentAnalyses.length} снах. Вы можете найти его вверху списка в вашем Личном кабинете.`);

            } else {
                console.warn(`[bot.js successful_payment] Received payment with unknown payload format: ${payload} from user ${userId}`);
                // Можно уведомить пользователя или администратора
                await ctx.reply('✅ Оплата получена, но не удалось определить тип покупки. Пожалуйста, свяжитесь с поддержкой, если услуга не была предоставлена.');
            }

        } catch (error) {
            console.error(`[bot.js successful_payment] General error processing payment for user ${userId}, payload ${payload}:`, error);
            await ctx.reply('Произошла критическая ошибка при обработке вашего платежа. Пожалуйста, свяжитесь с поддержкой.');
            // Логика уведомления администратора
        }
    } else if (ctx.message && ('text' in ctx.message)) {
        // Обработка обычных текстовых сообщений (как было раньше)
        const text = ctx.message.text;
        const userId = ctx.from.id;
        console.log(`[bot.js message] Received text message from ${userId}: "${text}"`);

        // Если это не команда, предлагаем открыть Web App
        if (!text.startsWith('/')) {
            await ctx.reply(
                'Для анализа снов, просмотра истории или управления подпиской, пожалуйста, используйте Личный кабинет.',
                Markup.inlineKeyboard([
                    Markup.button.webApp('Открыть Личный кабинет', WEB_APP_URL)
                ])
            );
        }
    } else {
         // Обработка других типов сообщений, если нужно
         // console.log("[bot.js message] Received non-text, non-payment message.");
    }
});


// --- Запуск Webhook ---
// Важно: URL вебхука должен быть установлен через API Telegram или вручную.
// Формат: https://<ваш-домен-netlify>/.netlify/functions/bot
// Netlify автоматически передает запросы к /.netlify/functions/bot в эту функцию.

export const handler = async (event) => {
    try {
        const body = JSON.parse(event.body || '{}');
        console.log("[bot.js handler] Received event body:", JSON.stringify(body, null, 2)); // Логируем входящий запрос

        // Обрабатываем обновление от Telegram
        await bot.handleUpdate(body);

        return { statusCode: 200, body: 'OK' };
    } catch (error) {
        console.error('[bot.js handler] Error handling update:', error);
        return {
            statusCode: error.response?.status || 500, // Используем статус ответа Telegraf, если есть
            body: `Error: ${error.message || 'Internal Server Error'}`
        };
    }
};

// --- Локальный запуск для разработки (если нужно) ---
// Включите, если запускаете локально через `netlify dev` и хотите использовать polling
// if (process.env.NODE_ENV === 'development') {
//   console.log("Starting bot in polling mode for development...");
//   bot.launch().then(() => {
//     console.log("Bot started locally via polling.");
//   }).catch(err => {
//     console.error("Error starting bot locally:", err);
//   });
// }

// Обработка сигналов завершения (важно для корректной работы вебхуков)
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
