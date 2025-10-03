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
    // Глобальный переключатель паузы бота
    const isPaused = (() => {
        const v = process.env.BOT_PAUSED;
        if (v === undefined) return true; // По умолчанию ставим на паузу, чтобы мгновенно остановить
        return String(v).toLowerCase() === 'true';
    })();
    // Локальный helper для таймаутов операций
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
    // Общий таймаут всего процесса анализа (конфигурируемый)
    const overallTimeoutMs = (() => {
        const raw = process.env.BOT_ANALYSIS_OVERALL_TIMEOUT_MS || '9500';
        const parsed = Number.parseInt(raw, 10);
        return Number.isFinite(parsed) ? Math.max(5000, Math.min(parsed, 10000)) : 9500;
    })();
    return async (ctx) => {
        console.log("[TextMessageHandler] Received text message.");
        const messages = require('../../shared/services/messages-service');

        if (isPaused) {
            try {
                await messageService.sendReply(ctx, 'Анализ временно приостановлен. Попробуйте позже.');
            } catch (_) {}
            return;
        }
        
        const dreamText = ctx.message.text;
        const userId = ctx.from?.id;
        const chatId = ctx.chat.id;
        const messageId = ctx.message.message_id;
        const updateId = ctx.update?.update_id;
        // Игнорируем устаревшие апдейты (старше 60 секунд)
        try {
            const msgTs = Number(ctx.message?.date || 0);
            const ageSec = Math.floor(Date.now() / 1000) - msgTs;
            if (ageSec > 60) {
                console.warn(`[TextMessageHandler] Ignoring stale update ${updateId} (age ${ageSec}s).`);
                return;
            }
        } catch (_) {}
        
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

        // Beta whitelist gate: only allow approved users to run analysis
        try {
            const gate = await userService.isBetaWhitelisted(userId);
            const nowTs = Date.now();
            if (!gate?.whitelisted) {
                try { await messageService.deleteMessage(chatId, messageId); } catch (_) {}
                await messageService.sendReply(ctx, 'Бета-доступ пока закрыт. Заполните анкету и дождитесь одобрения — мы пришлём уведомление.');
                return;
            }
            if (gate?.accessAt && gate.accessAt > nowTs) {
                const secs = Math.max(0, Math.floor((gate.accessAt - nowTs) / 1000));
                const hours = Math.floor(secs / 3600);
                const minutes = Math.floor((secs % 3600) / 60);
                try { await messageService.deleteMessage(chatId, messageId); } catch (_) {}
                await messageService.sendReply(ctx, `Доступ скоро появится. Осталось примерно ${hours}ч ${minutes}м.`);
                return;
            }
            // Block analysis for 'beta' until onboarding started
            if (String(gate?.subscription_type || '').toLowerCase() === 'beta') {
                try { await messageService.deleteMessage(chatId, messageId); } catch (_) {}
                await messageService.sendReply(ctx, 'Перед анализом пройдите короткий онбординг — откройте мини‑приложение (кнопка в /start).');
                return;
            }
        } catch (e) {
            console.warn('[TextMessageHandler] Whitelist check failed:', e?.message);
            try { await messageService.deleteMessage(chatId, messageId); } catch (_) {}
            await messageService.sendReply(ctx, 'Техническая ошибка. Попробуйте позже.');
            return;
        }

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
            // Увеличиваем TTL идемпотентности, чтобы Telegram ретраи того же update_id не проходили
            cache.set(idemKey, true, 60 * 60 * 1000); // 1 hour TTL
            cache.set(rateKey, true, 10 * 1000); // 10 seconds
            cache.set(inflightKey, true, 120 * 1000); // 120 seconds safety
        } catch (e) {
            console.warn('[TextMessageHandler] Idempotency cache failed:', e?.message);
        }
        
        let statusMessage;
        
        try {
            // Delete user's message
            console.log(`[TextMessageHandler] Deleting user message ${messageId}`);
            await messageService.deleteMessage(chatId, messageId);
            
            // Send status message
            statusMessage = await messageService.sendStatusMessage(ctx, messages.get('analysis.status'));
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

            // Отправляем задачу на фоновую функцию, чтобы обойти лимит 10s
            // NOTE: Token decrement happens in the background function AFTER successful analysis
            const siteUrl = process.env.FUNCTIONS_BASE_URL || process.env.URL || process.env.WEB_URL || process.env.TMA_URL || process.env.ALLOWED_TMA_ORIGIN;
            if (!siteUrl) throw new Error('Site URL is not configured');
            const backgroundUrl = new URL('/.netlify/functions/analyze-dream-background', siteUrl).toString();
            const payload = {
                tgUserId: userId,
                userDbId: userData.id,
                chatId,
                statusMessageId: statusMessage?.message_id || null,
                dreamText
            };
            await fetch(backgroundUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            
            // NOTE: Background function will handle:
            // - Deleting status message
            // - Sending success message
            // - Token decrement
            // We just fire-and-forget here to avoid 10s webhook timeout
            console.log(`[TextMessageHandler] Background analysis triggered for user ${userId}`);
            
        } catch (error) {
            console.error(`[TextMessageHandler] Error processing dream for ${userId}:`, error);
            
            // Clean up status message if it exists
            if (statusMessage) {
                await messageService.deleteStatusMessage(chatId, statusMessage);
            }
            
            // Show error to user (do not decrement token on failure)
            await messageService.sendReply(ctx, messages.get('analysis.error', { details: error.message || 'Неизвестная ошибка' }));
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