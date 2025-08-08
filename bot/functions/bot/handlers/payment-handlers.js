// bot/functions/bot/handlers/payment-handlers.js

/**
 * Handler for pre_checkout_query
 * @param {Object} messageService - Message service instance
 * @returns {Function} - Grammy handler function
 */
function createPreCheckoutQueryHandler(messageService) {
    return async (ctx) => {
        console.log("[PaymentHandlers:PreCheckout] Received:", JSON.stringify(ctx.preCheckoutQuery));
        try {
            await ctx.answerPreCheckoutQuery(true);
            console.log("[PaymentHandlers:PreCheckout] Answered TRUE.");
        } catch (error) {
            console.error("[PaymentHandlers:PreCheckout] Failed to answer:", error);
            try {
                await ctx.answerPreCheckoutQuery(false, "Internal error");
            } catch (e) {
                // Ignore secondary error
            }
        }
    };
}

/**
 * Handler for successful_payment
 * @param {Object} userService - User service instance
 * @param {Object} messageService - Message service instance
 * @returns {Function} - Grammy handler function
 */
function createSuccessfulPaymentHandler(userService, messageService) {
    return async (ctx) => {
        console.log("[PaymentHandlers:SuccessfulPayment] Received:", JSON.stringify(ctx.message.successful_payment));
        
        const payment = ctx.message.successful_payment;
        const userId = ctx.from.id;
        const payload = payment.invoice_payload;

        if (!payload) {
            console.error(`[PaymentHandlers:SuccessfulPayment] Missing payload from user ${userId}`);
            return;
        }

        // Robust payload parser: supports "sub_{plan}_{duration}mo_{tgId}" and "deepanalysis_{tgId}"
        const parts = payload.split('_').filter(Boolean);
        const paymentType = parts[0]; // 'sub' или 'deepanalysis'

        try {
            if (paymentType === 'sub' && parts.length >= 4) {
                await handleSubscriptionPayment(userService, messageService, ctx, parts, userId, payload);
            } else if (paymentType === 'deepanalysis' && parts.length >= 2) {
                await handleDeepAnalysisPayment(userService, messageService, ctx, parts, userId, payload);
            } else {
                // Unknown payload format
                console.error(`[PaymentHandlers:SuccessfulPayment] Unknown or invalid payload format: ${payload} from user ${userId}`);
                await messageService.sendReply(ctx, "Received payment with unknown purpose.");
            }

        } catch (error) {
            console.error(`[PaymentHandlers:SuccessfulPayment] Failed process payment for ${userId}:`, error);
            await messageService.sendReply(ctx, "Your payment was received, but an error occurred during processing. Please contact support.");
        }
    };
}

/**
 * Handles subscription payment processing
 * @param {Object} userService - User service instance
 * @param {Object} messageService - Message service instance
 * @param {Object} ctx - Grammy context
 * @param {Array} parts - Payload parts
 * @param {number} userId - User ID
 * @param {string} payload - Full payload
 */
async function handleSubscriptionPayment(userService, messageService, ctx, parts, userId, payload) {
    const plan = parts[1];
    const durationMonths = parseInt(parts[2].replace('mo', ''), 10);
    const payloadUserId = parseInt(parts[3], 10);
    
    if (isNaN(durationMonths) || isNaN(payloadUserId) || payloadUserId !== userId) {
        console.error(`[PaymentHandlers:SuccessfulPayment] Sub Payload error/mismatch: ${payload}`);
        await messageService.sendReply(ctx, "Subscription payment data error.");
        return;
    }

    console.log(`[PaymentHandlers:SuccessfulPayment] Processing SUBSCRIPTION payment for ${userId}: Plan=${plan}, Duration=${durationMonths}mo.`);
    
    await userService.processSubscriptionPayment(userId, plan, durationMonths);
    
    console.log(`[PaymentHandlers:SuccessfulPayment] Subscription payment processed via RPC for ${userId}.`);
    await messageService.sendReply(ctx, `Thank you! Your "${plan.toUpperCase()}" subscription is active/extended. ✨`);
}

/**
 * Handles deep analysis payment processing
 * @param {Object} userService - User service instance
 * @param {Object} messageService - Message service instance
 * @param {Object} ctx - Grammy context
 * @param {Array} parts - Payload parts
 * @param {number} userId - User ID
 * @param {string} payload - Full payload
 */
async function handleDeepAnalysisPayment(userService, messageService, ctx, parts, userId, payload) {
    const payloadUserId = parseInt(parts[1], 10);
    
    if (isNaN(payloadUserId) || payloadUserId !== userId) {
        console.error(`[PaymentHandlers:SuccessfulPayment] Deep Analysis Payload error/mismatch: ${payload}`);
        await messageService.sendReply(ctx, "Deep analysis payment data error.");
        return;
    }

    console.log(`[PaymentHandlers:SuccessfulPayment] Processing DEEP ANALYSIS payment for ${userId}.`);
    
    // Ensure user exists or create them
    await userService.getOrCreateUser(userId);
    
    // Add deep analysis credit
    const newCredits = await userService.addDeepAnalysisCredit(userId);
    
    console.log(`[PaymentHandlers:SuccessfulPayment] Deep analysis credit added for user ${userId}. New total: ${newCredits}`);
    await messageService.sendReply(ctx, "Спасибо за покупку! Вам добавлен 1 кредит глубокого анализа. Используйте его в приложении.");
}

module.exports = {
    createPreCheckoutQueryHandler,
    createSuccessfulPaymentHandler
};