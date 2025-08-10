// bot/functions/shared/services/gemini-service.js
// Единый сервис для работы с Gemini API

const { GoogleGenerativeAI } = require("@google/generative-ai");
const cacheService = require('./cache-service');

/**
 * Singleton сервис для работы с Gemini API
 * Включает retry mechanism, error handling и усовершенствованное кеширование
 */
class GeminiService {
    constructor() {
        this.genAI = null;
        this.model = null;
        this.isInitialized = false;
        this.initializationError = null;
        this.cache = cacheService; // Используем новый cache service
        this.cacheTimeout = 60 * 60 * 1000; // 1 час
        
        // Настройки retry
        this.maxRetries = 3;
        this.baseDelay = 1000; // 1 секунда
        
        // Лимиты
        this.MAX_DREAM_LENGTH = 4000;
        this.MODEL_NAME = "gemini-1.5-flash-latest";
    }

    /**
     * Инициализация сервиса (Singleton pattern)
     */
    async initialize() {
        if (this.isInitialized && this.model) {
            return this.model;
        }

        if (this.initializationError) {
            throw this.initializationError;
        }

        try {
            console.log("[GeminiService] Starting initialization...");
            
            const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
            if (!GEMINI_API_KEY) {
                throw new Error("GEMINI_API_KEY environment variable is not set");
            }

            this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            this.model = this.genAI.getGenerativeModel({ model: this.MODEL_NAME });
            this.isInitialized = true;
            
            console.log("[GeminiService] Initialization completed successfully");
            return this.model;
        } catch (error) {
            console.error("[GeminiService] Initialization failed:", error);
            this.initializationError = error;
            throw new Error(`Failed to initialize Gemini service: ${error.message}`);
        }
    }

    /**
     * Основной метод для анализа снов с retry mechanism
     */
    async analyzeDream(dreamText, promptKey = 'basic') {
        this._validateDreamText(dreamText);
        
        // Проверяем кеш
        const cacheKey = this._getCacheKey(dreamText, promptKey);
        const cachedResult = this.cache.get(cacheKey);
        if (cachedResult) {
            console.log("[GeminiService] Returning cached result");
            return cachedResult;
        }

        const model = await this.initialize();
        
        return this._retryAnalysis(async () => {
            const prompt = this._getPrompt(promptKey, dreamText);
            console.log("[GeminiService] Requesting analysis from Gemini...");
            
            const result = await model.generateContent(prompt);
            const response = await result.response;
            
            this._validateResponse(response);
            
            const analysisText = response.text();
            this._validateAnalysisText(analysisText);
            
            // Сохраняем в кеш с тегами для invalidation
            this.cache.setWithTags(cacheKey, analysisText, this.cacheTimeout, ['gemini', 'analysis', promptKey]);
            
            console.log("[GeminiService] Analysis completed successfully");
            return analysisText;
        });
    }

    /**
     * Специальный метод для глубокого анализа
     */
    async deepAnalyzeDreams(combinedDreams, promptKey = 'deep') {
        if (!combinedDreams || combinedDreams.trim().length === 0) {
            throw new Error("No dream text provided for deep analysis");
        }

        const cacheKey = this._getCacheKey(combinedDreams, promptKey);
        const cachedResult = this.cache.get(cacheKey);
        if (cachedResult) {
            console.log("[GeminiService] Returning cached deep analysis result");
            return cachedResult;
        }

        const model = await this.initialize();
        
        return this._retryAnalysis(async () => {
            const prompt = this._getPrompt(promptKey, combinedDreams);
            console.log("[GeminiService] Requesting deep analysis from Gemini...");
            
            const result = await model.generateContent(prompt);
            const response = await result.response;
            
            this._validateResponse(response);
            
            const analysisText = response.text();
            this._validateAnalysisText(analysisText);
            
            // Сохраняем в кеш с тегами для invalidation
            this.cache.setWithTags(cacheKey, analysisText, this.cacheTimeout * 2, ['gemini', promptKey === 'deep' ? 'deep-analysis' : promptKey]);
            
            console.log("[GeminiService] Deep analysis completed successfully");
            return analysisText;
        });
    }

    /**
     * JSON-structured versions that parse and validate JSON
     */
    async analyzeDreamJSON(dreamText) {
        const raw = await this.analyzeDream(dreamText, 'basic_json');
        return this._parseStructuredJson(raw, 'basic_json');
    }

    async deepAnalyzeDreamsJSON(combinedDreams) {
        const raw = await this.deepAnalyzeDreams(combinedDreams, 'deep_json');
        return this._parseStructuredJson(raw, 'deep_json');
    }

    _parseStructuredJson(rawText, mode) {
        try {
            // Trim potential code fences/markdown just in case
            let cleaned = String(rawText).trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
            let obj;
            try {
                obj = JSON.parse(cleaned);
            } catch (e1) {
                // Try to extract JSON substring between first { and last }
                const start = cleaned.indexOf('{');
                const end = cleaned.lastIndexOf('}');
                if (start !== -1 && end !== -1 && end > start) {
                    const candidate = cleaned.slice(start, end + 1);
                    obj = JSON.parse(candidate);
                } else {
                    throw e1;
                }
            }
            if (!obj || typeof obj !== 'object') throw new Error('Not an object');
            if (typeof obj.title !== 'string' || !Array.isArray(obj.tags) || typeof obj.analysis !== 'string') {
                throw new Error('Missing required fields');
            }
            obj.tags = obj.tags.slice(0, 5).map(t => String(t).trim()).filter(Boolean);
            obj.title = obj.title.trim().replace(/[\p{P}\p{S}]/gu, '').slice(0, 60);
            return obj;
        } catch (e) {
            console.warn(`[GeminiService] Failed to parse ${mode} JSON, attempting repair.`, e?.message);
            try {
                const repairPrompt = this._getPrompt('repair_json', rawText);
                const model = this.model || await this.initialize();
                const result = await model.generateContent(repairPrompt);
                const response = await result.response;
                const repaired = response.text();
                const obj = JSON.parse(repaired);
                if (typeof obj.title === 'string' && Array.isArray(obj.tags) && typeof obj.analysis === 'string') {
                    return obj;
                }
            } catch (e2) {
                console.warn('[GeminiService] Repair failed, returning raw text.', e2?.message);
            }
            return { title: '', tags: [], analysis: rawText };
        }
    }

    /**
     * Retry mechanism с exponential backoff
     */
    async _retryAnalysis(analysisFunction) {
        let lastError;
        
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                return await analysisFunction();
            } catch (error) {
                lastError = error;
                console.warn(`[GeminiService] Attempt ${attempt} failed:`, error.message);
                
                // Не повторяем для некоторых типов ошибок
                if (this._shouldNotRetry(error)) {
                    break;
                }
                
                // Ждем перед следующей попыткой (exponential backoff)
                if (attempt < this.maxRetries) {
                    const delay = this.baseDelay * Math.pow(2, attempt - 1);
                    console.log(`[GeminiService] Waiting ${delay}ms before retry...`);
                    await this._sleep(delay);
                }
            }
        }
        
        // Обрабатываем финальную ошибку
        throw this._processError(lastError);
    }

    /**
     * Получение промпта по ключу
     */
    _getPrompt(promptKey, dreamText) {
        const prompts = require('../prompts/dream-prompts');
        return prompts.getPrompt(promptKey, dreamText);
    }

    /**
     * Валидация текста сновидения
     */
    _validateDreamText(dreamText) {
        if (!dreamText || dreamText.trim().length === 0) {
            throw new Error("Empty dream text");
        }
        if (dreamText.length > this.MAX_DREAM_LENGTH) {
            throw new Error(`Dream too long (> ${this.MAX_DREAM_LENGTH} chars)`);
        }
    }

    /**
     * Валидация ответа от Gemini
     */
    _validateResponse(response) {
        if (response.promptFeedback?.blockReason) {
            throw new Error(`Analysis blocked (${response.promptFeedback.blockReason})`);
        }
    }

    /**
     * Валидация текста анализа
     */
    _validateAnalysisText(analysisText) {
        if (!analysisText || analysisText.trim().length === 0) {
            throw new Error("Empty response from analysis service");
        }
    }

    /**
     * Определяет, стоит ли повторять запрос при ошибке
     */
    _shouldNotRetry(error) {
        const message = error.message?.toLowerCase() || '';
        return (
            message.includes('api key not valid') ||
            message.includes('blocked') ||
            message.includes('empty dream text') ||
            message.includes('dream too long')
        );
    }

    /**
     * Обработка ошибок с детализированными сообщениями
     */
    _processError(error) {
        const message = error.message || '';
        
        if (message.includes('API key not valid')) {
            return new Error('Invalid Gemini API key');
        }
        if (error.status === 404 || message.includes('404') || message.includes('is not found')) {
            return new Error('Gemini model not found');
        }
        if (message.includes('quota')) {
            return new Error('Gemini API quota exceeded');
        }
        if (message.includes('blocked')) {
            return new Error(`Analysis blocked: ${message}`);
        }
        
        return new Error(`Error communicating with analysis service: ${message}`);
    }

    /**
     * Генерация ключа для кеша
     */
    _getCacheKey(dreamText, promptKey) {
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256').update(dreamText).digest('hex');
        return `gemini:${promptKey}:${hash}`;
    }

    /**
     * Инвалидация кеша по типу анализа
     */
    invalidateCache(type = 'all') {
        console.log(`[GeminiService] Invalidating cache: ${type}`);
        
        switch (type) {
            case 'all':
                return this.cache.invalidateTag('gemini');
            case 'basic':
                return this.cache.invalidateTag('basic');
            case 'deep':
                return this.cache.invalidateTag('deep-analysis');
            default:
                return this.cache.invalidatePattern(`gemini:${type}:*`);
        }
    }

    /**
     * Предзагрузка популярных анализов (Cache Warming)
     */
    async warmCache() {
        console.log('[GeminiService] Starting cache warming...');
        
        const warmingFunction = async (key) => {
            // Парсим ключ для получения данных
            const keyParts = key.split(':');
            if (keyParts.length >= 3) {
                const promptKey = keyParts[1];
                const dreamHash = keyParts[2];
                
                // Здесь можно было бы получить оригинальный dreamText из базы
                // и пересчитать анализ, но это требует дополнительной логики
                console.log(`[GeminiService] Would warm key: ${key}`);
            }
        };
        
        await this.cache.warmCache(warmingFunction);
    }

    /**
     * Утилита для задержки
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Получение расширенной статистики кеша
     */
    getCacheStats() {
        const cacheInfo = this.cache.info();
        return {
            ...cacheInfo,
            isInitialized: this.isInitialized,
            modelName: this.MODEL_NAME,
            cacheTimeout: this.cacheTimeout,
            gemini_specific: {
                analysis_keys: this.cache.keys('gemini:basic:*').length,
                deep_analysis_keys: this.cache.keys('gemini:deep:*').length
            }
        };
    }

    /**
     * Очистка всего кеша Gemini
     */
    clearCache() {
        const cleared = this.cache.invalidateTag('gemini');
        console.log(`[GeminiService] Cache cleared: ${cleared} items`);
        return cleared;
    }
}

// Экспортируем singleton instance
const geminiService = new GeminiService();
module.exports = geminiService;