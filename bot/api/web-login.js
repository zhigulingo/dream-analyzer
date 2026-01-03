// Auto-generated wrapper for web-login
// This allows Netlify functions to run on Vercel without modification
// TODO: Migrate this function to native Vercel format

const { wrapNetlifyFunction } = require('./_netlify-adapter');
const originalHandler = require('../functions/web-login');

module.exports = wrapNetlifyFunction(originalHandler.handler);
