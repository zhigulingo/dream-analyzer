// Auto-generated wrapper for beta-whitelist-processor
// This allows Netlify functions to run on Vercel without modification
// TODO: Migrate this function to native Vercel format

const { wrapNetlifyFunction } = require('./_netlify-adapter');
const originalHandler = require('../functions/beta-whitelist-processor');

module.exports = wrapNetlifyFunction(originalHandler.handler);
