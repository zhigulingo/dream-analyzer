// Auto-generated wrapper for migrate-onboarding
// This allows Netlify functions to run on Vercel without modification
// TODO: Migrate this function to native Vercel format

const { wrapNetlifyFunction } = require('./_netlify-adapter');
const originalHandler = require('../functions/migrate-onboarding');

module.exports = wrapNetlifyFunction(originalHandler.handler);
