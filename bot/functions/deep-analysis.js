// bot/functions/deep-analysis.js
const { createClient } = require("@supabase/supabase-js");
const { GoogleGenerativeAI } = require("@google/generative-ai"); //  Предполагаем, что используется эта библиотека
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; //  Не забудьте добавить этот ключ в переменные окружения
const BOT_TOKEN = process.env.BOT_TOKEN;
const ALLOWED_TMA_ORIGIN = process.env.ALLOWED_TMA_ORIGIN;

// ---  Функция валидации Telegram InitData (используем ту же, что и в analyses-history.js) ---
function validateTelegramData(initData, botToken) {
  //  Скопируйте сюда код функции validateTelegramData из analyses-history.js
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

// --- Генерация Заголовков CORS ---  (Используем ту же функцию)
const generateCorsHeaders = () => {
    const originToAllow = ALLOWED_TMA_ORIGIN || '*';
    console.log(`[deep-analysis] CORS Headers: Allowing Origin: ${originToAllow}`);
    return {
        'Access-Control-Allow-Origin': originToAllow,
        'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-Init-Data',
        'Access-Control-Allow-Methods': 'POST, OPTIONS', //  Изменено на POST и OPTIONS
    };
};


exports.handler = async (event) => {
  const corsHeaders = generateCorsHeaders();

  // --- Обработка Preflight запроса (OPTIONS) ---
  if (event.httpMethod === 'OPTIONS') {
    console.log("[deep-analysis] Responding to OPTIONS request");
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }


  // --- Проверка метода ---
  if (event.httpMethod !== 'POST') {  //  Изменено на POST
    console.log(`[deep-analysis] Method Not Allowed: ${event.httpMethod}`);
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  // --- Проверка конфигурации сервера ---
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !GEMINI_API_KEY || !BOT_TOKEN || !ALLOWED_TMA_ORIGIN) { // Добавлена проверка GEMINI_API_KEY и ALLOWED_TMA_ORIGIN
    console.error("[deep-analysis] Server configuration missing (Supabase URL/Key, Gemini Key, Bot Token, or Allowed Origin)");
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Internal Server Error: Configuration missing.' }) };
  }

  // --- Валидация InitData с использованием ВАШЕЙ функции ---
  const initDataHeader = event.headers['x-telegram-init-data'];
  let verifiedUserId;

  if (!initDataHeader) {
    console.warn("[deep-analysis] Unauthorized: Missing Telegram InitData header");
    return { statusCode: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized: Missing Telegram InitData' }) };
  }

  const validationResult = validateTelegramData(initDataHeader, BOT_TOKEN);

  if (!validationResult.valid) {
    console.error(`[deep-analysis] InitData validation failed: ${validationResult.error}`);
    return { statusCode: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: `Forbidden: Invalid Telegram InitData (${validationResult.error})` }) };
  }
  if (!validationResult.data || typeof validationResult.data.id === 'undefined') {
    console.error(`[deep-analysis] InitData is valid, but user data/ID is missing or failed to parse: ${validationResult.error}`);
    return { statusCode: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: `Forbidden: Could not extract user data from InitData (${validationResult.error})` }) };
  }

  verifiedUserId = validationResult.data.id;
  console.log(`[deep-analysis] Access validated for user: ${verifiedUserId}`);

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-light" }); //  Используйте подходящую модель

    // 1. Получаем ID пользователя из тела запроса (вместо InitData)
    const { userId } = JSON.parse(event.body);
    if (!userId) {
      console.error("[deep-analysis] User ID missing in request body");
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Bad Request: User ID is required' }),
      };
    }

    console.log(`[deep-analysis] Received request for deep analysis for user: ${userId}`);


    // 2. Находим пользователя в базе данных по tg_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('tg_id', userId)
      .single();

    if (userError) {
      console.error(`[deep-analysis] Error finding user in DB: ${userError.message}`);
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Internal Server Error: Could not find user in database' }),
      };
    }
    const userDbId = user.id;
    console.log(`[deep-analysis] Found user in DB with ID: ${userDbId}`);


    // 3. Получаем последние 5 снов пользователя
    const { data: analyses, error: analysesError } = await supabase
      .from('analyses')
      .select('dream_text')
      .eq('user_id', userDbId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (analysesError) {
      console.error(`[deep-analysis] Error fetching analyses: ${analysesError.message}`);
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Internal Server Error: Could not retrieve dream analyses' }),
      };
    }

    if (!analyses || analyses.length < 5) {
      console.warn(`[deep-analysis] Not enough dreams (found ${analyses ? analyses.length : 0}) for user ${userDbId}`);
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Not enough dreams for deep analysis' }),
      };
    }

    const dreamTexts = analyses.map(a => a.dream_text);
    console.log(`[deep-analysis] স্বপ্নগুলো বিশ্লেষণ করা হচ্ছে: ${dreamTexts.length}`);

    // 4. Отправляем сны в Gemini для анализа
    const prompt = `Проанализируй следующие пять снов совместно и выяви общие темы, символы и закономерности: \n\n${dreamTexts.join('\n\n')}`;
    const result = await model.generateContent(prompt);
    const analysis = result.response.text();
    console.log(`[deep-analysis] Analysis Result from Gemini (truncated): ${analysis.substring(0, 200)}...`);

    // 5. Сохраняем результат анализа в БД
    const { data: insertResult, error: insertError } = await supabase
      .from('analyses')
      .insert([
        {
          user_id: userDbId,
          dream_text: 'Глубокий анализ снов', //  Можно использовать заголовок или описание
          analysis: analysis,
          is_deep_analysis: true, //  Добавляем флаг, указывающий на глубокий анализ
        },
      ]);

    if (insertError) {
      console.error(`[deep-analysis] Error saving deep analysis: ${insertError.message}`);
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Internal Server Error: Could not save deep analysis' }),
      };
    }

    console.log(`[deep-analysis] Deep analysis saved with ID: ${insertResult ? insertResult[0].id : 'unknown'}`);

    // 6. Возвращаем результат
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysis: analysis, is_deep_analysis: true }), //  Возвращаем анализ и флаг
    };

  } catch (error) {
    console.error(`[deep-analysis] Unhandled error: ${error.message}`);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal Server Error: ' + error.message }),
    };
  }
};
