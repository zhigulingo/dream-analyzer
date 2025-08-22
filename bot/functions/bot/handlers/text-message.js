// bot/functions/bot/handlers/text-message.js

/**
 * Handler for text messages (dream analysis)
 * @param {Object} userService - User service instance
 * @param {Object} messageService - Message service instance
 * @param {Object} analysisService - Analysis service instance
 * @param {string} TMA_URL - Telegram Mini App URL
 * @returns {Function} - Grammy handler function
 */
function createTextMessageHandler(userService, messageService, analysisService, TMA_URL) {
    return async (ctx) => {
        console.log("[TextMessageHandler] Received text message.");
        
        const dreamText = ctx.message.text;
        const userId = ctx.from?.id;
        const chatId = ctx.chat.id;
        const messageId = ctx.message.message_id;
        const updateId = ctx.update?.update_id;
        
        if (!userId || !chatId) {
            console.warn("[TextMessageHandler] No user/chat ID.");
            return;
        }
        
        // Ignore commands
        if (dreamText.startsWith('/')) {
            console.log(`[TextMessageHandler] Ignoring command.`);
            return;
        }
        
        console.log(`[TextMessageHandler] Processing dream for ${userId} (update ${updateId})`);

        // Basic idempotency + per-user rate limit & in-flight guard
        try {
            const cache = require('../../shared/services/cache-service');
            const idemKey = `bot:idem:update:${updateId}`;
            const rateKey = `bot:rate:text:${userId}`;
            const inflightKey = `bot:inflight:text:${userId}`;
            if (cache.get(idemKey)) {
                console.warn(`[TextMessageHandler] Duplicate update ${updateId} ignored.`);
                return;
            }
            // 1 запрос в 10 секунд на пользователя
            if (cache.get(rateKey)) {
                console.warn(`[TextMessageHandler] Rate limited user ${userId}.`);
                return;
            }
            if (cache.get(inflightKey)) {
                console.warn(`[TextMessageHandler] In-flight analysis exists for ${userId}, ignoring.`);
                return;
            }
            cache.set(idemKey, true, 2 * 60 * 1000); // 2 minutes TTL
            cache.set(rateKey, true, 10 * 1000); // 10 seconds
            cache.set(inflightKey, true, 60 * 1000); // 60 seconds safety
        } catch (e) {
            console.warn('[TextMessageHandler] Idempotency cache failed:', e?.message);
        }
        
        let statusMessage;
        
        try {
            // Delete user's message
            console.log(`[TextMessageHandler] Deleting user message ${messageId}`);
            await messageService.deleteMessage(chatId, messageId);
            
            // Send status message
            statusMessage = await messageService.sendStatusMessage(ctx, "Analyzing your dream... 🧠✨");
            if (!statusMessage) {
                throw new Error("Failed to send status message.");
            }
            
            // Get user data
            const userData = await userService.getOrCreateUser(userId);

            // Check token availability BEFORE any decrement
            console.log(`[TextMessageHandler] Checking token availability for ${userId}...`);
            const hasToken = await userService.hasAvailableToken(userId);
            if (!hasToken) {
                throw new Error("Insufficient tokens for analysis.");
            }

            // Perform analysis first; only decrement token on success
            await analysisService.analyzeDream(userData.id, userId, dreamText);

            // Decrement token now that analysis has succeeded
            console.log(`[TextMessageHandler] Decrementing token after successful analysis for ${userId}...`);
            const tokenDecremented = await userService.decrementTokenIfAvailable(userId);
            if (!tokenDecremented) {
                console.warn(`[TextMessageHandler] Token was not decremented post-success (possibly race condition).`);
            }
            
            // Delete status message
            console.log(`[TextMessageHandler] Deleting status message ${statusMessage.message_id}`);
            await messageService.deleteStatusMessage(chatId, statusMessage);
            
            console.log(`[TextMessageHandler] Analysis complete. Sending confirmation.`);
            
            // Send success message
            await messageService.sendReply(ctx, `Your dream analysis is ready and saved! ✨

See it in your history in the Personal Account.`, {
                reply_markup: messageService.createWebAppButton("Open Personal Account", TMA_URL)
            });
            
        } catch (error) {
            console.error(`[TextMessageHandler] Error processing dream for ${userId}:`, error);
            
            // Clean up status message if it exists
            if (statusMessage) {
                await messageService.deleteStatusMessage(chatId, statusMessage);
            }
            
            // Show error to user (do not decrement token on failure)
            await messageService.sendReply(ctx, `Произошла ошибка при анализе сна: ${error.message || 'Неизвестная ошибка'}. Попробуйте позже.`);
        }
        finally {
            try {
                const cache = require('../../shared/services/cache-service');
                const inflightKey = `bot:inflight:text:${userId}`;
                cache.delete(inflightKey);
            } catch (_) {}
        }
    };
}

module.exports = createTextMessageHandler;