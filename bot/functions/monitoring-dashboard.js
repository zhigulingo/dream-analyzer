// bot/functions/monitoring-dashboard.js
const { createLogger } = require("./shared/utils/logger");
const { wrapApiHandler } = require("./shared/middleware/api-wrapper");

// Import metrics collectors
const { getPerformanceMetrics } = require("./performance-metrics");
const { getErrorMonitoringData } = require("./error-monitoring");
const { getBusinessMetrics } = require("./business-metrics");

const logger = createLogger({ module: 'monitoring-dashboard' });

/**
 * Get comprehensive dashboard data
 */
async function getDashboardData(timeRange = '24h') {
    try {
        const correlationId = logger.generateCorrelationId();
        logger.setCorrelationId(correlationId);

        const startTime = Date.now();

        // Collect all metrics in parallel
        const [
            healthResponse,
            performanceMetrics,
            errorData,
            businessMetrics
        ] = await Promise.all([
            getHealthStatus(),
            getPerformanceMetrics(timeRange).catch(err => ({ error: err.message })),
            getErrorMonitoringData(timeRange).catch(err => ({ error: err.message })),
            getBusinessMetrics(timeRange).catch(err => ({ error: err.message }))
        ]);

        const collectionTime = Date.now() - startTime;

        // Calculate overall system health score
        const healthScore = calculateHealthScore(healthResponse, performanceMetrics, errorData);

        // Generate alerts and recommendations
        const alerts = generateAlerts(performanceMetrics, errorData, businessMetrics);
        const recommendations = generateRecommendations(performanceMetrics, errorData, businessMetrics);

        const dashboardData = {
            meta: {
                timeRange,
                generatedAt: new Date().toISOString(),
                collectionTime,
                correlationId,
                version: '1.0.0'
            },
            overview: {
                healthScore,
                status: healthResponse.status,
                alertsCount: alerts.length,
                systemUptime: process.uptime()
            },
            health: healthResponse,
            performance: performanceMetrics,
            errors: errorData,
            business: businessMetrics,
            alerts,
            recommendations,
            charts: generateChartData(performanceMetrics, errorData, businessMetrics)
        };

        logger.info('Dashboard data generated', {
            timeRange,
            collectionTime,
            healthScore,
            alertsCount: alerts.length
        });

        return dashboardData;

    } catch (error) {
        logger.error('Failed to generate dashboard data', {}, error);
        throw error;
    }
}

/**
 * Get current health status (simplified version for dashboard)
 */
async function getHealthStatus() {
    try {
        // Basic health check without external dependencies
        const healthStatus = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            components: {
                environment: checkEnvironmentVariables(),
                system: getSystemHealth()
            }
        };

        // Determine overall status
        const componentStatuses = Object.values(healthStatus.components);
        const hasFailure = componentStatuses.some(comp => comp.status === 'unhealthy');
        const hasWarning = componentStatuses.some(comp => comp.status === 'warning');
        
        if (hasFailure) {
            healthStatus.status = 'unhealthy';
        } else if (hasWarning) {
            healthStatus.status = 'warning';
        }

        return healthStatus;

    } catch (error) {
        return {
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        };
    }
}

/**
 * Check environment variables
 */
function checkEnvironmentVariables() {
    const requiredVars = [
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'BOT_TOKEN',
        'GEMINI_API_KEY'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
        return {
            status: 'unhealthy',
            message: `Missing: ${missing.join(', ')}`
        };
    }

    return {
        status: 'healthy',
        message: 'All required variables present'
    };
}

/**
 * Get system health metrics
 */
function getSystemHealth() {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    // Calculate memory usage percentage (assuming 512MB container)
    const memoryUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    const memoryLimitMB = 512;
    const memoryUsagePercent = (memoryUsedMB / memoryLimitMB) * 100;
    
    let status = 'healthy';
    let message = 'System running normally';
    
    if (memoryUsagePercent > 90) {
        status = 'unhealthy';
        message = 'High memory usage';
    } else if (memoryUsagePercent > 75) {
        status = 'warning';
        message = 'Elevated memory usage';
    }

    return {
        status,
        message,
        metrics: {
            uptime: Math.round(uptime),
            memoryUsedMB: Math.round(memoryUsedMB),
            memoryUsagePercent: Math.round(memoryUsagePercent)
        }
    };
}

/**
 * Calculate overall health score (0-100)
 */
function calculateHealthScore(health, performance, errors) {
    let score = 100;

    // Health component penalties
    if (health.status === 'unhealthy') score -= 40;
    else if (health.status === 'warning') score -= 20;

    // Performance penalties
    if (performance && performance.derived) {
        if (performance.derived.errorRate > 0.1) score -= 20; // >10% error rate
        if (performance.derived.requestsPerSecond > 100) score -= 10; // High load
        if (performance.system && performance.system.memoryUsage) {
            const memUsageMB = performance.system.memoryUsage.heapUsed / 1024 / 1024;
            if (memUsageMB > 400) score -= 15; // High memory usage
        }
    }

    // Error penalties
    if (errors && errors.summary) {
        const totalErrors = errors.summary.totalErrors || 0;
        if (totalErrors > 50) score -= 15;
        else if (totalErrors > 20) score -= 10;
        else if (totalErrors > 10) score -= 5;
    }

    return Math.max(0, Math.min(100, score));
}

/**
 * Generate alerts based on metrics
 */
function generateAlerts(performance, errors, business) {
    const alerts = [];

    // Performance alerts
    if (performance && performance.derived) {
        if (performance.derived.errorRate > 0.15) {
            alerts.push({
                type: 'error',
                category: 'performance',
                message: `High error rate: ${(performance.derived.errorRate * 100).toFixed(1)}%`,
                timestamp: new Date().toISOString()
            });
        }

        if (performance.system && performance.system.memoryUsage) {
            const memUsageMB = performance.system.memoryUsage.heapUsed / 1024 / 1024;
            if (memUsageMB > 450) {
                alerts.push({
                    type: 'warning',
                    category: 'system',
                    message: `High memory usage: ${memUsageMB.toFixed(0)}MB`,
                    timestamp: new Date().toISOString()
                });
            }
        }
    }

    // Error alerts
    if (errors && errors.summary) {
        const totalErrors = errors.summary.totalErrors || 0;
        if (totalErrors > 30) {
            alerts.push({
                type: 'error',
                category: 'errors',
                message: `High error count: ${totalErrors} errors in the last period`,
                timestamp: new Date().toISOString()
            });
        }

        // Check for specific error patterns
        if (errors.summary.errorsByCategory) {
            if (errors.summary.errorsByCategory.database > 10) {
                alerts.push({
                    type: 'error',
                    category: 'database',
                    message: `Database errors detected: ${errors.summary.errorsByCategory.database}`,
                    timestamp: new Date().toISOString()
                });
            }
        }
    }

    // Business alerts
    if (business && business.users && business.analyses) {
        if (business.users.growth < -20) {
            alerts.push({
                type: 'warning',
                category: 'business',
                message: `User growth declining: ${business.users.growth.toFixed(1)}%`,
                timestamp: new Date().toISOString()
            });
        }

        if (business.analyses.growth < -30) {
            alerts.push({
                type: 'warning',
                category: 'business',
                message: `Analysis volume declining: ${business.analyses.growth.toFixed(1)}%`,
                timestamp: new Date().toISOString()
            });
        }
    }

    return alerts;
}

/**
 * Generate recommendations based on metrics
 */
function generateRecommendations(performance, errors, business) {
    const recommendations = [];

    // Performance recommendations
    if (performance && performance.system && performance.system.memoryUsage) {
        const memUsageMB = performance.system.memoryUsage.heapUsed / 1024 / 1024;
        if (memUsageMB > 300) {
            recommendations.push({
                category: 'performance',
                priority: 'medium',
                message: 'Consider optimizing memory usage or increasing container limits',
                action: 'review_memory_usage'
            });
        }
    }

    // Error recommendations
    if (errors && errors.summary && errors.summary.totalErrors > 20) {
        recommendations.push({
            category: 'reliability',
            priority: 'high',
            message: 'High error rate detected. Review error logs and implement fixes',
            action: 'investigate_errors'
        });
    }

    // Business recommendations
    if (business && business.engagement) {
        if (business.engagement.averageInteractionsPerUser < 2) {
            recommendations.push({
                category: 'business',
                priority: 'medium',
                message: 'Low user engagement. Consider improving user experience',
                action: 'improve_engagement'
            });
        }
    }

    return recommendations;
}

/**
 * Generate chart data for visualization
 */
function generateChartData(performance, errors, business) {
    const charts = {};

    // Error distribution chart
    if (errors && errors.summary && errors.summary.errorsByCategory) {
        charts.errorDistribution = {
            type: 'pie',
            title: 'Errors by Category',
            data: Object.entries(errors.summary.errorsByCategory).map(([category, count]) => ({
                label: category,
                value: count
            }))
        };
    }

    // User segments chart
    if (business && business.users && business.users.segments) {
        charts.userSegments = {
            type: 'bar',
            title: 'User Activity Segments',
            data: Object.entries(business.users.segments).map(([segment, count]) => ({
                label: segment,
                value: count
            }))
        };
    }

    // Performance metrics timeline (placeholder for time-series data)
    charts.performanceTimeline = {
        type: 'line',
        title: 'Performance Over Time',
        data: [] // Would need historical data for actual implementation
    };

    return charts;
}

/**
 * Generate simple HTML dashboard
 */
function generateHtmlDashboard(dashboardData) {
    const { overview, health, alerts, recommendations } = dashboardData;
    
    const statusColor = overview.status === 'healthy' ? '#10B981' : 
                       overview.status === 'warning' ? '#F59E0B' : '#EF4444';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dream Analyzer - Monitoring Dashboard</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
        .header { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 600; }
        .status-healthy { background: #d1fae5; color: #065f46; }
        .status-warning { background: #fef3c7; color: #92400e; }
        .status-unhealthy { background: #fee2e2; color: #991b1b; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .metric-value { font-size: 2em; font-weight: 700; color: #1f2937; }
        .metric-label { color: #6b7280; font-size: 14px; }
        .alert { padding: 12px; border-radius: 6px; margin-bottom: 8px; }
        .alert-error { background: #fee2e2; color: #991b1b; border-left: 4px solid #ef4444; }
        .alert-warning { background: #fef3c7; color: #92400e; border-left: 4px solid #f59e0b; }
        .timestamp { color: #6b7280; font-size: 12px; }
        h1, h2, h3 { color: #1f2937; }
        .health-score { font-size: 3em; font-weight: 800; color: ${statusColor}; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Dream Analyzer Monitoring Dashboard</h1>
        <p>Last updated: ${overview.systemUptime ? new Date().toLocaleString() : 'Unknown'}</p>
        <span class="status-badge status-${overview.status}">${overview.status.toUpperCase()}</span>
    </div>

    <div class="grid">
        <div class="card">
            <h3>System Health Score</h3>
            <div class="health-score">${overview.healthScore || 0}</div>
            <div class="metric-label">Out of 100</div>
        </div>

        <div class="card">
            <h3>System Status</h3>
            <div class="metric-value">${overview.status || 'Unknown'}</div>
            <div class="metric-label">Overall Status</div>
        </div>

        <div class="card">
            <h3>Active Alerts</h3>
            <div class="metric-value">${overview.alertsCount || 0}</div>
            <div class="metric-label">Requires Attention</div>
        </div>

        <div class="card">
            <h3>System Uptime</h3>
            <div class="metric-value">${Math.round(overview.systemUptime || 0)}s</div>
            <div class="metric-label">Current Session</div>
        </div>
    </div>

    ${alerts && alerts.length > 0 ? `
    <div class="card" style="margin-top: 20px;">
        <h3>Current Alerts</h3>
        ${alerts.map(alert => `
            <div class="alert alert-${alert.type}">
                <strong>${alert.category.toUpperCase()}:</strong> ${alert.message}
                <div class="timestamp">${new Date(alert.timestamp).toLocaleString()}</div>
            </div>
        `).join('')}
    </div>
    ` : ''}

    ${recommendations && recommendations.length > 0 ? `
    <div class="card" style="margin-top: 20px;">
        <h3>Recommendations</h3>
        ${recommendations.map(rec => `
            <div class="alert alert-${rec.priority === 'high' ? 'error' : 'warning'}">
                <strong>${rec.category.toUpperCase()}:</strong> ${rec.message}
            </div>
        `).join('')}
    </div>
    ` : ''}

    <div class="card" style="margin-top: 20px;">
        <h3>Raw Data</h3>
        <pre style="background: #f3f4f6; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px;">${JSON.stringify(dashboardData, null, 2)}</pre>
    </div>
</body>
</html>`;
}

/**
 * Main handler
 */
async function handleMonitoringDashboard(event, context, corsHeaders) {
    const method = event.httpMethod;
    const query = event.queryStringParameters || {};
    const path = event.path || '';

    try {
        if (method === 'GET') {
            const timeRange = query.timeRange || '24h';
            const format = query.format || 'json';
            
            const dashboardData = await getDashboardData(timeRange);
            
            if (format === 'html') {
                const htmlDashboard = generateHtmlDashboard(dashboardData);
                return {
                    statusCode: 200,
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'text/html'
                    },
                    body: htmlDashboard
                };
            }
            
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify(dashboardData)
            };
        }
        
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Method not allowed' })
        };

    } catch (error) {
        logger.error('Dashboard handler error', {}, error);
        
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
exports.handler = wrapApiHandler(handleMonitoringDashboard, {
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
exports.getDashboardData = getDashboardData;