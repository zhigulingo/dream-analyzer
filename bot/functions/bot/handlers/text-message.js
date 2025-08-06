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
        
        if (!userId || !chatId) {
            console.warn("[TextMessageHandler] No user/chat ID.");
            return;
        }
        
        // Ignore commands
        if (dreamText.startsWith('/')) {
            console.log(`[TextMessageHandler] Ignoring command.`);
            return;
        }
        
        console.log(`[TextMessageHandler] Processing dream for ${userId}`);
        
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
            
            // Check and decrement token
            console.log(`[TextMessageHandler] Checking/decrementing token for ${userId}...`);
            const tokenDecremented = await userService.decrementTokenIfAvailable(userId);
            if (!tokenDecremented) {
                throw new Error("Insufficient tokens for analysis.");
            }
            console.log(`[TextMessageHandler] Token decremented for user ${userId}.`);
            
            // Perform analysis
            await analysisService.analyzeDream(userData.id, userId, dreamText);
            
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
            
            // Show error to user
            await messageService.sendReply(ctx, `An error occurred: ${error.message || 'Unknown error'}`);
        }
    };
}

module.exports = createTextMessageHandler;