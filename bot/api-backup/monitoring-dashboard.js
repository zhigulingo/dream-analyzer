// Auto-generated wrapper for monitoring-dashboard
// This allows Netlify functions to run on Vercel without modification
// TODO: Migrate this function to native Vercel format

const { wrapNetlifyFunction } = require('./_netlify-adapter');
const originalHandler = require('../functions/monitoring-dashboard');

module.exports = wrapNetlifyFunction(originalHandler.handler);
