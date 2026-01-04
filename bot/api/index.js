/**
 * Main router for all API endpoints
 * This single function handles all routes to stay within Hobby plan limit (12 functions)
 */
console.log("[Router] Module initialization started...");

const { wrapNetlifyFunction } = require('../lib/shared/_netlify-adapter');

// Import all handlers from lib/logic
const healthCheckHandler = require('../lib/logic/health-check');
const userProfileHandler = require('../lib/logic/user-profile');
const analysesHistoryHandler = require('../lib/logic/analyses-history');
const analyzeDreamHandler = require('../lib/logic/analyze-dream');
const deepAnalysisHandler = require('../lib/logic/deep-analysis');
const webLoginHandler = require('../lib/logic/web-login');
const refreshTokenHandler = require('../lib/logic/refresh-token');
const logoutHandler = require('../lib/logic/logout');
const createInvoiceHandler = require('../lib/logic/create-invoice');
const claimChannelTokenHandler = require('../lib/logic/claim-channel-token');
const botHandler = require('../lib/logic/bot');
const cacheMonitoringHandler = require('../lib/logic/cache-monitoring');
const performanceMetricsHandler = require('../lib/logic/performance-metrics');
const errorMonitoringHandler = require('../lib/logic/error-monitoring');
const businessMetricsHandler = require('../lib/logic/business-metrics');
const monitoringDashboardHandler = require('../lib/logic/monitoring-dashboard');
const analyzeDreamBackgroundHandler = require('../lib/logic/analyze-dream-background');
const ingestKnowledgeHandler = require('../lib/logic/ingest-knowledge');
const ingestKnowledgeBackgroundHandler = require('../lib/logic/ingest-knowledge-background');
const setDemographicsHandler = require('../lib/logic/set-demographics');
const tgStickerHandler = require('../lib/logic/tg-sticker');
const setWebhookHandler = require('../lib/logic/set-webhook');
const betaAccessNotifierHandler = require('../lib/logic/beta-access-notifier');

// Survey handlers (moved from survey project)
const surveyStatusHandler = require('../lib/logic/survey-status');
const surveyUserStateHandler = require('../lib/logic/survey-user-state');
const submitSurveyHandler = require('../lib/logic/submit-survey');
const editStartButtonHandler = require('../lib/logic/edit-start-button');

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
  '/api/survey-status': surveyStatusHandler,
  '/api/survey-user-state': surveyUserStateHandler,
  '/api/submit-survey': submitSurveyHandler,
  '/api/edit-start-button': editStartButtonHandler,
  '/api': botHandler,
  '/': botHandler,
};

/**
 * Main handler that routes requests to appropriate functions
 */
async function routerHandler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  console.log(`[Router] 📣 REQ: ${req.method} ${pathname} | Host: ${req.headers.host} | Origin: ${req.headers.origin}`);

  let handler = null;
  let matchedPath = pathname;

  if (routes[pathname]) {
    handler = routes[pathname];
  } else if (pathname.startsWith('/api') && routes[pathname.replace('/api', '')]) {
    handler = routes[pathname.replace('/api', '')];
  } else if (!pathname.startsWith('/api') && routes['/api' + pathname]) {
    handler = routes['/api' + pathname];
  }

  if (handler) {
    console.log(`[Router] ✅ Matched path: ${pathname}. Method: ${req.method}`);

    // Dynamic CORS Setup
    const origin = req.headers.origin || req.headers.Origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-Init-Data, Authorization, Accept');
    res.setHeader('Access-Control-Max-Age', '86400'); // Cache CORS for 24 hours

    // If it's an OPTIONS request, we can stop here
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    const wrappedHandler = wrapNetlifyFunction(handler.handler || handler);
    return wrappedHandler(req, res);
  }

  // Default to bot handler for everything else (webhook, unknown paths)
  console.log(`[Router] 🤖 Route ${pathname} not in map, defaulting to botHandler`);
  const wrappedBotHandler = wrapNetlifyFunction(botHandler.handler || botHandler);
  return wrappedBotHandler(req, res);
}

module.exports = routerHandler;
