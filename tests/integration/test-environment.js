/**
 * Integration Test Environment Setup
 * Configures test environment for Netlify Functions testing
 */

const { createClient } = require("@supabase/supabase-js");
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Test environment variables
const TEST_ENV = {
  SUPABASE_URL: process.env.TEST_SUPABASE_URL || process.env.SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.TEST_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  JWT_SECRET: process.env.TEST_JWT_SECRET || 'test-jwt-secret-key-for-testing',
  GEMINI_API_KEY: process.env.TEST_GEMINI_API_KEY || 'test-gemini-api-key',
  BOT_TOKEN: process.env.TEST_BOT_TOKEN || 'test-bot-token',
  ALLOWED_TMA_ORIGIN: 'https://test-tma.netlify.app',
  ALLOWED_WEB_ORIGIN: 'https://test-web.netlify.app'
};

// Setup environment variables for tests
function setupTestEnvironment() {
  Object.keys(TEST_ENV).forEach(key => {
    process.env[key] = TEST_ENV[key];
  });
}

// Create test database client
function createTestDatabaseClient() {
  return createClient(TEST_ENV.SUPABASE_URL, TEST_ENV.SUPABASE_SERVICE_KEY);
}

// Generate test JWT token
function generateTestJWT(tgId, expiresIn = '1h') {
  const payload = {
    tgId: tgId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (typeof expiresIn === 'string' ? 3600 : expiresIn)
  };
  return jwt.sign(payload, TEST_ENV.JWT_SECRET);
}

// Create test Telegram data for validation
function createTestTelegramData(tgId, username = 'testuser') {
  const botToken = TEST_ENV.BOT_TOKEN.split(':')[1];
  const dataString = `id=${tgId}&username=${username}&auth_date=${Math.floor(Date.now() / 1000)}`;
  const hash = crypto
    .createHmac('sha256', crypto.createHash('sha256').update(botToken).digest())
    .update(dataString)
    .digest('hex');
  
  return {
    id: tgId,
    username: username,
    auth_date: Math.floor(Date.now() / 1000),
    hash: hash
  };
}

// Mock Netlify event object
function createMockNetlifyEvent(options = {}) {
  const {
    httpMethod = 'POST',
    path = '/',
    body = null,
    headers = {},
    queryStringParameters = null
  } = options;

  return {
    httpMethod,
    path,
    body: body ? JSON.stringify(body) : null,
    headers: {
      'content-type': 'application/json',
      ...headers
    },
    queryStringParameters,
    isBase64Encoded: false
  };
}

// Mock Netlify context object
function createMockNetlifyContext() {
  return {
    functionName: 'test-function',
    functionVersion: '1',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
    memoryLimitInMB: '1024',
    getRemainingTimeInMillis: () => 5000
  };
}

// Test data generators
const TestDataGenerator = {
  // Generate random test user
  createTestUser: (overrides = {}) => ({
    tg_id: Math.floor(Math.random() * 1000000),
    subscription_type: 'free',
    tokens: 0,
    deep_analysis_credits: 0,
    channel_reward_claimed: false,
    ...overrides
  }),

  // Generate test dream text
  createTestDream: () => {
    const dreams = [
      "I dreamt I was flying over a vast ocean with golden wings",
      "In my dream, I was walking through a forest of crystal trees", 
      "I saw myself climbing a mountain made of books and knowledge",
      "I dreamt about being in a library where books could talk",
      "In the dream, I was swimming in a sea of stars and cosmic dust"
    ];
    return dreams[Math.floor(Math.random() * dreams.length)];
  },

  // Generate test analysis
  createTestAnalysis: () => ({
    symbols: "Freedom, transformation, spiritual journey",
    interpretation: "This dream represents your desire for liberation and personal growth",
    emotions: "Joy, wonder, curiosity about the unknown",
    advice: "Embrace change and trust in your ability to soar above challenges"
  })
};

module.exports = {
  setupTestEnvironment,
  createTestDatabaseClient,
  generateTestJWT,
  createTestTelegramData,
  createMockNetlifyEvent,
  createMockNetlifyContext,
  TestDataGenerator,
  TEST_ENV
};