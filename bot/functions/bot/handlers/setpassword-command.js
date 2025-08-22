// bot/functions/bot/handlers/setpassword-command.js

const crypto = require('crypto');
const util = require('util');
const scryptAsync = util.promisify(crypto.scrypt);

/**
 * Handler for /setpassword command
 * @param {Object} userService - User service instance
 * @param {Object} messageService - Message service instance
 * @returns {Function} - Grammy handler function
 */
function createSetPasswordCommandHandler(userService, messageService) {
    return async (ctx) => {
        console.log("[SetPasswordCommandHandler] Command received.");
        const messages = require('../../shared/services/messages-service');
        const userId = ctx.from?.id;
        
        if (!userId) {
            console.warn("[SetPasswordCommandHandler] No user ID.");
            return;
        }

        const messageText = ctx.message.text;
        const parts = messageText.split(/\s+/).filter(Boolean);

        if (parts.length < 2) {
            await messageService.sendReply(ctx, messages.get('password.hint'));
            return;
        }

        const password = parts.slice(1).join(' '); // Allow spaces in password

        if (password.length < 8) {
            await messageService.sendReply(ctx, messages.get('password.min_len'));
            return;
        }

        try {
            // Ensure user exists (or create if not)
            const userData = await userService.getOrCreateUser(userId);
            const userDbId = userData.id;
            
            if (!userDbId) {
                throw new Error("Could not retrieve user ID from database.");
            }

            // Generate salt and hash password using scrypt
            const salt = crypto.randomBytes(16).toString('hex');
            const derivedKey = await scryptAsync(password, salt, 64); // 64 bytes for hash
            const webPasswordHash = `${salt}:${derivedKey.toString('hex')}`;

            // Save hash to database
            console.log(`[SetPasswordCommandHandler] Updating password hash for user ${userId}...`);
            await userService.setWebPassword(userId, webPasswordHash);

            console.log(`[SetPasswordCommandHandler] Password hash updated for user ${userId}.`);
            await messageService.sendReply(ctx, messages.get('password.success'));

        } catch (error) {
            console.error(`[SetPasswordCommandHandler] Error setting password for user ${userId}:`, error);
            await messageService.sendReply(ctx, messages.get('password.error', { error: error.message || 'Unknown error' }));
        }
    };
}

module.exports = createSetPasswordCommandHandler;