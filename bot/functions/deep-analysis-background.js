// bot/functions/deep-analysis-background.js
// Background function for deep dream analysis (long-running Gemini operations)

const { createClient } = require('@supabase/supabase-js');
const geminiService = require('./shared/services/gemini-service');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOT_TOKEN = process.env.BOT_TOKEN;
const TMA_URL = process.env.TMA_URL || process.env.ALLOWED_TMA_ORIGIN || 'https://dream-analyzer.netlify.app';

async function sendTelegramMessage(chatId, text, replyMarkup) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const body = { chat_id: chatId, text, parse_mode: 'HTML' };
    if (replyMarkup) body.reply_markup = replyMarkup;
    const res = await fetch(url, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(body) 
    });
    if (!res.ok) {
        const t = await res.text().catch(() => '');
        console.warn('[deep-analysis-background] Failed to send message', res.status, t);
    }
}

exports.handler = async (event) => {
    if (String(process.env.BOT_PAUSED || 'true').toLowerCase() === 'true') {
        return { statusCode: 202, body: 'Paused' };
    }

    try {
        if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !BOT_TOKEN) {
            console.error('[deep-analysis-background] Missing required env vars');
            return { statusCode: 500, body: 'Missing env' };
        }

        const { tgUserId, userDbId, chatId, combinedDreamsText, requiredDreams, usedFree } = JSON.parse(event.body || '{}');
        
        if (!tgUserId || !userDbId || !chatId || !combinedDreamsText) {
            console.error('[deep-analysis-background] Missing required parameters');
            return { statusCode: 400, body: 'Bad request' };
        }

        console.log('[deep-analysis-background] Starting deep analysis', {
            tgUserId,
            userDbId,
            dreamsTextLength: combinedDreamsText.length,
            requiredDreams
        });

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { 
            auth: { autoRefreshToken: false, persistSession: false } 
        });

        // Run Gemini deep analysis with full deep_json prompt
        let deepAnalysisResultJson;
        try {
            console.log('[deep-analysis-background] Calling Gemini for deep analysis...');
            deepAnalysisResultJson = await geminiService.deepAnalyzeDreamsJSON(combinedDreamsText, false); // useFast=false for full analysis
            console.log('[deep-analysis-background] Gemini analysis completed successfully');
        } catch (geminiError) {
            console.error('[deep-analysis-background] Gemini analysis failed', {
                error: geminiError?.message,
                userId: tgUserId
            });
            
            // ROLLBACK: Return credit to user
            try {
                if (usedFree) {
                    await supabase.rpc('restore_free_deep_credit', { user_tg_id: tgUserId });
                } else {
                    await supabase.rpc('increment_deep_analysis_credits', { 
                        user_tg_id: tgUserId,
                        amount: 1
                    });
                }
                console.log('[deep-analysis-background] Credit rolled back successfully', { userId: tgUserId });
            } catch (rollbackError) {
                console.error('[deep-analysis-background] Failed to rollback credit', {
                    error: rollbackError?.message,
                    userId: tgUserId
                });
            }
            
            // Notify user about error
            await sendTelegramMessage(
                chatId, 
                '❌ <b>Ошибка глубокого анализа</b>\n\nНе удалось выполнить анализ. Ваш токен возвращен. Пожалуйста, попробуйте позже.'
            );
            
            return { statusCode: 202, body: 'Gemini error, credit rolled back' };
        }

        // Save deep analysis result to database
        try {
            const deepShortTitle = deepAnalysisResultJson.title && deepAnalysisResultJson.title.trim() 
                ? deepAnalysisResultJson.title 
                : 'Глубокий анализ';
            const deepTags = Array.isArray(deepAnalysisResultJson.tags) && deepAnalysisResultJson.tags.length > 0 
                ? deepAnalysisResultJson.tags 
                : [];
            
            // Prepare deep_source with all structured data
            const deepSource = { 
                required_dreams: requiredDreams, 
                title: deepShortTitle,
                tags: deepTags
            };
            
            // Add new structured fields if present
            if (deepAnalysisResultJson.overallContext) {
                deepSource.overallContext = deepAnalysisResultJson.overallContext;
            }
            if (Array.isArray(deepAnalysisResultJson.recurringSymbols)) {
                deepSource.recurringSymbols = deepAnalysisResultJson.recurringSymbols;
            }
            if (Array.isArray(deepAnalysisResultJson.dynamics)) {
                deepSource.dynamics = deepAnalysisResultJson.dynamics;
            }
            if (Array.isArray(deepAnalysisResultJson.conclusions)) {
                deepSource.conclusions = deepAnalysisResultJson.conclusions;
            }
            if (Array.isArray(deepAnalysisResultJson.recommendations)) {
                deepSource.recommendations = deepAnalysisResultJson.recommendations;
            }
            
            // Use analysis field or create fallback
            const analysisText = deepAnalysisResultJson.analysis || 'Глубокий анализ выполнен';
            
            const { error: insertDeepError } = await supabase
                .from('analyses')
                .insert({ 
                    user_id: userDbId, 
                    dream_text: '[DEEP_ANALYSIS_SOURCE]',
                    analysis: analysisText,
                    is_deep_analysis: true,
                    deep_source: deepSource
                });
                
            if (insertDeepError) {
                console.error('[deep-analysis-background] Failed to save analysis', {
                    error: insertDeepError?.message,
                    userDbId
                });
                throw insertDeepError;
            }
            
            console.log('[deep-analysis-background] Deep analysis saved successfully', { userDbId });
        } catch (saveError) {
            console.error('[deep-analysis-background] Error saving analysis', {
                error: saveError?.message,
                userDbId
            });
            
            // Notify user about save error
            await sendTelegramMessage(
                chatId, 
                '❌ <b>Ошибка сохранения</b>\n\nАнализ выполнен, но не удалось сохранить результат. Пожалуйста, обратитесь в поддержку.'
            );
            
            return { statusCode: 202, body: 'Save error' };
        }

        // Notify user about successful completion
        try {
            const replyMarkup = {
                inline_keyboard: [[
                    { text: '✨ Открыть глубокий анализ', web_app: { url: `${TMA_URL}#deep-analysis` } }
                ]]
            };
            
            await sendTelegramMessage(
                chatId, 
                '✨ <b>Глубокий анализ готов!</b>\n\nВаш персональный анализ успешно выполнен. Откройте приложение для просмотра результатов.',
                replyMarkup
            );
            
            console.log('[deep-analysis-background] User notified successfully', { tgUserId });
        } catch (notifyError) {
            console.warn('[deep-analysis-background] Failed to notify user', {
                error: notifyError?.message,
                tgUserId
            });
        }

        return { statusCode: 202, body: 'Deep analysis completed successfully' };
        
    } catch (error) {
        console.error('[deep-analysis-background] Fatal error', {
            error: error.message,
            stack: error.stack
        });
        
        // Try to notify user about fatal error
        try {
            const body = JSON.parse(event.body || '{}');
            const { chatId } = body;
            if (chatId) {
                await sendTelegramMessage(
                    chatId, 
                    '❌ <b>Системная ошибка</b>\n\nПроизошла непредвиденная ошибка. Пожалуйста, обратитесь в поддержку.'
                );
            }
        } catch (_) {}
        
        return { statusCode: 202, body: 'Fatal error' };
    }
};
