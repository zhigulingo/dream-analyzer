// bot/functions/bot/services/user-service.js

const { DatabaseQueries } = require("../../shared/database/queries");

class UserService {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.dbQueries = new DatabaseQueries(supabaseClient);
    }

    /**
     * Ensures user exists in database or creates one
     * @param {number} userId - Telegram user ID
     * @returns {Promise<{id: number, claimed: boolean, lastMessageId: number|null}>}
     */
    async getOrCreateUser(userId) {
        if (!this.supabase) {
            throw new Error("Supabase client not provided to UserService.");
        }
        
        console.log(`[UserService] Processing user ${userId}...`);
        
        try {
            console.log(`[UserService] Selecting user ${userId}...`);
            let { data: existingUser, error: selectError } = await this.supabase
                .from('users')
                .select('id, channel_reward_claimed, last_start_message_id')
                .eq('tg_id', userId)
                .single();

            if (selectError && selectError.code !== 'PGRST116') {
                console.error(`[UserService] Supabase SELECT error: ${selectError.message}`);
                throw new Error(`DB Select Error: ${selectError.message}`);
            }

            if (existingUser) {
                console.log(`[UserService] Found existing user ${userId}.`);
                return {
                    id: existingUser.id,
                    claimed: existingUser.channel_reward_claimed ?? false,
                    lastMessageId: existingUser.last_start_message_id
                };
            } else {
                console.log(`[UserService] User ${userId} not found. Creating...`);
                const { data: newUser, error: insertError } = await this.supabase
                    .from('users')
                    .insert({
                        tg_id: userId,
                        subscription_type: 'free',
                        tokens: 0,
                        channel_reward_claimed: false
                    })
                    .select('id')
                    .single();

                if (insertError) {
                    console.error(`[UserService] Supabase INSERT error: ${insertError.message}`);
                    if (insertError.code === '23505') { // Race condition
                        console.warn(`[UserService] Race condition for ${userId}. Re-fetching...`);
                        let { data: raceUser, error: raceError } = await this.supabase
                            .from('users')
                            .select('id, channel_reward_claimed, last_start_message_id')
                            .eq('tg_id', userId)
                            .single();
                        
                        if (raceError) {
                            throw new Error(`DB Re-fetch Error: ${raceError.message}`);
                        }
                        if (raceUser) {
                            console.log(`[UserService] Found user ${userId} on re-fetch.`);
                            return {
                                id: raceUser.id,
                                claimed: raceUser.channel_reward_claimed ?? false,
                                lastMessageId: raceUser.last_start_message_id
                            };
                        } else {
                            throw new Error("DB Inconsistent state after unique violation.");
                        }
                    }
                    throw new Error(`DB Insert Error: ${insertError.message}`);
                }
                
                if (!newUser) {
                    throw new Error("DB Insert Error: No data returned after user creation.");
                }
                
                console.log(`[UserService] Created new user ${userId} with ID ${newUser.id}.`);
                return {
                    id: newUser.id,
                    claimed: false,
                    lastMessageId: null
                };
            }
        } catch (error) {
            console.error(`[UserService] FAILED for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Updates user's last start message ID
     * @param {number} userId - User database ID
     * @param {number} messageId - Message ID to store
     */
    async updateLastStartMessageId(userId, messageId) {
        const { error: updateError } = await this.supabase
            .from('users')
            .update({ last_start_message_id: messageId })
            .eq('id', userId);
            
        if (updateError) {
            console.error(`[UserService] Failed to update last_start_message_id:`, updateError);
            throw new Error(`Failed to update message ID: ${updateError.message}`);
        }
        
        console.log(`[UserService] Updated last_start_message_id to ${messageId}.`);
    }

    /**
     * Sets web password hash for user
     * @param {number} tgUserId - Telegram user ID
     * @param {string} passwordHash - Hashed password
     */
    async setWebPassword(tgUserId, passwordHash) {
        const { error: updateError } = await this.supabase
            .from('users')
            .update({ web_password_hash: passwordHash })
            .eq('tg_id', tgUserId);

        if (updateError) {
            console.error(`[UserService] Supabase update error for user ${tgUserId}:`, updateError);
            throw new Error("Database update failed.");
        }

        console.log(`[UserService] Password hash updated for user ${tgUserId}.`);
    }

    /**
     * Decrements user token if available
     * @param {number} tgUserId - Telegram user ID
     * @returns {Promise<boolean>} - Whether token was decremented
     */
    async decrementTokenIfAvailable(tgUserId) {
        const { data: tokenDecremented, error: rpcError } = await this.supabase
            .rpc('decrement_token_if_available', { user_tg_id: tgUserId });
            
        if (rpcError) {
            throw new Error(`Internal token error: ${rpcError.message}`);
        }
        
        return tokenDecremented;
    }

    /**
     * Checks if user has at least one token available
     * @param {number} tgUserId - Telegram user ID
     * @returns {Promise<boolean>}
     */
    async hasAvailableToken(tgUserId) {
        const { data, error } = await this.supabase
            .from('users')
            .select('tokens')
            .eq('tg_id', tgUserId)
            .single();
        if (error && error.code !== 'PGRST116') {
            throw new Error(`Failed to fetch token balance: ${error.message}`);
        }
        const tokens = data?.tokens ?? 0;
        return Number(tokens) > 0;
    }

    /**
     * Processes successful subscription payment
     * @param {number} userId - Telegram user ID
     * @param {string} plan - Plan type
     * @param {number} durationMonths - Duration in months
     */
    async processSubscriptionPayment(userId, plan, durationMonths) {
        const { error: txError } = await this.supabase.rpc('process_successful_payment', {
            user_tg_id: userId,
            plan_type: plan,
            duration_months: durationMonths
        });
        
        if (txError) {
            console.error(`[UserService] RPC error for sub payment ${userId}:`, txError);
            throw new Error("DB update failed for subscription.");
        }
        
        console.log(`[UserService] Subscription payment processed via RPC for ${userId}.`);
    }

    /**
     * Adds deep analysis credit to user using atomic operation
     * @param {number} userId - Telegram user ID
     * @returns {Promise<number>} - New credit total
     */
    async addDeepAnalysisCredit(userId) {
        console.log(`[UserService] Adding deep analysis credit for user ${userId} using atomic operation...`);
        
        try {
            const newCredits = await this.dbQueries.incrementDeepAnalysisCredits(userId);
            
            if (newCredits === null || newCredits === undefined) {
                throw new Error("Failed to increment credits - no result returned");
            }
            
            console.log(`[UserService] Deep analysis credit added for user ${userId}. New total: ${newCredits}`);
            return newCredits;
        } catch (error) {
            console.error(`[UserService] Error adding deep analysis credit: ${error.message}`);
            throw new Error("Error updating credits.");
        }
    }
}

module.exports = UserService;