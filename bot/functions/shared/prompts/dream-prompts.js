// bot/functions/shared/prompts/dream-prompts.js
// Централизованное хранение всех промптов для анализа снов

/**
 * Константы для настройки анализа
 */
const REQUIRED_DREAMS = 5;

/**
 * Промпты для различных типов анализа
 */
const PROMPTS = {
    /**
     * Базовый промпт для анализа одного сновидения
     */
    basic: `You are an empathetic dream interpreter. Analyze the dream, maintaining confidentiality, avoiding medical diagnoses/predictions. Dream: "[DREAM_TEXT]". Analysis (2-4 paragraphs): 1. Symbols/meanings. 2. Emotions/connection to reality (if applicable). 3. Themes/messages. Respond softly, supportively.`,

    /**
     * Промпт для глубокого анализа серии снов
     */
    deep: `Ты — опытный психоаналитик и толкователь снов, специализирующийся на поиске закономерностей и глубинных тем. Проанализируй ПОСЛЕДОВАТЕЛЬНОСТЬ из ${REQUIRED_DREAMS} недавних снов пользователя. Ищи:
1.  **Повторяющиеся символы/образы:** Что они могут означать в контексте серии снов?
2.  **Общие темы или сюжеты:** Есть ли сквозная линия или проблема?
3.  **Эмоциональная динамика:** Меняются ли эмоции от сна к сну? Есть ли прогресс или зацикливание?
4.  **Возможные связи с реальностью:** На какие аспекты жизни пользователя могут указывать эти сны (очень осторожно, без диагнозов)?
5.  **Общее послание или вывод:** Какой главный урок или сообщение несет эта серия снов?

Отвечай эмпатично, структурированно (можно по пунктам), избегая прямых предсказаний и медицинских диагнозов. Сохраняй конфиденциальность.

Сны пользователя (разделены '--- СОН ---'):
"""
[DREAM_TEXT]
"""

Твой глубокий анализ:`,

    /**
     * Промпт для краткого анализа (если нужен будет в будущем)
     */
    brief: `You are an empathetic dream interpreter. Provide a brief analysis of this dream in 1-2 paragraphs. Dream: "[DREAM_TEXT]". Focus on main symbols and emotions. Be supportive and gentle.`,

    /**
     * Промпт для символического анализа (если нужен будет в будущем)
     */
    symbolic: `You are a dream symbol interpreter. Focus specifically on symbols and their meanings in this dream: "[DREAM_TEXT]". List the main symbols and explain their possible interpretations. Be gentle and supportive.`
};

/**
 * Класс для работы с промптами
 */
class DreamPromptsManager {
    /**
     * Получить промпт по ключу с подстановкой текста сновидения
     * @param {string} promptKey - Ключ промпта ('basic', 'deep', 'brief', 'symbolic')
     * @param {string} dreamText - Текст сновидения для подстановки
     * @returns {string} Готовый промпт
     */
    static getPrompt(promptKey, dreamText) {
        const prompt = PROMPTS[promptKey];
        if (!prompt) {
            throw new Error(`Unknown prompt key: ${promptKey}`);
        }

        return prompt.replace(/\[DREAM_TEXT\]/g, dreamText);
    }

    /**
     * Получить список доступных промптов
     * @returns {string[]} Массив ключей промптов
     */
    static getAvailablePrompts() {
        return Object.keys(PROMPTS);
    }

    /**
     * Получить промпт без подстановки (для отладки)
     * @param {string} promptKey - Ключ промпта
     * @returns {string} Исходный промпт
     */
    static getRawPrompt(promptKey) {
        const prompt = PROMPTS[promptKey];
        if (!prompt) {
            throw new Error(`Unknown prompt key: ${promptKey}`);
        }
        return prompt;
    }

    /**
     * Добавить новый промпт (для расширения в будущем)
     * @param {string} key - Ключ нового промпта
     * @param {string} template - Шаблон промпта с [DREAM_TEXT] placeholder
     */
    static addPrompt(key, template) {
        if (PROMPTS[key]) {
            console.warn(`[DreamPromptsManager] Overwriting existing prompt: ${key}`);
        }
        PROMPTS[key] = template;
    }

    /**
     * Валидация промпта
     * @param {string} promptKey - Ключ промпта для валидации
     * @param {string} dreamText - Текст для проверки длины
     * @returns {boolean} true если промпт валиден
     */
    static validatePrompt(promptKey, dreamText) {
        if (!PROMPTS[promptKey]) {
            throw new Error(`Unknown prompt key: ${promptKey}`);
        }

        if (!dreamText || dreamText.trim().length === 0) {
            throw new Error("Empty dream text provided");
        }

        const finalPrompt = this.getPrompt(promptKey, dreamText);
        
        // Проверяем, что длина финального промпта не слишком велика
        if (finalPrompt.length > 10000) {
            console.warn(`[DreamPromptsManager] Warning: Generated prompt is very long (${finalPrompt.length} chars)`);
        }

        return true;
    }
}

// Экспортируем константы и менеджер
module.exports = {
    DreamPromptsManager,
    REQUIRED_DREAMS,
    // Для обратной совместимости экспортируем основной метод
    getPrompt: DreamPromptsManager.getPrompt.bind(DreamPromptsManager),
    getAvailablePrompts: DreamPromptsManager.getAvailablePrompts.bind(DreamPromptsManager),
    getRawPrompt: DreamPromptsManager.getRawPrompt.bind(DreamPromptsManager),
    validatePrompt: DreamPromptsManager.validatePrompt.bind(DreamPromptsManager)
};