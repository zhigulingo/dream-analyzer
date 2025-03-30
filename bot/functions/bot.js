import { Bot, Context, session, SessionFlavor } from "grammy";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai"; // Новый импорт
import dotenv from 'dotenv';

// Загрузка переменных окружения из .env файла (для локальной разработки)
dotenv.config({ path: '../.env' }); // Указываем путь к .env в корне

// --- Типы ---
interface SessionData {
  // Здесь можно хранить временные данные сессии, если нужно
}
type MyContext = Context & SessionFlavor<SessionData>;

// --- Константы и Инициализация ---
const BOT_TOKEN = process.env.BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
// Используем Service Role Key для бэкенда!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Новый ключ

if (!BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_KEY || !GEMINI_API_KEY) {
  console.error("Ошибка: Необходимые переменные окружения не установлены!");
  process.exit(1); // Завершаем работу, если ключей нет
}

// --- Инициализация Клиентов ---

// Клиент Supabase с правами администратора (Service Role)
const supabaseAdmin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        // Отключаем автоматическое обновление токена для Service Key
        autoRefreshToken: false,
        persistSession: false
    }
});
console.log("Supabase Admin Client инициализирован.");

// Клиент Google Generative AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-pro" }); // Используем gemini-pro
console.log("Gemini Client инициализирован (модель gemini-pro).");

// --- Функции ---

/**
 * Получает или создает пользователя в базе данных.
 * @param userId - Telegram User ID
 * @returns ID пользователя в таблице users или null в случае ошибки
 */
async function getOrCreateUser(userId: number): Promise<number | null> {
  try {
    // Проверяем, существует ли пользователь
    let { data: existingUser, error: selectError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('tg_id', userId)
      .single(); // single() вернет null, если не найдено, или ошибку, если найдено больше одного

    if (selectError && selectError.code !== 'PGRST116') { // PGRST116 - код "No rows found"
      console.error(`Ошибка при поиске пользователя ${userId}:`, selectError);
      return null;
    }

    if (existingUser) {
      return existingUser.id; // Пользователь найден, возвращаем его ID
    } else {
      // Пользователь не найден, создаем нового с пробным токеном
      const { data: newUser, error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          tg_id: userId,
          subscription_type: 'free', // Или ваш дефолтный тип
          tokens: 1 // Даем 1 пробный токен
          // subscription_end можно не устанавливать или установить null
        })
        .select('id') // Возвращаем ID созданного пользователя
        .single(); // single() нужен, т.к. insert возвращает массив

      if (insertError) {
        console.error(`Ошибка при создании пользователя ${userId}:`, insertError);
        return null;
      }

      if (newUser) {
        console.log(`Создан новый пользователь: tg_id=${userId}, id=${newUser.id}`);
        return newUser.id;
      } else {
        console.error(`Не удалось получить ID нового пользователя ${userId} после вставки.`);
        return null;
      }
    }
  } catch (error) {
    console.error(`Критическая ошибка в getOrCreateUser для ${userId}:`, error);
    return null;
  }
}

/**
 * Получает анализ сна от Gemini API.
 * @param dreamText - Текст сна.
 * @returns Строку с анализом или null в случае ошибки.
 */
async function getGeminiAnalysis(dreamText: string): Promise<string | null> {
  if (!dreamText || dreamText.trim().length === 0) {
      return "Пожалуйста, опишите свой сон.";
  }
  // Ограничение длины текста (пример)
  const MAX_DREAM_LENGTH = 4000; // Ограничьте, чтобы контролировать расход токенов Gemini
  if (dreamText.length > MAX_DREAM_LENGTH) {
      return `Извините, ваш сон слишком длинный (>${MAX_DREAM_LENGTH} символов). Попробуйте описать его короче.`;
  }

  try {
    console.log("Запрос анализа к Gemini...");
    const prompt = `Ты - эмпатичный и опытный толкователь снов. Проанализируй следующий сон пользователя, сохраняя конфиденциальность и избегая медицинских диагнозов или предсказаний будущего.
Сон: "${dreamText}"

Предоставь анализ (2-4 абзаца), фокусируясь на:
1.  Возможных символах и их значениях в контексте сна.
2.  Преобладающих эмоциях и их связи с реальной жизнью пользователя (если это уместно).
3.  Общих темах или сообщениях, которые могут содержаться во сне.
Отвечай мягко, поддерживающе и понятно. Не давай прямых советов, что делать.`;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const analysisText = response.text();

    console.log("Анализ от Gemini получен.");
    // Простая проверка на пустой или некорректный ответ
    if (!analysisText || analysisText.trim().length === 0) {
        console.error("Gemini вернул пустой ответ.");
        return "К сожалению, не удалось получить анализ для вашего сна в данный момент.";
    }

    // TODO: Добавить более строгую проверку ответа Gemini, если необходимо
    // (например, проверка на наличие safetyRatings, если API их возвращает)

    return analysisText;

  } catch (error: any) {
    console.error("Ошибка при вызове Gemini API:", error);
    // Можно добавить более специфичную обработку разных ошибок API Google
    return "Произошла ошибка при связи с сервисом анализа снов. Попробуйте позже.";
  }
}

/**
 * Обрабатывает запрос на анализ сна.
 * @param ctx - Контекст Grammy.
 * @param dreamText - Текст сна.
 */
async function analyzeDream(ctx: MyContext, dreamText: string) {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply("Не удалось идентифицировать пользователя.");
    return;
  }

  // 1. Получаем или создаем пользователя в БД
  const userDbId = await getOrCreateUser(userId);
  if (!userDbId) {
      await ctx.reply("Произошла ошибка при доступе к вашему профилю. Попробуйте позже.");
      return;
  }

  // 2. Пытаемся списать токен АТОМАРНО через RPC
  await ctx.reply("Проверяем наличие токенов и готовимся к анализу...");
  try {
      const { data: tokenDecremented, error: rpcError } = await supabaseAdmin
          .rpc('decrement_token_if_available', { user_tg_id: userId });

      if (rpcError) {
          console.error(`Ошибка RPC decrement_token_if_available для tg_id ${userId}:`, rpcError);
          await ctx.reply("Произошла внутренняя ошибка при проверке токенов. Попробуйте позже.");
          return;
      }

      if (!tokenDecremented) {
          console.log(`Недостаточно токенов для пользователя tg_id ${userId}.`);
          // TODO: Добавить сообщение с предложением купить токены и кнопку/ссылку на TMA
          await ctx.reply("У вас закончились бесплатные или купленные токены для анализа. Откройте Личный кабинет, чтобы пополнить баланс.", {
            // reply_markup: ... // Сюда можно добавить кнопку для открытия TMA
          });
          return;
      }

      // 3. Если токен успешно списан - вызываем Gemini
      console.log(`Токен списан для tg_id ${userId}. Вызов Gemini...`);
      await ctx.reply("Токен использован. Анализирую ваш сон... 🧠✨");
      const analysisResult = await getGeminiAnalysis(dreamText);

      if (!analysisResult || analysisResult.startsWith("Извините,") || analysisResult.startsWith("Произошла ошибка") || analysisResult.startsWith("Пожалуйста,")) {
          // Если Gemini вернул ошибку или пустой результат
          await ctx.reply(analysisResult || "Не удалось получить анализ.");
          // ВАЖНО: Токен уже списан. Нужно решить: возвращать ли его?
          // Пока просто сообщаем об ошибке. Для возврата нужна доп. логика.
          console.warn(`Анализ для tg_id ${userId} не удался, но токен был списан.`);
          return;
      }

      // 4. Сохраняем успешный анализ в БД
      const { error: insertAnalysisError } = await supabaseAdmin
          .from('analyses')
          .insert({
              user_id: userDbId, // Используем ID из нашей таблицы users
              dream_text: dreamText,
              analysis: analysisResult
          });

      if (insertAnalysisError) {
          console.error(`Ошибка сохранения анализа для user_id ${userDbId}:`, insertAnalysisError);
          await ctx.reply("Ваш сон проанализирован, но произошла ошибка при сохранении результата. Пожалуйста, попробуйте снова позже.");
          // Опять же, токен списан.
          return;
      }

      // 5. Отправляем результат пользователю
      console.log(`Анализ для tg_id ${userId} успешно сохранен и отправлен.`);
      await ctx.reply(`Вот анализ вашего сна:\n\n${analysisResult}\n\nВы можете посмотреть историю своих анализов в Личном кабинете.`); // TODO: Добавить кнопку ЛК

  } catch (error) {
      console.error(`Критическая ошибка в analyzeDream для tg_id ${userId}:`, error);
      await ctx.reply("Произошла непредвиденная ошибка при обработке вашего сна.");
  }
}

// --- Настройка Бота ---
const bot = new Bot<MyContext>(BOT_TOKEN);

// Middleware для сессий (если понадобится)
bot.use(session({ initial: (): SessionData => ({}) }));

// Обработчик команды /start
bot.command("start", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return; // Игнорируем, если нет ID

  console.log(`Пользователь ${userId} запустил бота.`);
  await getOrCreateUser(userId); // Убедимся, что пользователь есть в базе

  await ctx.reply(
    "Добро пожаловать в Анализатор Снов! ✨\n\n" +
    "Я помогу вам разобраться в значениях ваших сновидений с помощью искусственного интеллекта.\n\n" +
    "У вас есть 1 бесплатный анализ. Просто опишите свой сон в следующем сообщении, и я постараюсь его растолковать.\n\n" +
    "Также вы можете открыть свой Личный кабинет для просмотра истории и управления токенами.",
    {
      reply_markup: {
        inline_keyboard: [
          // TODO: Заменить YOUR_TMA_URL на реальный URL вашего Mini App
          [{ text: "Открыть Личный кабинет 👤", web_app: { url: process.env.TMA_URL || "YOUR_TMA_URL" } }],
        ],
      },
    }
  );
});

// Обработчик текстовых сообщений (для анализа сна)
bot.on("message:text", async (ctx) => {
  const dreamText = ctx.message.text;
  const userId = ctx.from?.id;
  console.log(`Получен текст от ${userId}: "${dreamText}"`);

  // Проверяем, не является ли текст командой
  if (dreamText.startsWith('/')) {
      // Можно добавить обработку других команд или просто игнорировать
      // await ctx.reply("Неизвестная команда.");
      return;
  }

  // Запускаем анализ сна
  await analyzeDream(ctx, dreamText);
});

// Обработчик ошибок бота
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Ошибка при обработке обновления ${ctx.update.update_id}:`);
  const e = err.error;
  // Логируем ошибку более детально
  if (e instanceof Error) {
    console.error("Error:", e.stack || e.message);
  } else {
    console.error("Unknown error object:", e);
  }
  // Можно попробовать отправить сообщение пользователю, если это уместно
  // ctx.reply("Извините, произошла внутренняя ошибка.").catch(e => console.error("Failed to send error message", e));
});


// --- Экспорт для Netlify ---
// Важно: Netlify ожидает экспорт handler
export const handler = async (event: any) => {
    try {
        // Преобразуем событие Netlify в формат, понятный Grammy
        // (Может потребоваться адаптер в зависимости от того, как Netlify вызывает функцию,
        // но для стандартного вебхука `await bot.handleUpdate(JSON.parse(event.body))` часто работает)
        await bot.handleUpdate(JSON.parse(event.body || '{}'));
        return { statusCode: 200, body: "" }; // Отвечаем Telegram, что вебхук получен
    } catch (error) {
        console.error("Ошибка в главном обработчике:", error);
        return { statusCode: 500, body: "Internal Server Error" };
    }
};

// --- Запуск для локальной разработки (не используется Netlify) ---
// Этот блок кода не будет выполняться на Netlify, он нужен только для локального запуска
// Например, через `ts-node bot/bot.ts`
if (process.env.NODE_ENV !== 'production' && require.main === module) {
  console.log("Запуск бота в режиме polling для локальной разработки...");
  bot.start(); // Использует long polling

  // Обработка сигналов для корректного завершения
  process.once("SIGINT", () => bot.stop());
  process.once("SIGTERM", () => bot.stop());
}
