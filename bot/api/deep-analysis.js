// Auto-generated wrapper for deep-analysis
// This allows Netlify functions to run on Vercel without modification
// TODO: Migrate this function to native Vercel format

const { wrapNetlifyFunction } = require('./_netlify-adapter');
const originalHandler = require('../functions/deep-analysis');

module.exports = wrapNetlifyFunction(originalHandler.handler);
