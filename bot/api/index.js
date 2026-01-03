/**
 * Main router for all API endpoints
 * This single function handles all routes to stay within Hobby plan limit (12 functions)
 */

const { wrapNetlifyFunction } = require('../api-internal-shared/_netlify-adapter');

// Import all handlers
const healthCheckHandler = require('../functions/health-check');
const userProfileHandler = require('../functions/user-profile');
const analysesHistoryHandler = require('../functions/analyses-history');
const analyzeDreamHandler = require('../functions/analyze-dream');
const deepAnalysisHandler = require('../functions/deep-analysis');
const webLoginHandler = require('../functions/web-login');
const refreshTokenHandler = require('../functions/refresh-token');
const logoutHandler = require('../functions/logout');
const createInvoiceHandler = require('../functions/create-invoice');
const claimChannelTokenHandler = require('../functions/claim-channel-token');
const botHandler = require('../functions/bot');
const cacheMonitoringHandler = require('../functions/cache-monitoring');
const performanceMetricsHandler = require('../functions/performance-metrics');
const errorMonitoringHandler = require('../functions/error-monitoring');
const businessMetricsHandler = require('../functions/business-metrics');
const monitoringDashboardHandler = require('../functions/monitoring-dashboard');
const analyzeDreamBackgroundHandler = require('../functions/analyze-dream-background');
const ingestKnowledgeHandler = require('../functions/ingest-knowledge');
const ingestKnowledgeBackgroundHandler = require('../functions/ingest-knowledge-background');
const setDemographicsHandler = require('../functions/set-demographics');
const tgStickerHandler = require('../functions/tg-sticker');
const setWebhookHandler = require('../functions/set-webhook');
const betaAccessNotifierHandler = require('../functions/beta-access-notifier');

// Route mapping
const routes = {
  '/api/health-check': healthCheckHandler,
  '/api/health': healthCheckHandler,
  '/api/user-profile': userProfileHandler,
  '/api/analyses-history': analysesHistoryHandler,
  '/api/analyze-dream': analyzeDreamHandler,
  '/api/deep-analysis': deepAnalysisHandler,
  '/api/web-login': webLoginHandler,
  '/api/refresh-token': refreshTokenHandler,
  '/api/logout': logoutHandler,
  '/api/create-invoice': createInvoiceHandler,
  '/api/claim-channel-token': claimChannelTokenHandler,
  '/api/bot': botHandler,
  '/bot': botHandler,
  '/api/cache-monitoring': cacheMonitoringHandler,
  '/api/cache': cacheMonitoringHandler,
  '/api/performance-metrics': performanceMetricsHandler,
  '/api/metrics': performanceMetricsHandler,
  '/api/error-monitoring': errorMonitoringHandler,
  '/api/errors': errorMonitoringHandler,
  '/api/business-metrics': businessMetricsHandler,
  '/api/business': businessMetricsHandler,
  '/api/monitoring-dashboard': monitoringDashboardHandler,
  '/api/dashboard': monitoringDashboardHandler,
  '/api/analyze-dream-background': analyzeDreamBackgroundHandler,
  '/api/ingest-knowledge': ingestKnowledgeHandler,
  '/api/ingest-knowledge-background': ingestKnowledgeBackgroundHandler,
  '/api/set-demographics': setDemographicsHandler,
  '/api/tg-sticker': tgStickerHandler,
  '/api/set-webhook': setWebhookHandler,
  '/api/beta-access-notifier': betaAccessNotifierHandler,
};

/**
 * Main handler that routes requests to appropriate functions
 */
async function routerHandler(req, res) {
  console.log(`[Router] Request received: ${req.method} ${req.url}`);
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // Find matching route
  let handler = null;
  let matchedRoute = null;

  // Try exact match first
  if (routes[pathname]) {
    handler = routes[pathname];
    matchedRoute = pathname;
  } else {
    // Try pattern matching for /api/cache/:path*
    if (pathname.startsWith('/api/cache/')) {
      handler = routes['/api/cache-monitoring'];
      matchedRoute = '/api/cache-monitoring';
    }
  }

  if (!handler) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Route ${pathname} not found`,
      availableRoutes: Object.keys(routes)
    });
  }

  // Wrap the Netlify handler and call it
  const wrappedHandler = wrapNetlifyFunction(handler.handler);
  return wrappedHandler(req, res);
}

module.exports = routerHandler;
