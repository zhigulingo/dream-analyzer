// bot/functions/bot/handlers/start-command.js

/**
 * Handler for /start command
 * @param {Object} userService - User service instance
 * @param {Object} messageService - Message service instance
 * @param {string} TMA_URL - Telegram Mini App URL
 * @returns {Function} - Grammy handler function
 */
function createStartCommandHandler(userService, messageService, TMA_URL) {
    return async (ctx) => {
        console.log("[StartCommandHandler] Command received.");
        const messages = require('../../shared/services/messages-service');
        const userId = ctx.from?.id;
        const chatId = ctx.chat.id;
        const updateId = ctx.update?.update_id;
        
        // Extract startParam from /start command, if present
        let startParam;
        if (ctx.message && ctx.message.text) {
            const parts = ctx.message.text.split(' ');
            if (parts.length > 1) {
                startParam = parts[1];
            }
        }
        
        if (!userId || !chatId) {
            console.warn("[StartCommandHandler] No user ID or chat ID.");
            return;
        }
        
        console.log(`[StartCommandHandler] User ${userId} in chat ${chatId} (update ${updateId})`);

        // Idempotency by update_id + debounce per user
        try {
            const cache = require('../../shared/services/cache-service');
            const idemKey = `bot:idem:update:${updateId}`;
            const debounceKey = `bot:debounce:start:${userId}`;
            if (cache.get(idemKey)) {
                console.warn(`[StartCommandHandler] Duplicate update ${updateId} ignored.`);
                return;
            }
            // If we've recently sent a welcome, skip re-sending entirely
            if (cache.get(debounceKey)) {
                console.warn(`[StartCommandHandler] Debounced /start for user ${userId}.`);
                return;
            }
            cache.set(idemKey, true, 2 * 60 * 1000); // 2 minutes
            cache.set(debounceKey, true, 5 * 60 * 1000); // 5 minutes
        } catch (e) {
            console.warn('[StartCommandHandler] Idempotency/debounce cache failed:', e?.message);
        }
        
        try {
            const userData = await userService.getOrCreateUser(userId);
            console.log(`[StartCommandHandler] User data received: ID=${userData.id}, Claimed=${userData.claimed}, LastMsgId=${userData.lastMessageId}`);
            
            // Delete previous message if exists
            if (userData.lastMessageId) {
                await messageService.deleteMessage(chatId, userData.lastMessageId);
            }
            
            // Determine message text and button based on user state
            let messageText, buttonText, buttonUrl;
            
            if (userData.claimed) {
                messageText = messages.get('start.returning');
                buttonText = messages.get('buttons.open_account');
                buttonUrl = TMA_URL;
            } else if (startParam === 'weblogin') {
                messageText = messages.get('start.weblogin');
                buttonText = messages.get('buttons.open_web');
                buttonUrl = `${TMA_URL}/login`;
            } else {
                messageText = messages.get('start.new_user');
                buttonText = messages.get('buttons.claim_reward');
                buttonUrl = `${TMA_URL}?action=claim_reward`;
            }
            
            // Send new message
            console.log(`[StartCommandHandler] Sending new message (Claimed: ${userData.claimed})`);
            const sentMessage = await messageService.sendReply(ctx, messageText, {
                parse_mode: 'HTML',
                reply_markup: messageService.createWebAppButton(buttonText, buttonUrl)
            });
            
            if (!sentMessage) {
                throw new Error("Failed to send start message");
            }
            
            // Save new message ID
            await userService.updateLastStartMessageId(userData.id, sentMessage.message_id);
            console.log(`[StartCommandHandler] Updated last_start_message_id to ${sentMessage.message_id}.`);
            
        } catch (error) {
            console.error("[StartCommandHandler] CRITICAL Error:", error.message);
            await messageService.sendReply(ctx, messages.get('start.profile_error', { error: error.message }));
        }
    };
}

module.exports = createStartCommandHandler;