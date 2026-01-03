// Auto-generated wrapper for analysis-feedback
// This allows Netlify functions to run on Vercel without modification
// TODO: Migrate this function to native Vercel format

const { wrapNetlifyFunction } = require('./_netlify-adapter');
const originalHandler = require('../functions/analysis-feedback');

module.exports = wrapNetlifyFunction(originalHandler.handler);
