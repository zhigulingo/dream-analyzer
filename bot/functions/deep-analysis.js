// bot/functions/deep-analysis.js (Новая функция)

const { createClient } = require("@supabase/supabase-js");
const { DatabaseQueries, createOptimizedClient } = require('./shared/database/queries');
const geminiService = require("./shared/services/gemini-service");
const crypto = require('crypto');
const { validateTelegramData } = require('./shared/auth/telegram-validator');
const { wrapApiHandler, createApiError } = require('./shared/middleware/api-wrapper');
const { createSuccessResponse, createErrorResponse, parseJsonBody } = require('./shared/middleware/error-handler');

// Импорт structured logger
const { createLogger } = require('./shared/utils/logger');

// --- Переменные Окружения ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOT_TOKEN = process.env.BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ALLOWED_TMA_ORIGIN = process.env.ALLOWED_TMA_ORIGIN;

// --- Константы ---
const { REQUIRED_DREAMS } = require("./shared/prompts/dream-prompts");

// Создание логгера для deep analysis
const logger = createLogger({ module: 'deep-analysis' });

// --- Используем общую библиотеку авторизации вместо дублированной функции ---

// --- Функция вызова Gemini для глубокого анализа ---
async function getDeepGeminiAnalysis(geminiModel, combinedDreams) {
    try {
        logger.geminiOperation('deep_analysis_request', 'gemini-pro');
        const result = await geminiService.deepAnalyzeDreams(combinedDreams);
        logger.geminiOperation('deep_analysis_success', 'gemini-pro', null, null, {
            dreamsCount: combinedDreams.length
        });
        return result;
    } catch (error) {
        logger.geminiError('deep_analysis_failed', error, {
            dreamsCount: combinedDreams.length
        });
        throw error;
    }
}



// --- Internal Handler Function ---
async function handleDeepAnalysis(event, context, corsHeaders) {
    const requestLogger = logger.child({ 
        requestId: context.awsRequestId || crypto.randomBytes(8).toString('hex')
    });
    requestLogger.generateCorrelationId();
    
    requestLogger.apiRequest(event.httpMethod, event.path, null, null, null, {
        headers: Object.keys(event.headers)
    });

    // --- Валидация InitData ---
    const initDataHeader = event.headers['x-telegram-init-data'];
    if (!initDataHeader) {
        requestLogger.authError('missing_init_data', new Error('Missing InitData header'));
        throw createApiError('Unauthorized: Missing InitData', 401);
    }

    const validationResult = validateTelegramData(initDataHeader, BOT_TOKEN);
    if (!validationResult.valid || !validationResult.data?.id) {
        requestLogger.authError('invalid_init_data', new Error(validationResult.error));
        throw createApiError(`Forbidden: Invalid InitData (${validationResult.error})`, 403);
    }

    const verifiedUserId = validationResult.data.id;
    requestLogger.authEvent('init_data_validated', verifiedUserId, 'success');

    // --- Основная логика ---
    const supabase = createOptimizedClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const dbQueries = new DatabaseQueries(supabase);

    // Gemini initialization is now handled by the unified service

    try {
        // 1. Получить пользователя со статистикой снов одним оптимизированным запросом
        requestLogger.dbOperation('SELECT', 'user_profile_with_stats', null, null, {
            userId: verifiedUserId
        });
        const userProfile = await dbQueries.getUserProfileWithStats(verifiedUserId);
        
        if (!userProfile) {
            requestLogger.dbError('SELECT', 'user_profile_with_stats', new Error('User profile not found'), {
                userId: verifiedUserId
            });
            throw createApiError('Профиль пользователя не найден в базе данных.', 404);
        }
        
        const userDbId = userProfile.id;
        const currentCredits = userProfile.deep_analysis_credits || 0;
        const actualDreamCount = userProfile.total_analyses || 0;
        
        requestLogger.info("User profile retrieved", {
            userDbId,
            currentCredits,
            actualDreamCount
        });

        // 2. Проверить наличие кредитов для глубокого анализа
        if (currentCredits <= 0) {
            requestLogger.warn("Insufficient deep analysis credits", {
                userId: verifiedUserId,
                currentCredits
            });
            throw createApiError('Недостаточно кредитов для глубокого анализа. Приобретите кредит, нажав на кнопку "Получить анализ (1 ⭐️)".', 402);
        }

        // 3. Проверить количество снов ДО списания кредита
        if (actualDreamCount < REQUIRED_DREAMS) {
            requestLogger.warn("Insufficient dreams for deep analysis", {
                userDbId,
                actualDreamCount,
                requiredDreams: REQUIRED_DREAMS
            });
            throw createApiError(`Недостаточно снов для глубокого анализа. Нужно ${REQUIRED_DREAMS} снов, найдено ${actualDreamCount}. Пожалуйста, проанализируйте больше снов перед покупкой глубокого анализа.`, 400);
        }

        // 4. Атомарно списать один кредит глубокого анализа
        requestLogger.dbOperation('UPDATE', 'decrement_credits', null, null, {
            userId: verifiedUserId
        });
        const decrementResult = await dbQueries.decrementDeepAnalysisCredits(verifiedUserId);
        
        if (!decrementResult || !decrementResult.success) {
            requestLogger.dbError('UPDATE', 'decrement_credits', new Error('Failed to decrement credits'), {
                userId: verifiedUserId
            });
            throw createApiError('Ошибка при списании кредита глубокого анализа.', 500);
        }
        
        requestLogger.info("Deep analysis credit decremented", {
            userId: verifiedUserId,
            remainingCredits: decrementResult.remaining_credits
        });

        // 5. Получить последние N снов оптимизированным запросом
        requestLogger.dbOperation('SELECT', 'user_dreams', null, null, {
            userDbId,
            limit: REQUIRED_DREAMS
        });
        const dreams = await dbQueries.getUserDreams(userDbId, REQUIRED_DREAMS);

        if (!dreams || dreams.length === 0) {
            requestLogger.dbError('SELECT', 'user_dreams', new Error('No dreams found'), {
                userDbId
            });
            throw createApiError("Сны не найдены.", 404);
        }

        // 6. Объединить тексты снов
        const combinedDreamsText = dreams
            .map(d => d.dream_text.trim()) // Убираем лишние пробелы
            .reverse() // Переворачиваем, чтобы были от старого к новому для анализа динамики
            .join('\n\n--- СОН ---\n\n'); // Разделяем сны
        
        requestLogger.info("Dreams fetched and combined", {
            dreamsCount: dreams.length,
            combinedTextLength: combinedDreamsText.length
        });

        // 7. Вызвать Gemini для анализа
        const deepAnalysisResult = await getDeepGeminiAnalysis(null, combinedDreamsText);

        // 8. Вернуть успешный результат
        requestLogger.info("Deep analysis completed successfully", {
            userId: verifiedUserId,
            analysisLength: deepAnalysisResult ? deepAnalysisResult.length : 0
        });
        return createSuccessResponse({ analysis: deepAnalysisResult }, corsHeaders);
        
    } catch (error) {
        requestLogger.error("Deep analysis failed", {
            error: error.message,
            stack: error.stack,
            userId: verifiedUserId
        });
        throw error;
    }
}

// --- Exported Handler ---
exports.handler = wrapApiHandler(handleDeepAnalysis, {
    allowedMethods: 'POST',
    allowedOrigins: [ALLOWED_TMA_ORIGIN],
    requiredEnvVars: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'BOT_TOKEN', 'GEMINI_API_KEY', 'ALLOWED_TMA_ORIGIN']
});
