// bot/functions/database-health.js
// Database health check endpoint

const { DatabaseQueries, createOptimizedClient } = require('./shared/database/queries');
const { wrapApiHandler, createApiError } = require('./shared/middleware/api-wrapper');
const { createSuccessResponse, createErrorResponse } = require('./shared/middleware/error-handler');

// --- Environment Variables ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ALLOWED_TMA_ORIGIN = process.env.ALLOWED_TMA_ORIGIN;
const ALLOWED_WEB_ORIGIN = process.env.ALLOWED_WEB_ORIGIN;

/**
 * Internal health check handler
 */
async function handleHealthCheck(event, context, corsHeaders) {
    console.log('[database-health] Starting database health check...');
    
    try {
        // Create optimized database connection
        const supabase = createOptimizedClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        const dbQueries = new DatabaseQueries(supabase);
        
        // Perform comprehensive health check
        const healthResult = await dbQueries.healthCheck();
        
        // Additional connection pool stats (if available)
        const connectionInfo = {
            pool_status: 'active',
            connection_config: 'optimized',
            timestamp: new Date().toISOString()
        };
        
        // Check if database is healthy
        if (healthResult.status === 'healthy') {
            console.log('[database-health] Database health check passed');
            
            return createSuccessResponse({
                status: 'healthy',
                database: healthResult,
                connection: connectionInfo,
                message: 'Database is operating normally'
            }, corsHeaders);
        } else {
            console.error('[database-health] Database health check failed:', healthResult.error);
            
            return createErrorResponse({
                status: 'unhealthy',
                database: healthResult,
                connection: connectionInfo,
                message: 'Database health check failed'
            }, corsHeaders, 503);
        }
        
    } catch (error) {
        console.error('[database-health] Health check error:', error);
        
        return createErrorResponse({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString(),
            message: 'Health check failed due to system error'
        }, corsHeaders, 500);
    }
}

/**
 * Detailed database performance check
 */
async function performDetailedHealthCheck(dbQueries) {
    const results = {
        basic_connection: null,
        query_performance: null,
        table_access: null,
        prepared_statements: null
    };
    
    try {
        // 1. Basic connection test
        console.log('[database-health] Testing basic connection...');
        const startTime = Date.now();
        results.basic_connection = await dbQueries.healthCheck();
        results.basic_connection.response_time_ms = Date.now() - startTime;
        
        // 2. Query performance test
        console.log('[database-health] Testing query performance...');
        const queryStart = Date.now();
        
        // Test a simple query to measure performance
        await dbQueries.supabase
            .from('users')
            .select('count', { count: 'exact', head: true });
            
        results.query_performance = {
            status: 'ok',
            response_time_ms: Date.now() - queryStart
        };
        
        // 3. Table access test
        console.log('[database-health] Testing table access...');
        const tableStart = Date.now();
        
        // Test access to main tables
        const tableTests = await Promise.all([
            dbQueries.supabase.from('users').select('count', { count: 'exact', head: true }),
            dbQueries.supabase.from('analyses').select('count', { count: 'exact', head: true })
        ]);
        
        results.table_access = {
            status: 'ok',
            tables_tested: ['users', 'analyses'],
            response_time_ms: Date.now() - tableStart,
            all_accessible: tableTests.every(test => !test.error)
        };
        
        // 4. Prepared statements test (RPC function availability)
        console.log('[database-health] Testing RPC functions...');
        const rpcStart = Date.now();
        
        try {
            // Test if our RPC functions are available
            await dbQueries.supabase.rpc('get_user_profile_with_stats', { user_tg_id: 0 });
            results.prepared_statements = {
                status: 'available',
                response_time_ms: Date.now() - rpcStart
            };
        } catch (rpcError) {
            results.prepared_statements = {
                status: 'unavailable',
                error: rpcError.message,
                response_time_ms: Date.now() - rpcStart
            };
        }
        
    } catch (error) {
        console.error('[database-health] Detailed health check error:', error);
        results.error = error.message;
    }
    
    return results;
}

// --- Exported Handler ---
exports.handler = wrapApiHandler(handleHealthCheck, {
    allowedMethods: 'GET',
    allowedOrigins: [ALLOWED_TMA_ORIGIN, ALLOWED_WEB_ORIGIN].filter(Boolean),
    requiredEnvVars: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
});

// Export detailed health check for internal use
exports.performDetailedHealthCheck = performDetailedHealthCheck;