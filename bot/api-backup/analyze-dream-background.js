// Auto-generated wrapper for analyze-dream-background
// This allows Netlify functions to run on Vercel without modification
// TODO: Migrate this function to native Vercel format

const { wrapNetlifyFunction } = require('./_netlify-adapter');
const originalHandler = require('../functions/analyze-dream-background');

module.exports = wrapNetlifyFunction(originalHandler.handler);
