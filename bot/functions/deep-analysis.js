// bot/functions/deep-analysis.js (Новая функция)

const { createClient } = require("@supabase/supabase-js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const crypto = require('crypto');

// --- Переменные Окружения ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOT_TOKEN = process.env.BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ALLOWED_TMA_ORIGIN = process.env.ALLOWED_TMA_ORIGIN;

// --- Константы ---
const REQUIRED_DREAMS = 5; // Сколько снов нужно для анализа
const DEEP_ANALYSIS_PROMPT = `Ты — опытный психоаналитик и толкователь снов, специализирующийся на поиске закономерностей и глубинных тем. Проанализируй ПОСЛЕДОВАТЕЛЬНОСТЬ из ${REQUIRED_DREAMS} недавних снов пользователя. Ищи:
1.  **Повторяющиеся символы/образы:** Что они могут означать в контексте серии снов?
2.  **Общие темы или сюжеты:** Есть ли сквозная линия или проблема?
3.  **Эмоциональная динамика:** Меняются ли эмоции от сна к сну? Есть ли прогресс или зацикливание?
4.  **Возможные связи с реальностью:** На какие аспекты жизни пользователя могут указывать эти сны (очень осторожно, без диагнозов)?
5.  **Общее послание или вывод:** Какой главный урок или сообщение несет эта серия снов?

Отвечай эмпатично, структурированно (можно по пунктам), избегая прямых предсказаний и медицинских диагнозов. Сохраняй конфиденциальность.

Сны пользователя (разделены '--- СОН ---'):
"""
[DREAM_TEXT_PLACEHOLDER]
"""

Твой глубокий анализ:`;

// --- Функция валидации InitData (такая же, как в других функциях) ---
function validateTelegramData(initData, botToken) {
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
    params.delete('hash'); // Удаляем hash для проверки
    const dataCheckArr = [];
    params.sort(); // Важно сортировать параметры
    params.forEach((value, key) => dataCheckArr.push(`${key}=${value}`));
    const dataCheckString = dataCheckArr.join('\n');

    try {
        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
        const checkHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        if (checkHash === hash) {
            // Валидация успешна, пытаемся извлечь данные пользователя
            const userDataString = params.get('user');
            if (!userDataString) {
                console.warn("[validateTelegramData] User data is missing in initData");
                return { valid: true, data: null, error: "User data missing" }; // Валидно, но данных нет
            }
            try {
                const userData = JSON.parse(decodeURIComponent(userDataString));
                 // Проверяем наличие ID пользователя
                 if (!userData || typeof userData.id === 'undefined') {
                    console.warn("[validateTelegramData] Parsed user data is missing ID");
                    return { valid: true, data: null, error: "User ID missing in parsed data" };
                 }
                return { valid: true, data: userData, error: null };
            } catch (parseError) {
                console.error("[validateTelegramData] Error parsing user data JSON:", parseError);
                return { valid: true, data: null, error: "Failed to parse user data" }; // Валидно, но данные пользователя не распарсились
            }
        } else {
            console.warn("[validateTelegramData] Hash mismatch during validation.");
            return { valid: false, data: null, error: "Hash mismatch" };
        }
    } catch (error) {
        console.error("[validateTelegramData] Crypto error during validation:", error);
        return { valid: false, data: null, error: "Validation crypto error" };
    }
}
// --- Вставьте сюда ТОЧНО ТАКУЮ ЖЕ функцию validateTelegramData, как в user-profile.js ---
// (Важно: не забудьте скопировать ее сюда полностью)

// --- Генерация Заголовков CORS ---
const generateCorsHeaders = () => {
    const originToAllow = ALLOWED_TMA_ORIGIN || '*';
    console.log(`[deep-analysis] CORS Headers: Allowing Origin: ${originToAllow}`);
    return {
        'Access-Control-Allow-Origin': originToAllow,
        'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-Init-Data',
        'Access-Control-Allow-Methods': 'POST, OPTIONS', // Только POST и OPTIONS
    };
};

// --- Функция вызова Gemini для глубокого анализа ---
async function getDeepGeminiAnalysis(geminiModel, combinedDreams) {
    if (!geminiModel) { throw new Error("Gemini model is not initialized."); }
    if (!combinedDreams || combinedDreams.trim().length === 0) { throw new Error("No dream text provided for deep analysis."); }

    try {
        console.log("[deep-analysis] Requesting deep analysis from Gemini...");
        const prompt = DEEP_ANALYSIS_PROMPT.replace('[DREAM_TEXT_PLACEHOLDER]', combinedDreams);
        // console.log("[deep-analysis] Prompt:", prompt); // Раскомментируйте для отладки промпта

        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;

        if (response.promptFeedback?.blockReason) {
            console.warn(`[deep-analysis] Gemini blocked: ${response.promptFeedback.blockReason}`);
            throw new Error(`Анализ заблокирован моделью: ${response.promptFeedback.blockReason}`);
        }
        const analysisText = response.text();
        if (!analysisText || analysisText.trim().length === 0) {
            console.error("[deep-analysis] Gemini returned empty response.");
            throw new Error("Сервис анализа вернул пустой ответ.");
        }
        console.log("[deep-analysis] Deep analysis received successfully.");
        return analysisText;
    } catch (error) {
        console.error("[deep-analysis] Error calling Gemini:", error);
        // Перевыбрасываем ошибку для обработки в главном хендлере
        throw new Error(`Ошибка при обращении к сервису анализа: ${error.message}`);
    }
}


// --- Главный обработчик Netlify Function ---
exports.handler = async (event) => {
    const corsHeaders = generateCorsHeaders();

    // OPTIONS
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: corsHeaders, body: '' };
    }
    // POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Method Not Allowed' }) };
    }
    // Config Check
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !BOT_TOKEN || !GEMINI_API_KEY || !ALLOWED_TMA_ORIGIN) {
        console.error("[deep-analysis] Server configuration missing.");
        return { statusCode: 500, headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ success: false, error: 'Internal Server Error: Configuration missing.' }) };
    }

    // Validate InitData
    const initDataHeader = event.headers['x-telegram-init-data'];
    let verifiedUserId;
    if (!initDataHeader) { return { statusCode: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Unauthorized: Missing InitData' }) }; }
    const validationResult = validateTelegramData(initDataHeader, BOT_TOKEN);
    if (!validationResult.valid || !validationResult.data?.id) { return { statusCode: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: `Forbidden: Invalid InitData (${validationResult.error})` }) }; }
    verifiedUserId = validationResult.data.id;
    console.log(`[deep-analysis] Access validated for user: ${verifiedUserId}`);

    // --- Основная логика ---
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    let geminiModelInstance;
    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        geminiModelInstance = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    } catch (e) {
         console.error("[deep-analysis] Failed to initialize Gemini:", e);
         return { statusCode: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Ошибка инициализации сервиса анализа.' }) };
    }


    try {
        
        // 2. Получить ID пользователя в нашей базе
        const { data: user, error: userFindError } = await supabase
            .from('users').select('id').eq('tg_id', verifiedUserId).single();

        if (userFindError || !user) {
            if (userFindError?.code !== 'PGRST116') console.error(`[deep-analysis] Error finding user DB ID for ${verifiedUserId}:`, userFindError);
            throw new Error('Профиль пользователя не найден в базе данных.');
        }
        const userDbId = user.id;

        // 3. Получить последние N снов
        console.log(`[deep-analysis] Fetching last ${REQUIRED_DREAMS} dreams for user_id ${userDbId}...`);
        const { data: dreams, error: historyError } = await supabase
            .from('analyses')
            .select('dream_text') // Выбираем только текст сна
            .eq('user_id', userDbId)
            .order('created_at', { ascending: false }) // Сначала самые новые
            .limit(REQUIRED_DREAMS);

        if (historyError) {
            console.error(`[deep-analysis] Error fetching dream history for user_id ${userDbId}:`, historyError);
            throw new Error("Ошибка при получении истории снов.");
        }

        // 4. Проверить количество снов
        if (!dreams || dreams.length < REQUIRED_DREAMS) {
             console.log(`[deep-analysis] Not enough dreams found for user_id ${userDbId}. Found: ${dreams?.length ?? 0}`);
             // Важно: Токен уже списан! Нужно его вернуть? Или предупредить заранее?
             // Пока просто сообщаем об ошибке. В идеале, проверку на кол-во снов делать до списания токена.
             // Но это усложнит логику, т.к. нужно два запроса к БД до списания.
             return { statusCode: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: `Недостаточно снов для глубокого анализа (нужно ${REQUIRED_DREAMS}, найдено ${dreams?.length ?? 0}). Токен был списан.` }) };
        }

        // 5. Объединить тексты снов
        const combinedDreamsText = dreams
            .map(d => d.dream_text.trim()) // Убираем лишние пробелы
            .reverse() // Переворачиваем, чтобы были от старого к новому для анализа динамики
            .join('\n\n--- СОН ---\n\n'); // Разделяем сны
        console.log(`[deep-analysis] Combined dreams text length: ${combinedDreamsText.length}`);

        // 6. Вызвать Gemini для анализа
        const deepAnalysisResult = await getDeepGeminiAnalysis(geminiModelInstance, combinedDreamsText);

        // 7. Вернуть успешный результат
        console.log(`[deep-analysis] Deep analysis successful for user ${verifiedUserId}.`);
        return {
            statusCode: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: true, analysis: deepAnalysisResult })
        };

    } catch (error) {
        console.error(`[deep-analysis] Catch block error for user ${verifiedUserId}:`, error);
        // Возвращаем ошибку, которую поймали (из RPC, Supabase, Gemini или нашу)
        return {
            statusCode: 500, // Или другой код, если ошибка специфична (напр. 400)
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: false, error: error.message || 'Внутренняя ошибка сервера при глубоком анализе.' })
        };
    }
};
