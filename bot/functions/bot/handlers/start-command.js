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
        
        // Parse referral code from startParam (e.g., "ref_ABCD1234")
        let referralCode = null;
        if (startParam && startParam.startsWith('ref_')) {
            referralCode = startParam.slice(4); // strip "ref_" prefix
            console.log(`[StartCommandHandler] Referral code detected: ${referralCode}`);
        }

        try {
            const userData = await userService.getOrCreateUser(userId);
            
            // Process referral: link referred user to referrer if new user
            if (referralCode && !userData.claimed) {
                try {
                    const supabaseUrl = process.env.SUPABASE_URL;
                    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
                    if (supabaseUrl && supabaseKey) {
                        const { createClient } = require('@supabase/supabase-js');
                        const supabase = createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false } });
                        
                        // Find referrer by referral code
                        const { data: referrer } = await supabase
                            .from('users')
                            .select('id')
                            .eq('referral_code', referralCode.toUpperCase())
                            .single();
                        
                        if (referrer && referrer.id !== userData.id) {
                            // Link referral (ignore if already referred)
                            await supabase
                                .from('referrals')
                                .upsert({
                                    referrer_id: referrer.id,
                                    referred_id: userData.id
                                }, { onConflict: 'referred_id', ignoreDuplicates: true });
                            
                            console.log(`[StartCommandHandler] Referral linked: referrer=${referrer.id}, referred=${userData.id}`);
                        }
                    }
                } catch (refErr) {
                    console.warn('[StartCommandHandler] Referral processing failed (non-critical):', refErr?.message);
                }
            }
            console.log(`[StartCommandHandler] User data received: ID=${userData.id}, Claimed=${userData.claimed}, LastMsgId=${userData.lastMessageId}`);
            // Auto-transition to beta if timer passed
            try {
                const st = await userService.getBetaStatus(userId);
                const nowTs = Date.now();
                const accessAt = st?.beta_access_at ? new Date(st.beta_access_at).getTime() : null;
                if (st?.beta_whitelisted && st?.subscription_type === 'whitelisted' && accessAt && accessAt <= nowTs && !st?.beta_notified_access) {
                    const updated = await userService.transitionToBeta(userId);
                    if (updated) {
                        try {
                            await messageService.sendReply(ctx, 'Бета-доступ открыт! Нажмите кнопку, чтобы открыть приложение.', {
                                reply_markup: messageService.createWebAppButton('Открыть приложение', TMA_URL)
                            });
                        } catch (_) {}
                    }
                }
            } catch (e) {
                console.warn('[StartCommandHandler] beta auto-transition failed:', e?.message);
            }
            
            // Delete previous message if exists
            if (userData.lastMessageId) {
                await messageService.deleteMessage(chatId, userData.lastMessageId);
            }
            
            // For guests (not claimed) without explicit weblogin param — stay silent after cleanup
            if (!userData.claimed && startParam !== 'weblogin') {
                console.log('[StartCommandHandler] Guest user: no message will be sent.');
                return;
            }

            // Determine message text and button based on user state
            let messageText, buttonText, buttonUrl;

            if (userData.claimed) {
                messageText = messages.get('start.returning');
                buttonText = messages.get('buttons.open_account');
                buttonUrl = TMA_URL;
            } else {
                // weblogin path for guests
                messageText = messages.get('start.weblogin');
                buttonText = messages.get('buttons.open_web');
                buttonUrl = `${TMA_URL}/login`;
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