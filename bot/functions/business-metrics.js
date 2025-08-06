// bot/functions/business-metrics.js
const { createClient } = require("@supabase/supabase-js");
const { createLogger } = require("./shared/utils/logger");
const { wrapApiHandler } = require("./shared/middleware/api-wrapper");

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const logger = createLogger({ module: 'business-metrics' });

/**
 * Get comprehensive business metrics
 */
async function getBusinessMetrics(timeRange = '24h') {
    try {
        const correlationId = logger.generateCorrelationId();
        logger.setCorrelationId(correlationId);

        if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
            throw new Error('Database configuration missing');
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        const startTime = Date.now();
        
        // Get time range boundaries
        const timeRanges = getTimeRangeBoundaries(timeRange);
        
        // Execute all metrics queries in parallel
        const [
            userMetrics,
            analysisMetrics,
            subscriptionMetrics,
            engagementMetrics,
            revenueMetrics
        ] = await Promise.all([
            getUserMetrics(supabase, timeRanges),
            getAnalysisMetrics(supabase, timeRanges),
            getSubscriptionMetrics(supabase, timeRanges),
            getEngagementMetrics(supabase, timeRanges),
            getRevenueMetrics(supabase, timeRanges)
        ]);

        const queryTime = Date.now() - startTime;

        const businessData = {
            overview: {
                timeRange,
                generatedAt: new Date().toISOString(),
                queryTime,
                correlationId
            },
            users: userMetrics,
            analyses: analysisMetrics,
            subscriptions: subscriptionMetrics,
            engagement: engagementMetrics,
            revenue: revenueMetrics,
            trends: calculateTrends(timeRange, {
                users: userMetrics,
                analyses: analysisMetrics,
                subscriptions: subscriptionMetrics
            })
        };

        logger.info('Business metrics collected', {
            timeRange,
            queryTime,
            metrics: {
                totalUsers: userMetrics.total,
                analysesToday: analysisMetrics.today,
                activeSubscriptions: subscriptionMetrics.active
            }
        });

        return businessData;

    } catch (error) {
        logger.error('Failed to collect business metrics', {}, error);
        throw error;
    }
}

/**
 * Get time range boundaries for queries
 */
function getTimeRangeBoundaries(timeRange) {
    const now = new Date();
    const boundaries = { now };

    switch (timeRange) {
        case '1h':
            boundaries.start = new Date(now.getTime() - 60 * 60 * 1000);
            boundaries.yesterday = new Date(now.getTime() - 2 * 60 * 60 * 1000);
            break;
        case '24h':
            boundaries.start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            boundaries.yesterday = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
            break;
        case '7d':
            boundaries.start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            boundaries.yesterday = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
            break;
        case '30d':
            boundaries.start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            boundaries.yesterday = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
            break;
        default:
            boundaries.start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            boundaries.yesterday = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    }

    return boundaries;
}

/**
 * Get user-related metrics
 */
async function getUserMetrics(supabase, timeRanges) {
    try {
        // Total users
        const { count: totalUsers } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });

        // New users in period
        const { count: newUsers } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', timeRanges.start.toISOString());

        // New users in previous period (for comparison)
        const { count: previousNewUsers } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', timeRanges.yesterday.toISOString())
            .lt('created_at', timeRanges.start.toISOString());

        // Active users (users with recent analyses)
        const { count: activeUsers } = await supabase
            .from('analyses')
            .select('user_id', { count: 'exact', head: true })
            .gte('created_at', timeRanges.start.toISOString())
            .neq('user_id', null);

        // User activity distribution
        const { data: userActivity } = await supabase
            .from('analyses')
            .select('user_id, created_at')
            .gte('created_at', timeRanges.start.toISOString())
            .order('created_at', { ascending: false });

        // Calculate user segments
        const userSegments = calculateUserSegments(userActivity);

        return {
            total: totalUsers || 0,
            new: newUsers || 0,
            previousNew: previousNewUsers || 0,
            active: activeUsers || 0,
            segments: userSegments,
            growth: calculateGrowthRate(newUsers, previousNewUsers)
        };

    } catch (error) {
        logger.dbError('user-metrics', 'users', error);
        return { error: error.message };
    }
}

/**
 * Get analysis-related metrics
 */
async function getAnalysisMetrics(supabase, timeRanges) {
    try {
        // Total analyses
        const { count: totalAnalyses } = await supabase
            .from('analyses')
            .select('*', { count: 'exact', head: true });

        // Analyses in period
        const { count: periodAnalyses } = await supabase
            .from('analyses')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', timeRanges.start.toISOString());

        // Previous period analyses
        const { count: previousAnalyses } = await supabase
            .from('analyses')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', timeRanges.yesterday.toISOString())
            .lt('created_at', timeRanges.start.toISOString());

        // Analysis types distribution
        const { data: analysisTypes } = await supabase
            .from('analyses')
            .select('type')
            .gte('created_at', timeRanges.start.toISOString());

        // Average analyses per user
        const { data: userAnalysisCounts } = await supabase
            .from('analyses')
            .select('user_id')
            .gte('created_at', timeRanges.start.toISOString());

        const analysesPerUser = calculateAnalysesPerUser(userAnalysisCounts);
        const typeDistribution = calculateTypeDistribution(analysisTypes);

        return {
            total: totalAnalyses || 0,
            today: periodAnalyses || 0,
            previous: previousAnalyses || 0,
            averagePerUser: analysesPerUser.average,
            typeDistribution,
            growth: calculateGrowthRate(periodAnalyses, previousAnalyses)
        };

    } catch (error) {
        logger.dbError('analysis-metrics', 'analyses', error);
        return { error: error.message };
    }
}

/**
 * Get subscription metrics
 */
async function getSubscriptionMetrics(supabase, timeRanges) {
    try {
        // Check if subscriptions table exists
        const { data: subscriptions, error } = await supabase
            .from('subscriptions')
            .select('*', { count: 'exact', head: true })
            .limit(1);

        if (error && error.message.includes('does not exist')) {
            // Subscriptions not implemented yet
            return {
                active: 0,
                new: 0,
                cancelled: 0,
                revenue: 0,
                conversionRate: 0,
                note: 'Subscriptions not implemented'
            };
        }

        // Active subscriptions
        const { count: activeSubscriptions } = await supabase
            .from('subscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');

        // New subscriptions in period
        const { count: newSubscriptions } = await supabase
            .from('subscriptions')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', timeRanges.start.toISOString());

        // Cancelled subscriptions
        const { count: cancelledSubscriptions } = await supabase
            .from('subscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'cancelled')
            .gte('updated_at', timeRanges.start.toISOString());

        return {
            active: activeSubscriptions || 0,
            new: newSubscriptions || 0,
            cancelled: cancelledSubscriptions || 0,
            churnRate: calculateChurnRate(cancelledSubscriptions, activeSubscriptions)
        };

    } catch (error) {
        logger.dbError('subscription-metrics', 'subscriptions', error);
        return { error: error.message };
    }
}

/**
 * Get engagement metrics
 */
async function getEngagementMetrics(supabase, timeRanges) {
    try {
        // Get all user interactions in period
        const { data: interactions } = await supabase
            .from('analyses')
            .select('user_id, created_at')
            .gte('created_at', timeRanges.start.toISOString())
            .order('created_at', { ascending: false });

        if (!interactions) {
            return { error: 'No interaction data available' };
        }

        // Calculate engagement metrics
        const uniqueUsers = new Set(interactions.map(i => i.user_id)).size;
        const totalInteractions = interactions.length;
        const avgInteractionsPerUser = totalInteractions / Math.max(uniqueUsers, 1);

        // Calculate session distribution
        const sessionData = calculateSessionMetrics(interactions);

        return {
            uniqueUsers,
            totalInteractions,
            averageInteractionsPerUser: Math.round(avgInteractionsPerUser * 100) / 100,
            sessions: sessionData
        };

    } catch (error) {
        logger.dbError('engagement-metrics', 'analyses', error);
        return { error: error.message };
    }
}

/**
 * Get revenue metrics (if payment system exists)
 */
async function getRevenueMetrics(supabase, timeRanges) {
    try {
        // Check if payments table exists
        const { data: payments, error } = await supabase
            .from('payments')
            .select('*', { count: 'exact', head: true })
            .limit(1);

        if (error && error.message.includes('does not exist')) {
            return {
                total: 0,
                period: 0,
                transactions: 0,
                averageTransaction: 0,
                note: 'Payment system not implemented'
            };
        }

        // Revenue in period
        const { data: periodPayments } = await supabase
            .from('payments')
            .select('amount')
            .eq('status', 'completed')
            .gte('created_at', timeRanges.start.toISOString());

        const totalRevenue = periodPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
        const transactionCount = periodPayments?.length || 0;
        const averageTransaction = transactionCount > 0 ? totalRevenue / transactionCount : 0;

        return {
            total: totalRevenue,
            period: totalRevenue,
            transactions: transactionCount,
            averageTransaction: Math.round(averageTransaction * 100) / 100
        };

    } catch (error) {
        logger.dbError('revenue-metrics', 'payments', error);
        return { error: error.message };
    }
}

/**
 * Calculate user segments based on activity
 */
function calculateUserSegments(userActivity) {
    if (!userActivity || userActivity.length === 0) {
        return { active: 0, casual: 0, inactive: 0 };
    }

    const userCounts = {};
    userActivity.forEach(activity => {
        userCounts[activity.user_id] = (userCounts[activity.user_id] || 0) + 1;
    });

    const counts = Object.values(userCounts);
    
    return {
        active: counts.filter(count => count >= 5).length,    // 5+ analyses
        casual: counts.filter(count => count >= 2 && count < 5).length,  // 2-4 analyses
        inactive: counts.filter(count => count === 1).length   // 1 analysis
    };
}

/**
 * Calculate analyses per user metrics
 */
function calculateAnalysesPerUser(userAnalysisCounts) {
    if (!userAnalysisCounts || userAnalysisCounts.length === 0) {
        return { average: 0, median: 0 };
    }

    const userCounts = {};
    userAnalysisCounts.forEach(analysis => {
        userCounts[analysis.user_id] = (userCounts[analysis.user_id] || 0) + 1;
    });

    const counts = Object.values(userCounts);
    const average = counts.reduce((sum, count) => sum + count, 0) / counts.length;
    
    return {
        average: Math.round(average * 100) / 100,
        users: counts.length
    };
}

/**
 * Calculate type distribution
 */
function calculateTypeDistribution(analysisTypes) {
    if (!analysisTypes) return {};

    const distribution = {};
    analysisTypes.forEach(analysis => {
        const type = analysis.type || 'unknown';
        distribution[type] = (distribution[type] || 0) + 1;
    });

    return distribution;
}

/**
 * Calculate session metrics
 */
function calculateSessionMetrics(interactions) {
    if (!interactions || interactions.length === 0) {
        return { total: 0, averageLength: 0 };
    }

    // Group by user and calculate session lengths
    const userSessions = {};
    interactions.forEach(interaction => {
        if (!userSessions[interaction.user_id]) {
            userSessions[interaction.user_id] = [];
        }
        userSessions[interaction.user_id].push(new Date(interaction.created_at));
    });

    let totalSessions = 0;
    let totalSessionTime = 0;

    Object.values(userSessions).forEach(sessions => {
        if (sessions.length > 1) {
            sessions.sort((a, b) => a - b);
            const sessionLength = sessions[sessions.length - 1] - sessions[0];
            totalSessions++;
            totalSessionTime += sessionLength;
        } else {
            totalSessions++;
            totalSessionTime += 5 * 60 * 1000; // Assume 5 minutes for single interaction
        }
    });

    return {
        total: totalSessions,
        averageLength: totalSessions > 0 ? Math.round((totalSessionTime / totalSessions) / 1000 / 60) : 0 // minutes
    };
}

/**
 * Calculate growth rate
 */
function calculateGrowthRate(current, previous) {
    if (!previous || previous === 0) {
        return current > 0 ? 100 : 0;
    }
    return Math.round(((current - previous) / previous) * 100 * 100) / 100;
}

/**
 * Calculate churn rate
 */
function calculateChurnRate(cancelled, active) {
    if (!active || active === 0) return 0;
    return Math.round((cancelled / active) * 100 * 100) / 100;
}

/**
 * Calculate trends for multiple metrics
 */
function calculateTrends(timeRange, metrics) {
    return {
        userGrowth: metrics.users.growth || 0,
        analysisGrowth: metrics.analyses.growth || 0,
        engagementTrend: metrics.analyses.today > metrics.analyses.previous ? 'up' : 'down',
        timeRange
    };
}

/**
 * Main handler
 */
async function handleBusinessMetrics(event, context, corsHeaders) {
    const method = event.httpMethod;
    const query = event.queryStringParameters || {};

    try {
        if (method === 'GET') {
            const timeRange = query.timeRange || '24h';
            const metrics = await getBusinessMetrics(timeRange);
            
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify(metrics)
            };
        }
        
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Method not allowed' })
        };

    } catch (error) {
        logger.error('Business metrics handler error', {}, error);
        
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message 
            })
        };
    }
}

// Export wrapped handler
exports.handler = wrapApiHandler(handleBusinessMetrics, {
    allowedMethods: ['GET'],
    allowedOrigins: [
        process.env.TMA_URL,
        process.env.WEB_URL,
        'https://dream-analyzer.netlify.app',
        'http://localhost:5173',
        'http://localhost:3000'
    ],
    skipConfigValidation: true
});

// Export functions for internal use
exports.getBusinessMetrics = getBusinessMetrics;