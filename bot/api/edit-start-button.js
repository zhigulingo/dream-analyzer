// Auto-generated wrapper for edit-start-button
// This allows Netlify functions to run on Vercel without modification
// TODO: Migrate this function to native Vercel format

const { wrapNetlifyFunction } = require('./_netlify-adapter');
const originalHandler = require('../functions/edit-start-button');

module.exports = wrapNetlifyFunction(originalHandler.handler);
