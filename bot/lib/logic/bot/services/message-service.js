// bot/functions/bot/services/message-service.js

class MessageService {
    constructor(botApi) {
        this.api = botApi;
    }

    /**
     * Logs reply errors
     * @param {Error} error - Error to log
     */
    logReplyError(error) {
        console.error("[MessageService Reply Error]", error instanceof Error ? error.message : error);
    }

    /**
     * Safely sends a reply message
     * @param {Object} ctx - Grammy context
     * @param {string} text - Message text
     * @param {Object} options - Reply options
     * @returns {Promise<Object|null>} - Sent message or null if failed
     */
    async sendReply(ctx, text, options = {}) {
        try {
            return await ctx.reply(text, options);
        } catch (error) {
            this.logReplyError(error);
            return null;
        }
    }

    /**
     * Safely deletes a message
     * @param {number} chatId - Chat ID
     * @param {number} messageId - Message ID to delete
     * @returns {Promise<boolean>} - Whether deletion was successful
     */
    async deleteMessage(chatId, messageId) {
        try {
            await this.api.deleteMessage(chatId, messageId);
            console.log(`[MessageService] Deleted message ${messageId} in chat ${chatId}`);
            return true;
        } catch (error) {
            console.warn(`[MessageService] Failed to delete message ${messageId}:`, error);
            return false;
        }
    }

    /**
     * Creates inline keyboard with web app button
     * @param {string} buttonText - Button text
     * @param {string} url - Web app URL
     * @returns {Object} - Inline keyboard markup
     */
    createWebAppButton(buttonText, url) {
        return {
            inline_keyboard: [[{
                text: buttonText,
                web_app: { url }
            }]]
        };
    }

    /**
     * Sends status message and returns it for later deletion
     * @param {Object} ctx - Grammy context
     * @param {string} statusText - Status message text
     * @returns {Promise<Object|null>} - Status message or null if failed
     */
    async sendStatusMessage(ctx, statusText) {
        return await this.sendReply(ctx, statusText);
    }

    /**
     * Deletes status message if it exists
     * @param {number} chatId - Chat ID
     * @param {Object|null} statusMessage - Status message object
     */
    async deleteStatusMessage(chatId, statusMessage) {
        if (statusMessage) {
            await this.deleteMessage(chatId, statusMessage.message_id);
        }
    }
}

module.exports = MessageService;