// bot/functions/deep-analysis.js (ИСПРАВЛЕНО: Убрано списание токена)

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
const REQUIRED_DREAMS = 5;
const DEEP_ANALYSIS_PROMPT = `... (ваш промпт без изменений) ...`;

// --- Функция валидации InitData ---
function validateTelegramData(initData, botToken) { /* ... ваш код валидации ... */ }

// --- Генерация Заголовков CORS ---
const generateCorsHeaders = () => { /* ... ваш код ... */ };

// --- Функция вызова Gemini ---
async function getDeepGeminiAnalysis(geminiModel, combinedDreams) { /* ... ваш код ... */ }

// --- Главный обработчик Netlify Function ---
exports.handler = async (event) => {
    const corsHeaders = generateCorsHeaders();

    // OPTIONS, POST check, Config Check... (без изменений)
    if (event.httpMethod === 'OPTIONS') { return { statusCode: 204, headers: corsHeaders, body: '' }; }
    if (event.httpMethod !== 'POST') { return { statusCode: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Method Not Allowed' }) }; }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !BOT_TOKEN || !GEMINI_API_KEY || !ALLOWED_TMA_ORIGIN) { /* ... config error ... */ }

    // Validate InitData
    const initDataHeader = event.headers['x-telegram-init-data'];
    let verifiedUserId;
    if (!initDataHeader) { /* ... no init data error ... */ }
    const validationResult = validateTelegramData(initDataHeader, BOT_TOKEN);
    if (!validationResult.valid || !validationResult.data?.id) { /* ... invalid init data error ... */ }
    verifiedUserId = validationResult.data.id;
    console.log(`[deep-analysis] Access validated for user: ${verifiedUserId}`);

    // --- Инициализация Gemini ---
    let geminiModelInstance;
    try { /* ... инициализация Gemini ... */ }
    catch (e) { /* ... ошибка инициализации Gemini ... */ }

    // --- Основная логика (БЕЗ СПИСАНИЯ ТОКЕНА) ---
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    try {
        // <<<--- ШАГ 1: СПИСАНИЕ ТОКЕНА УДАЛЕНО ---

        // 2. Получить ID пользователя в нашей базе
        const { data: user, error: userFindError } = await supabase
            .from('users').select('id').eq('tg_id', verifiedUserId).single();
        if (userFindError || !user) { throw new Error('Профиль пользователя не найден.'); }
        const userDbId = user.id;

        // 3. Получить последние N снов
        console.log(`[deep-analysis] Fetching last ${REQUIRED_DREAMS} dreams for user_id ${userDbId}...`);
        const { data: dreams, error: historyError } = await supabase
            .from('analyses').select('dream_text').eq('user_id', userDbId)
            .order('created_at', { ascending: false }).limit(REQUIRED_DREAMS);
        if (historyError) { throw new Error("Ошибка при получении истории снов."); }

        // 4. Проверить количество снов
        if (!dreams || dreams.length < REQUIRED_DREAMS) {
             console.log(`[deep-analysis] Not enough dreams for user_id ${userDbId}. Found: ${dreams?.length ?? 0}`);
             // Теперь это ошибка запроса, т.к. оплата уже прошла
             return { statusCode: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: `Недостаточно снов для глубокого анализа (нужно ${REQUIRED_DREAMS}, найдено ${dreams?.length ?? 0}).` }) };
        }

        // 5. Объединить тексты снов ...
        const combinedDreamsText = dreams.map(d => d.dream_text.trim()).reverse().join('\n\n--- СОН ---\n\n');
        console.log(`[deep-analysis] Combined dreams length: ${combinedDreamsText.length}`);

        // 6. Вызвать Gemini для анализа ...
        const deepAnalysisResult = await getDeepGeminiAnalysis(geminiModelInstance, combinedDreamsText);

        // 7. Вернуть успешный результат
        console.log(`[deep-analysis] Deep analysis successful for user ${verifiedUserId}.`);
        return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true, analysis: deepAnalysisResult }) };

    } catch (error) {
        console.error(`[deep-analysis] Catch block error for user ${verifiedUserId}:`, error);
        return { statusCode: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: error.message || 'Внутренняя ошибка сервера.' }) };
    }
};
