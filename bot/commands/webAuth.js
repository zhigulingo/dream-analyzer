const { Markup } = require('telegraf');
const webAuthFlow = require('../auth/webAuthFlow');

/**
 * Handler for /weblogin command
 * Initiates web authentication flow for the user
 */
async function handleWebLoginCommand(ctx) {
  try {
    // Extract user data
    const user = ctx.from;
    
    if (!user || !user.id) {
      return await ctx.reply('Error: Unable to identify user.');
    }
    
    // Create a new authentication request
    const authRequest = webAuthFlow.createAuthRequest(user.id, {
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name
    });
    
    // Create deep link for web app with session ID
    const webAppUrl = `https://dream-analyzer.netlify.app?session=${authRequest.sessionId}`;
    
    // Send confirmation message with link to web app
    await ctx.reply(
      `🔐 Web Login Request Created\n\n` +
      `This request will expire in 5 minutes.\n\n` +
      `Once you approve this request, you'll be able to access your Dream Analyzer account in the web app.`,
      {
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.url('Open Web App', webAppUrl)],
          [Markup.button.callback('✅ Approve Login', `approve_auth:${authRequest.sessionId}`)],
          [Markup.button.callback('❌ Deny Login', `deny_auth:${authRequest.sessionId}`)]
        ])
      }
    );
    
    console.log(`Web login request created for user ${user.id}, session ${authRequest.sessionId}`);
    
  } catch (error) {
    console.error('Error handling web login command:', error);
    await ctx.reply('Sorry, an error occurred while creating your login request. Please try again later.');
  }
}

/**
 * Handler for web login approval callback
 */
async function handleApproveAuthCallback(ctx) {
  try {
    // Extract session ID from callback data
    const sessionId = ctx.callbackQuery.data.split(':')[1];
    
    if (!sessionId) {
      return await ctx.answerCbQuery('Invalid authentication request.');
    }
    
    // Check if this user is authorized to approve this request
    const authRequestStatus = webAuthFlow.checkAuthRequestStatus(sessionId);
    
    if (!authRequestStatus.exists) {
      await ctx.answerCbQuery('This authentication request has expired or does not exist.');
      return await ctx.editMessageText(
        '❌ Authentication request expired or invalid.\n\nPlease create a new login request by typing /weblogin.',
        { reply_markup: { inline_keyboard: [] } }
      );
    }
    
    if (authRequestStatus.userId !== ctx.from.id) {
      return await ctx.answerCbQuery('You are not authorized to approve this request.');
    }
    
    // Approve the request
    const approvalResult = await webAuthFlow.approveAuthRequest(sessionId);
    
    if (!approvalResult.success) {
      await ctx.answerCbQuery('Failed to approve authentication request.');
      return await ctx.editMessageText(
        `❌ Failed to approve authentication: ${approvalResult.error}\n\nPlease try again with a new request.`,
        { reply_markup: { inline_keyboard: [] } }
      );
    }
    
    // Generate a web app link with the token
    const tokenParam = encodeURIComponent(approvalResult.token);
    const webAppUrl = `https://dream-analyzer.netlify.app?auth_token=${tokenParam}`;
    
    // Update the message
    await ctx.editMessageText(
      '✅ Authentication approved!\n\n' +
      'You can now access your Dream Analyzer account in the web app.\n\n' +
      'Click the button below to open the web app with your approved session.',
      {
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.url('Open Web App', webAppUrl)]
        ])
      }
    );
    
    await ctx.answerCbQuery('Authentication approved!');
    
  } catch (error) {
    console.error('Error handling auth approval:', error);
    await ctx.answerCbQuery('An error occurred. Please try again.');
  }
}

/**
 * Handler for web login denial callback
 */
async function handleDenyAuthCallback(ctx) {
  try {
    // Extract session ID from callback data
    const sessionId = ctx.callbackQuery.data.split(':')[1];
    
    if (!sessionId) {
      return await ctx.answerCbQuery('Invalid authentication request.');
    }
    
    // Check if this user is authorized to deny this request
    const authRequestStatus = webAuthFlow.checkAuthRequestStatus(sessionId);
    
    if (!authRequestStatus.exists) {
      await ctx.answerCbQuery('This authentication request has expired or does not exist.');
      return await ctx.editMessageText(
        '❌ Authentication request expired or invalid.',
        { reply_markup: { inline_keyboard: [] } }
      );
    }
    
    if (authRequestStatus.userId !== ctx.from.id) {
      return await ctx.answerCbQuery('You are not authorized to deny this request.');
    }
    
    // Deny the request
    const denialResult = webAuthFlow.denyAuthRequest(sessionId);
    
    if (!denialResult.success) {
      await ctx.answerCbQuery('Failed to deny authentication request.');
      return await ctx.editMessageText(
        `❌ Failed to deny authentication: ${denialResult.error}`,
        { reply_markup: { inline_keyboard: [] } }
      );
    }
    
    // Update the message
    await ctx.editMessageText(
      '❌ Authentication denied.\n\n' +
      'You have denied this login request. If you want to log in later, please create a new request using /weblogin.',
      { reply_markup: { inline_keyboard: [] } }
    );
    
    await ctx.answerCbQuery('Authentication denied.');
    
  } catch (error) {
    console.error('Error handling auth denial:', error);
    await ctx.answerCbQuery('An error occurred. Please try again.');
  }
}

/**
 * Register web authentication commands with the bot
 * @param {Telegraf} bot - Telegraf bot instance
 */
function registerWebAuthCommands(bot) {
  // Command to initiate web authentication
  bot.command('weblogin', handleWebLoginCommand);
  
  // Handle the start command with web login parameter
  bot.hears(/\/start weblogin/, handleWebLoginCommand);
  
  // Callback handlers for approval/denial
  bot.action(/approve_auth:(.+)/, handleApproveAuthCallback);
  bot.action(/deny_auth:(.+)/, handleDenyAuthCallback);
  
  console.log('Web authentication commands registered');
}

module.exports = {
  registerWebAuthCommands
}; 