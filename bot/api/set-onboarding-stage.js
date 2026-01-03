// Auto-generated wrapper for set-onboarding-stage
// This allows Netlify functions to run on Vercel without modification
// TODO: Migrate this function to native Vercel format

const { wrapNetlifyFunction } = require('./_netlify-adapter');
const originalHandler = require('../functions/set-onboarding-stage');

module.exports = wrapNetlifyFunction(originalHandler.handler);
