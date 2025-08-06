/**
 * Jest setup file - runs before all tests
 */

// Load test environment variables from .env.test
require('dotenv').config({ path: '.env.test' });

// Fallback mock environment variables for testing
if (!process.env.TEST_GEMINI_API_KEY) {
  process.env.GEMINI_API_KEY = 'test-api-key';
}

// Global test timeout
jest.setTimeout(30000);

// Suppress console logs during tests unless needed
if (process.env.NODE_ENV !== 'test-verbose') {
  global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

// Reset mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});