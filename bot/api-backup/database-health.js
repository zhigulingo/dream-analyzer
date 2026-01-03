// Auto-generated wrapper for database-health
// This allows Netlify functions to run on Vercel without modification
// TODO: Migrate this function to native Vercel format

const { wrapNetlifyFunction } = require('./_netlify-adapter');
const originalHandler = require('../functions/database-health');

module.exports = wrapNetlifyFunction(originalHandler.handler);
