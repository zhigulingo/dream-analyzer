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
        const userId = ctx.from?.id;
        const chatId = ctx.chat.id;
        
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
        
        console.log(`[StartCommandHandler] User ${userId} in chat ${chatId}`);
        
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
                messageText = "Welcome back! 👋 Analyze dreams or visit your Personal Account.";
                buttonText = "Personal Account";
                buttonUrl = TMA_URL;
            } else if (startParam === 'weblogin') {
                // Handle weblogin parameter with direct link to web app login
                messageText = "🔐 Click the button below to log in to the web version.";
                buttonText = "Открыть веб-версию";
                buttonUrl = `${TMA_URL}/login`;
            } else {
                // Default message for new users
                messageText = `Hello! 👋 Dream Analyzer bot.

Press the button to get your <b>first free token</b> for subscribing!`;
                buttonText = "🎁 Open and claim token";
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
            await messageService.sendReply(ctx, `An error occurred while fetching user data (${error.message}). Please try again later.`);
        }
    };
}

module.exports = createStartCommandHandler;