// Auto-generated wrapper for analysis
// This allows Netlify functions to run on Vercel without modification
// TODO: Migrate this function to native Vercel format

const { wrapNetlifyFunction } = require('./_netlify-adapter');
const originalHandler = require('../functions/analysis');

module.exports = wrapNetlifyFunction(originalHandler.handler);
