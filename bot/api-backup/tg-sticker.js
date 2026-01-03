// Auto-generated wrapper for tg-sticker
// This allows Netlify functions to run on Vercel without modification
// TODO: Migrate this function to native Vercel format

const { wrapNetlifyFunction } = require('./_netlify-adapter');
const originalHandler = require('../functions/tg-sticker');

module.exports = wrapNetlifyFunction(originalHandler.handler);
