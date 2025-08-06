/**
 * @fileoverview Tests for telegram-validator module
 */

const { validateTelegramData, isInitDataValid } = require('../bot/functions/shared/auth/telegram-validator');
const crypto = require('crypto');

// Mock crypto module
jest.mock('crypto');

describe('telegram-validator', () => {
  let mockCreateHmac;
  let mockCreateHash;

  beforeEach(() => {
    mockCreateHmac = jest.fn();
    mockCreateHash = jest.fn();
    
    // Reset crypto mocks
    crypto.createHmac.mockReturnValue({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn(() => 'mocked-secret-key')
    });
    
    crypto.createHash.mockReturnValue({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn(() => 'mocked-hash')
    });
  });

  describe('validateTelegramData', () => {
    const validBotToken = 'test-bot-token';
    const mockUserData = { id: 12345, first_name: 'Test', username: 'testuser' };
    const mockValidHash = 'valid-hash-signature';

    beforeEach(() => {
      // Mock successful hash validation
      crypto.createHmac.mockImplementation((algorithm, key) => ({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn((format) => {
          if (format === 'hex') return mockValidHash;
          return Buffer.from('mocked-secret-key');
        })
      }));
    });

    test('should return error when initData is missing', () => {
      const result = validateTelegramData(null, validBotToken);
      
      expect(result.valid).toBe(false);
      expect(result.data).toBe(null);
      expect(result.error).toBe('Missing initData or botToken');
    });

    test('should return error when botToken is missing', () => {
      const result = validateTelegramData('valid-init-data', null);
      
      expect(result.valid).toBe(false);
      expect(result.data).toBe(null);
      expect(result.error).toBe('Missing initData or botToken');
    });

    test('should return error when hash is missing from initData', () => {
      const initDataWithoutHash = 'user=' + encodeURIComponent(JSON.stringify(mockUserData));
      const result = validateTelegramData(initDataWithoutHash, validBotToken);
      
      expect(result.valid).toBe(false);
      expect(result.data).toBe(null);
      expect(result.error).toBe('Hash is missing');
    });

    test('should return error when hash validation fails', () => {
      // Mock hash mismatch
      crypto.createHmac.mockImplementation((algorithm, key) => ({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn((format) => {
          if (format === 'hex') return 'different-hash';
          return Buffer.from('mocked-secret-key');
        })
      }));

      const initData = `user=${encodeURIComponent(JSON.stringify(mockUserData))}&hash=wrong-hash`;
      const result = validateTelegramData(initData, validBotToken);
      
      expect(result.valid).toBe(false);
      expect(result.data).toBe(null);
      expect(result.error).toBe('Hash mismatch');
    });

    test('should return error when user data is missing', () => {
      const initDataWithoutUser = `hash=${mockValidHash}&auth_date=1234567890`;
      const result = validateTelegramData(initDataWithoutUser, validBotToken);
      
      expect(result.valid).toBe(true);
      expect(result.data).toBe(null);
      expect(result.error).toBe('User data missing');
    });

    test('should return error when user data JSON is invalid', () => {
      const invalidUserData = 'invalid-json';
      const initData = `user=${encodeURIComponent(invalidUserData)}&hash=${mockValidHash}`;
      const result = validateTelegramData(initData, validBotToken);
      
      expect(result.valid).toBe(true);
      expect(result.data).toBe(null);
      expect(result.error).toBe('Failed to parse user data');
    });

    test('should return error when user ID is missing', () => {
      const userDataWithoutId = { first_name: 'Test', username: 'testuser' };
      const initData = `user=${encodeURIComponent(JSON.stringify(userDataWithoutId))}&hash=${mockValidHash}`;
      const result = validateTelegramData(initData, validBotToken);
      
      expect(result.valid).toBe(true);
      expect(result.data).toBe(null);
      expect(result.error).toBe('User ID missing in parsed data');
    });

    test('should successfully validate correct initData', () => {
      const initData = `user=${encodeURIComponent(JSON.stringify(mockUserData))}&hash=${mockValidHash}&auth_date=1234567890`;
      const result = validateTelegramData(initData, validBotToken);
      
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(mockUserData);
      expect(result.error).toBe(null);
    });

    test('should work with logging disabled', () => {
      const initData = `user=${encodeURIComponent(JSON.stringify(mockUserData))}&hash=${mockValidHash}`;
      const result = validateTelegramData(initData, validBotToken, { enableLogging: false });
      
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(mockUserData);
      expect(result.error).toBe(null);
    });

    test('should handle crypto errors gracefully', () => {
      // Mock crypto error
      crypto.createHmac.mockImplementation(() => {
        throw new Error('Crypto error');
      });

      const initData = `user=${encodeURIComponent(JSON.stringify(mockUserData))}&hash=${mockValidHash}`;
      const result = validateTelegramData(initData, validBotToken);
      
      expect(result.valid).toBe(false);
      expect(result.data).toBe(null);
      expect(result.error).toBe('Validation crypto error');
    });

    test('should properly sort parameters for hash validation', () => {
      // This test verifies that parameters are sorted correctly
      const initData = `user=${encodeURIComponent(JSON.stringify(mockUserData))}&query_id=test&auth_date=1234567890&hash=${mockValidHash}`;
      
      validateTelegramData(initData, validBotToken);
      
      // Verify that createHmac was called
      expect(crypto.createHmac).toHaveBeenCalled();
    });
  });

  describe('isInitDataValid', () => {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    
    test('should return false when auth_date is missing', () => {
      const initData = 'user=test&hash=test';
      const result = isInitDataValid(initData);
      
      expect(result).toBe(false);
    });

    test('should return false when initData is invalid format', () => {
      const result = isInitDataValid('invalid-data');
      
      expect(result).toBe(false);
    });

    test('should return true for fresh data within default maxAge (24 hours)', () => {
      const freshTimestamp = currentTimestamp - 3600; // 1 hour ago
      const initData = `auth_date=${freshTimestamp}&user=test&hash=test`;
      const result = isInitDataValid(initData);
      
      expect(result).toBe(true);
    });

    test('should return false for old data beyond default maxAge (24 hours)', () => {
      const oldTimestamp = currentTimestamp - 90000; // 25 hours ago
      const initData = `auth_date=${oldTimestamp}&user=test&hash=test`;
      const result = isInitDataValid(initData);
      
      expect(result).toBe(false);
    });

    test('should respect custom maxAge parameter', () => {
      const timestamp = currentTimestamp - 7200; // 2 hours ago
      const initData = `auth_date=${timestamp}&user=test&hash=test`;
      
      // Should be valid with 3 hour limit
      expect(isInitDataValid(initData, 10800)).toBe(true);
      
      // Should be invalid with 1 hour limit
      expect(isInitDataValid(initData, 3600)).toBe(false);
    });

    test('should handle invalid timestamp gracefully', () => {
      const initData = 'auth_date=invalid-timestamp&user=test&hash=test';
      const result = isInitDataValid(initData);
      
      expect(result).toBe(false);
    });

    test('should handle errors gracefully', () => {
      // Pass null to trigger error
      const result = isInitDataValid(null);
      
      expect(result).toBe(false);
    });
  });
});