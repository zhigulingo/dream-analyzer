// Auto-generated wrapper for beta-open-access
// This allows Netlify functions to run on Vercel without modification
// TODO: Migrate this function to native Vercel format

const { wrapNetlifyFunction } = require('./_netlify-adapter');
const originalHandler = require('../functions/beta-open-access');

module.exports = wrapNetlifyFunction(originalHandler.handler);
