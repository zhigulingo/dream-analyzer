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
     * Упрощённый промпт с метаданными (заголовок и теги в конце ответа)
     * Возвращает структурированный текст анализа с подзаголовками
     */
    basic_meta: `Ты — эмпатичный аналитик снов, объединяющий научный подход с психологическими школами. Проанализируй сон на русском языке, соблюдая конфиденциальность и избегая диагнозов.

Сон (русский текст + опциональный контекст ниже): "[DREAM_TEXT]"

Инструкции:
- Если ниже есть раздел "Дополнительный контекст (символы, архетипы, статистика):", используй его для углубления интерпретации. Явно свяжи 1-2 ключевые идеи из контекста с символами сна.
- Избегай предсказаний и медицинских диагнозов.

Структура ответа:

1. **Архетипическая история** (~300 символов)
Напиши небольшую образную историю-метафору, которая отражает суть сна через архетипический сюжет. Используй поэтичный язык.

2. **Возможная функция сна**
Кратко объясни, какую психологическую задачу может выполнять этот сон (обработка эмоций, интеграция опыта, проработка конфликта и т.д.)

3. **Психологические трактовки**
Предложи 2-3 возможных интерпретации как гипотезы (не как диагноз). Опирайся на символы из контекста, если они есть. Упоминай подходы (Фрейд, Юнг, современная психология сновидений), если релевантно.

4. **Эмпирический слой**
Опиши сон через призму современной науки о снах: частые мотивы (Hall/Van de Castle, DreamBank), эмоциональную окраску, связь с реальностью сновидца (осторожно, на основе содержания сна).

В самом конце добавь ДВЕ отдельные строки с метаданными (без markdown):
Заголовок: <2–3 слова, без знаков препинания>
Теги: <3–5 коротких тегов (1–3 слова каждый), через запятую, без # и спецсимволов>`,

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
    symbolic: `You are a dream symbol interpreter. Focus specifically on symbols and their meanings in this dream: "[DREAM_TEXT]". List the main symbols and explain their possible interpretations. Be gentle and supportive.`,

    /**
     * JSON-structured output for a single dream analysis
     * Response MUST be pure JSON with keys: title (2-3 words), tags (3-5 short strings), analysis (string)
     */
    basic_json: `You are an empathetic dream interpreter. Analyze this dream and return STRICTLY a JSON object with the following exact fields and types:
{
  "title": string,   // 2-3 words concise title in Russian (no punctuation)
  "tags": string[],  // 3-5 concise tags in Russian: key symbols or archetypes (each 1-3 words, no '#')
  "analysis": string // 2-4 short paragraphs of supportive analysis in Russian
}

Dream (Russian): "[DREAM_TEXT]"

Rules:
- Answer ONLY with valid JSON, no markdown, no comments, no preface.
- Keep title concise and meaningful.
- Tags should be lowercase or title case words without special characters.
- Keep analysis supportive and non-clinical.`,

    /**
     * JSON-structured output for deep analysis of multiple dreams
     */
    deep_json: `Ты — эмпатичный аналитик снов. Проанализируй серию снов и верни СТРОГО JSON с полями:
{
  "title": string,   // 2-3 слова: краткий смысл серии
  "tags": string[],  // 3-5 ключевых символов/архетипов (1-3 слова каждый)
  "analysis": string // 3-6 абзацев: паттерны, темы, эмоции, общий вывод
}

Сны (разделены '--- СОН ---'):
"""
[DREAM_TEXT]
"""

Правила:
- Верни только валидный JSON без форматирования и пояснений.
- Заголовок максимально короткий и ёмкий.
- Теги без спецсимволов и '#'.`
,

    /**
     * Repair: convert any text to valid JSON per schema
     */
    repair_json: `Convert the following text into STRICTLY valid JSON with EXACT fields:
{
  "title": string,   // 2-3 Russian words (no punctuation)
  "tags": string[],  // 3-5 Russian tags (1-3 words each, no '#')
  "analysis": string // Russian analysis text
}

Text:
"""
[DREAM_TEXT]
"""

Rules:
- Output ONLY JSON, no markdown, no comments.
- If information is missing, infer best possible based on the text.`
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