// Auto-generated wrapper for send-survey-announcement
// This allows Netlify functions to run on Vercel without modification
// TODO: Migrate this function to native Vercel format

const { wrapNetlifyFunction } = require('./_netlify-adapter');
const originalHandler = require('../functions/send-survey-announcement');

module.exports = wrapNetlifyFunction(originalHandler.handler);
