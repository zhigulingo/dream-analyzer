// Auto-generated wrapper for set-webhook
// This allows Netlify functions to run on Vercel without modification
// TODO: Migrate this function to native Vercel format

const { wrapNetlifyFunction } = require('./_netlify-adapter');
const originalHandler = require('../functions/set-webhook');

module.exports = wrapNetlifyFunction(originalHandler.handler);
