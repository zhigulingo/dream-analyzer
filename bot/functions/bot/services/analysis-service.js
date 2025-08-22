// bot/functions/bot/services/analysis-service.js

const geminiService = require("../../shared/services/gemini-service");

function withTimeout(promise, ms, label = 'operation') {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`${label} timeout`));
        }, ms);
        promise
            .then((value) => { clearTimeout(timer); resolve(value); })
            .catch((error) => { clearTimeout(timer); reject(error); });
    });
}

class AnalysisService {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
    }

    /**
     * Gets analysis from Gemini service
     * @param {string} dreamText - Dream text to analyze
     * @returns {Promise<string>} - Analysis result
     */
    async getGeminiAnalysis(dreamText) {
        console.log("[AnalysisService] Getting analysis from unified Gemini service (basic_meta).");
        // Один целевой промпт без каскада фолбэков, чтобы не распылять квоту
        return await geminiService.analyzeDream(dreamText, 'basic_meta');
    }

    /**
     * Performs complete dream analysis process
     * @param {number} userDbId - User database ID
     * @param {number} tgUserId - Telegram user ID
     * @param {string} dreamText - Dream text to analyze
     * @returns {Promise<void>}
     */
    async analyzeDream(userDbId, tgUserId, dreamText) {
        console.log("[AnalysisService] Starting dream analysis process.");
        
        try {
            // Get analysis from Gemini
            console.log(`[AnalysisService] Requesting analysis...`);
            let analysisResultText = await withTimeout(this.getGeminiAnalysis(dreamText), 8000, 'gemini analysis');
            if (!analysisResultText || analysisResultText.includes('Краткий анализ временно недоступен')) {
                throw new Error('Analysis service temporarily unavailable');
            }
            console.log(`[AnalysisService] Analysis received successfully.`);

            // Save result to DB
            console.log(`[AnalysisService] Saving analysis to DB for user ${userDbId}...`);
            // Try parse inline metadata lines if present
            let title = null; let tags = [];
            if (typeof analysisResultText === 'string') {
                const lines = analysisResultText.split(/\r?\n/);
                for (let i = lines.length - 1; i >= 0; i--) {
                    const line = lines[i].trim();
                    if (!line) continue;
                    if (!tags.length && /^Теги\s*:/i.test(line)) {
                        const after = line.replace(/^Теги\s*:/i, '').trim();
                        tags = after.split(',').map(s => s.trim()).filter(Boolean).slice(0,5);
                        lines.splice(i, 1);
                        continue;
                    }
                    if (!title && /^Заголовок\s*:/i.test(line)) {
                        title = line.replace(/^Заголовок\s*:/i, '').trim().replace(/[\p{P}\p{S}]/gu, '').slice(0,60);
                        lines.splice(i, 1);
                        continue;
                    }
                    if (title && tags.length) break;
                }
                // cleaned analysis text
                analysisResultText = lines.join('\n').trim();
            }

            const { error: insertError } = await this.supabase
                .from('analyses')
                .insert({
                    user_id: userDbId,
                    dream_text: dreamText,
                    analysis: analysisResultText,
                    deep_source: { title: title || null, tags }
                });
                
            if (insertError) {
                throw new Error(`Error saving analysis: ${insertError.message}`);
            }
            
            console.log(`[AnalysisService] Analysis saved successfully.`);

            // Попытаться выдать бесплатный кредит глубокого анализа,
            // если пользователь впервые достиг 5 снов
            try {
                await this.supabase.rpc('grant_free_deep_if_eligible', { user_tg_id: tgUserId });
            } catch (e) {
                console.warn('[AnalysisService] grant_free_deep_if_eligible RPC failed or not available:', e?.message);
            }

        } catch (error) {
            console.error(`[AnalysisService] FAILED for user ${tgUserId}: ${error.message}`);
            throw error;
        }
    }
}

module.exports = AnalysisService;