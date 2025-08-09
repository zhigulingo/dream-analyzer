// bot/functions/bot/services/analysis-service.js

const geminiService = require("../../shared/services/gemini-service");

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
        console.log("[AnalysisService] Getting analysis from unified Gemini service.");
        try {
            return await geminiService.analyzeDream(dreamText, 'basic');
        } catch (error) {
            console.error("[AnalysisService] Error from Gemini service:", error);
            throw error;
        }
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
            const analysisResultText = await this.getGeminiAnalysis(dreamText);
            console.log(`[AnalysisService] Analysis received successfully.`);

            // Save result to DB
            console.log(`[AnalysisService] Saving analysis to DB for user ${userDbId}...`);
            const { error: insertError } = await this.supabase
                .from('analyses')
                .insert({
                    user_id: userDbId,
                    dream_text: dreamText,
                    analysis: analysisResultText
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