const crypto = require('crypto');
const axios = require('axios');

// Store pending authentication requests with expiry
// Format: { sessionId: { userId, expiresAt, approved: false } }
const pendingAuthRequests = new Map();

// Secret key for signing auth tokens - should match the one in web functions
const BOT_SECRET = process.env.BOT_SECRET || 'default_bot_secret_key_change_this';

// Time in seconds before auth requests expire
const AUTH_REQUEST_EXPIRY = 300; // 5 minutes

// Time in seconds for token validity
const TOKEN_EXPIRY = 86400 * 7; // 7 days

// API endpoint for the web function
const API_BASE_URL = process.env.API_BASE_URL || 'https://dream-analyzer.netlify.app/.netlify/functions';

/**
 * Generate a unique session ID for auth requests
 * @returns {string} - Unique session ID
 */
function generateSessionId() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Create a new web authentication request
 * @param {number} userId - Telegram user ID
 * @param {object} userData - User data (username, first_name, etc.)
 * @returns {object} - Auth request details
 */
function createAuthRequest(userId, userData) {
  // Generate a unique session ID
  const sessionId = generateSessionId();
  
  // Set expiry time
  const expiresAt = Math.floor(Date.now() / 1000) + AUTH_REQUEST_EXPIRY;
  
  // Store the auth request
  pendingAuthRequests.set(sessionId, {
    userId,
    userData,
    expiresAt,
    approved: false
  });
  
  // Set timeout to clean up expired requests
  setTimeout(() => {
    if (pendingAuthRequests.has(sessionId) && 
        !pendingAuthRequests.get(sessionId).approved) {
      // Only delete if it hasn't been approved (approved ones are deleted after use)
      pendingAuthRequests.delete(sessionId);
      console.log(`Auth request ${sessionId} expired and was removed.`);
    }
  }, AUTH_REQUEST_EXPIRY * 1000);
  
  return {
    sessionId,
    expiresAt
  };
}

/**
 * Approve an authentication request
 * @param {string} sessionId - Session ID of the request to approve
 * @returns {object} - Result of approval (success, token, etc.)
 */
async function approveAuthRequest(sessionId) {
  // Check if the session exists
  if (!pendingAuthRequests.has(sessionId)) {
    return { success: false, error: 'Auth request not found or expired' };
  }
  
  const request = pendingAuthRequests.get(sessionId);
  
  // Check if it's expired
  const now = Math.floor(Date.now() / 1000);
  if (request.expiresAt < now) {
    pendingAuthRequests.delete(sessionId);
    return { success: false, error: 'Auth request expired' };
  }
  
  // Mark as approved
  request.approved = true;
  
  try {
    // Generate authentication token
    const token = generateAuthToken(request.userId, request.userData);
    
    // Remove the request from pending
    pendingAuthRequests.delete(sessionId);
    
    return { 
      success: true, 
      token,
      userId: request.userId,
      expiresAt: Math.floor(Date.now() / 1000) + TOKEN_EXPIRY
    };
  } catch (error) {
    console.error('Error approving auth request:', error);
    return { success: false, error: 'Failed to generate authentication token' };
  }
}

/**
 * Deny an authentication request
 * @param {string} sessionId - Session ID of the request to deny
 * @returns {object} - Result of denial
 */
function denyAuthRequest(sessionId) {
  if (!pendingAuthRequests.has(sessionId)) {
    return { success: false, error: 'Auth request not found or expired' };
  }
  
  // Remove the request
  pendingAuthRequests.delete(sessionId);
  
  return { success: true, message: 'Authentication request denied' };
}

/**
 * Generate an authentication token
 * @param {number} userId - Telegram user ID
 * @param {object} userData - Additional user data
 * @returns {string} - Secure authentication token
 */
function generateAuthToken(userId, userData = {}) {
  const timestamp = Math.floor(Date.now() / 1000);
  const expiry = timestamp + TOKEN_EXPIRY;
  
  // Data to sign
  const payload = {
    user_id: userId,
    user_data: {
      username: userData.username || '',
      first_name: userData.first_name || '',
      last_name: userData.last_name || ''
    },
    issued_at: timestamp,
    expires_at: expiry
  };
  
  const payloadStr = JSON.stringify(payload);
  
  // Create HMAC signature
  const signature = crypto
    .createHmac('sha256', BOT_SECRET)
    .update(payloadStr)
    .digest('hex');
  
  // Combine payload and signature
  const token = Buffer.from(JSON.stringify({
    payload,
    signature
  })).toString('base64');
  
  return token;
}

/**
 * Verify the status of an auth request
 * @param {string} sessionId - Session ID to check
 * @returns {object} - Status information
 */
function checkAuthRequestStatus(sessionId) {
  if (!pendingAuthRequests.has(sessionId)) {
    return { exists: false, error: 'Auth request not found or expired' };
  }
  
  const request = pendingAuthRequests.get(sessionId);
  const now = Math.floor(Date.now() / 1000);
  
  if (request.expiresAt < now) {
    pendingAuthRequests.delete(sessionId);
    return { exists: false, error: 'Auth request expired' };
  }
  
  return { 
    exists: true, 
    approved: request.approved,
    userId: request.userId,
    expiresIn: request.expiresAt - now
  };
}

/**
 * Get auth request details by user ID (find active requests for a user)
 * @param {number} userId - Telegram user ID
 * @returns {Array} - List of active auth requests for the user
 */
function getAuthRequestsByUser(userId) {
  const userRequests = [];
  const now = Math.floor(Date.now() / 1000);
  
  for (const [sessionId, request] of pendingAuthRequests.entries()) {
    if (request.userId === userId && request.expiresAt > now) {
      userRequests.push({
        sessionId,
        expiresAt: request.expiresAt,
        approved: request.approved
      });
    }
  }
  
  return userRequests;
}

/**
 * Clean up expired auth requests
 */
function cleanupExpiredRequests() {
  const now = Math.floor(Date.now() / 1000);
  
  for (const [sessionId, request] of pendingAuthRequests.entries()) {
    if (request.expiresAt < now) {
      pendingAuthRequests.delete(sessionId);
      console.log(`Auth request ${sessionId} cleaned up.`);
    }
  }
}

// Schedule periodic cleanup
setInterval(cleanupExpiredRequests, 60000); // Run every minute

module.exports = {
  createAuthRequest,
  approveAuthRequest,
  denyAuthRequest,
  checkAuthRequestStatus,
  getAuthRequestsByUser,
  generateAuthToken
}; 