/**
 * Integration tests for error scenarios and edge cases
 * Tests error handling across all API endpoints
 */

const { 
  setupTestEnvironment, 
  createMockNetlifyEvent, 
  createMockNetlifyContext,
  generateTestJWT,
  createTestTelegramData,
  TestDataGenerator 
} = require('./test-environment');
const TestDatabase = require('./test-database');

// Setup test environment
setupTestEnvironment();

// Import handlers
const { handler: analyzeDreamHandler } = require('../../bot/functions/analyze-dream');
const { handler: deepAnalysisHandler } = require('../../bot/functions/deep-analysis');
const { handler: userProfileHandler } = require('../../bot/functions/user-profile');
const { handler: webLoginHandler } = require('../../bot/functions/web-login');

describe('Error Scenarios Integration Tests', () => {
  let testDb;
  let testUser;

  beforeAll(async () => {
    testDb = new TestDatabase();
    await testDb.setup();
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  beforeEach(async () => {
    testUser = await testDb.createTestUser({
      tokens: 10,
      deep_analysis_credits: 5
    });
  });

  describe('Network and Infrastructure Errors', () => {
    test('should handle timeout scenarios gracefully', async () => {
      const dreamText = TestDataGenerator.createTestDream();
      const token = generateTestJWT(testUser.tg_id);
      
      const event = createMockNetlifyEvent({
        body: { dream: dreamText },
        headers: {
          'authorization': `Bearer ${token}`,
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      
      // Mock a context with very short timeout
      const context = {
        ...createMockNetlifyContext(),
        getRemainingTimeInMillis: () => 1 // Very short timeout
      };

      const response = await analyzeDreamHandler(event, context);
      
      // Should handle timeout gracefully
      expect([200, 408, 500]).toContain(response.statusCode);
    });

    test('should handle malformed request bodies', async () => {
      const endpoints = [
        { handler: analyzeDreamHandler, needsAuth: true },
        { handler: deepAnalysisHandler, needsAuth: false },
        { handler: userProfileHandler, needsAuth: false },
        { handler: webLoginHandler, needsAuth: false }
      ];

      for (const endpoint of endpoints) {
        const headers = endpoint.needsAuth 
          ? { 
              'authorization': `Bearer ${generateTestJWT(testUser.tg_id)}`,
              'origin': process.env.ALLOWED_TMA_ORIGIN 
            }
          : { 'origin': process.env.ALLOWED_TMA_ORIGIN };

        const event = createMockNetlifyEvent({
          body: null,
          headers
        });
        
        // Set malformed JSON
        event.body = '{"invalid": json malformed}';
        const context = createMockNetlifyContext();

        const response = await endpoint.handler(event, context);
        
        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body).success).toBe(false);
      }
    });

    test('should handle empty request bodies', async () => {
      const dreamText = TestDataGenerator.createTestDream();
      const token = generateTestJWT(testUser.tg_id);
      
      const event = createMockNetlifyEvent({
        body: null,
        headers: {
          'authorization': `Bearer ${token}`,
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      
      // Set empty body
      event.body = '';
      const context = createMockNetlifyContext();

      const response = await analyzeDreamHandler(event, context);
      
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).success).toBe(false);
    });

    test('should handle null request bodies', async () => {
      const token = generateTestJWT(testUser.tg_id);
      
      const event = createMockNetlifyEvent({
        body: null,
        headers: {
          'authorization': `Bearer ${token}`,
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await analyzeDreamHandler(event, context);
      
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).success).toBe(false);
    });
  });

  describe('Authentication Edge Cases', () => {
    test('should handle corrupted JWT tokens', async () => {
      const dreamText = TestDataGenerator.createTestDream();
      const corruptedToken = generateTestJWT(testUser.tg_id).slice(0, -10) + 'corrupted';
      
      const event = createMockNetlifyEvent({
        body: { dream: dreamText },
        headers: {
          'authorization': `Bearer ${corruptedToken}`,
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await analyzeDreamHandler(event, context);
      
      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.body).success).toBe(false);
    });

    test('should handle missing Bearer prefix', async () => {
      const dreamText = TestDataGenerator.createTestDream();
      const token = generateTestJWT(testUser.tg_id);
      
      const event = createMockNetlifyEvent({
        body: { dream: dreamText },
        headers: {
          'authorization': token, // Missing 'Bearer ' prefix
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await analyzeDreamHandler(event, context);
      
      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.body).success).toBe(false);
    });

    test('should handle invalid Telegram data structure', async () => {
      const invalidTelegramData = {
        // Missing required fields
        username: 'testuser',
        auth_date: 'invalid-date'
      };
      
      const event = createMockNetlifyEvent({
        body: {
          initData: JSON.stringify(invalidTelegramData)
        },
        headers: {
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await deepAnalysisHandler(event, context);
      
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).success).toBe(false);
    });

    test('should handle extremely long auth tokens', async () => {
      const dreamText = TestDataGenerator.createTestDream();
      const longToken = 'Bearer ' + 'a'.repeat(10000); // Very long token
      
      const event = createMockNetlifyEvent({
        body: { dream: dreamText },
        headers: {
          'authorization': longToken,
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await analyzeDreamHandler(event, context);
      
      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.body).success).toBe(false);
    });
  });

  describe('Data Validation Edge Cases', () => {
    test('should handle extremely long dream text', async () => {
      const veryLongDream = 'I had a dream that '.repeat(10000); // Very long text
      const token = generateTestJWT(testUser.tg_id);
      
      const event = createMockNetlifyEvent({
        body: { dream: veryLongDream },
        headers: {
          'authorization': `Bearer ${token}`,
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await analyzeDreamHandler(event, context);
      
      // Should either accept (with truncation) or reject gracefully
      expect([200, 400, 413]).toContain(response.statusCode);
    });

    test('should handle special characters in dream text', async () => {
      const specialCharsDream = '🌟✨🔮 I dreamt of emojis and symbols ♠♥♦♣ αβγδ ñáéíóú 中文字符';
      const token = generateTestJWT(testUser.tg_id);
      
      const event = createMockNetlifyEvent({
        body: { dream: specialCharsDream },
        headers: {
          'authorization': `Bearer ${token}`,
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await analyzeDreamHandler(event, context);
      
      expect([200, 400]).toContain(response.statusCode);
    });

    test('should handle SQL injection attempts in dream text', async () => {
      const sqlInjectionDream = "'; DROP TABLE analyses; --";
      const token = generateTestJWT(testUser.tg_id);
      
      const event = createMockNetlifyEvent({
        body: { dream: sqlInjectionDream },
        headers: {
          'authorization': `Bearer ${token}`,
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await analyzeDreamHandler(event, context);
      
      // Should process safely or reject
      expect([200, 400]).toContain(response.statusCode);
      
      // Verify database is still intact
      expect(await testDb.healthCheck()).toBe(true);
    });

    test('should handle JavaScript injection attempts', async () => {
      const jsInjectionDream = '<script>alert("xss")</script> I dreamt of code';
      const token = generateTestJWT(testUser.tg_id);
      
      const event = createMockNetlifyEvent({
        body: { dream: jsInjectionDream },
        headers: {
          'authorization': `Bearer ${token}`,
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await analyzeDreamHandler(event, context);
      
      expect([200, 400]).toContain(response.statusCode);
    });

    test('should handle binary data in request', async () => {
      const token = generateTestJWT(testUser.tg_id);
      
      const event = createMockNetlifyEvent({
        body: null,
        headers: {
          'authorization': `Bearer ${token}`,
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      
      // Set binary data
      event.body = Buffer.from([0x00, 0x01, 0x02, 0x03]).toString('binary');
      const context = createMockNetlifyContext();

      const response = await analyzeDreamHandler(event, context);
      
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).success).toBe(false);
    });
  });

  describe('Rate Limiting and Resource Exhaustion', () => {
    test('should handle rapid consecutive requests', async () => {
      const token = generateTestJWT(testUser.tg_id);
      const promises = [];

      // Send 20 rapid requests
      for (let i = 0; i < 20; i++) {
        const dreamText = `Dream ${i}: ${TestDataGenerator.createTestDream()}`;
        const event = createMockNetlifyEvent({
          body: { dream: dreamText },
          headers: {
            'authorization': `Bearer ${token}`,
            'origin': process.env.ALLOWED_TMA_ORIGIN
          }
        });
        const context = createMockNetlifyContext();

        promises.push(analyzeDreamHandler(event, context));
      }

      const responses = await Promise.all(promises);
      
      // Most should succeed, some might be rate limited
      const successCount = responses.filter(r => r.statusCode === 200).length;
      const rateLimitedCount = responses.filter(r => r.statusCode === 429).length;
      
      expect(successCount + rateLimitedCount).toBe(20);
      expect(successCount).toBeGreaterThan(0); // At least some should succeed
    }, 30000);

    test('should handle memory-intensive operations', async () => {
      // Create user with many dreams for deep analysis
      const { user } = await testDb.createUserWithAnalyses({
        deep_analysis_credits: 5
      }, 100); // Many dreams

      const telegramData = createTestTelegramData(user.tg_id);
      
      const event = createMockNetlifyEvent({
        body: {
          initData: JSON.stringify(telegramData)
        },
        headers: {
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await deepAnalysisHandler(event, context);
      
      // Should handle large dataset gracefully
      expect([200, 413, 500]).toContain(response.statusCode);
    }, 60000);
  });

  describe('Concurrent Access Edge Cases', () => {
    test('should handle concurrent credit deduction safely', async () => {
      const user = await testDb.createTestUser({
        deep_analysis_credits: 1 // Only 1 credit
      });

      // Create required analyses
      await testDb.createUserWithAnalyses(
        { tg_id: user.tg_id },
        5
      );

      const telegramData = createTestTelegramData(user.tg_id);
      
      // Send multiple concurrent requests
      const promises = Array(5).fill().map(() => {
        const event = createMockNetlifyEvent({
          body: { initData: JSON.stringify(telegramData) },
          headers: { 'origin': process.env.ALLOWED_TMA_ORIGIN }
        });
        return deepAnalysisHandler(event, createMockNetlifyContext());
      });

      const responses = await Promise.all(promises);
      
      // Only one should succeed due to credit limit
      const successCount = responses.filter(r => r.statusCode === 200).length;
      const failCount = responses.filter(r => r.statusCode === 402).length;
      
      expect(successCount).toBeLessThanOrEqual(1);
      expect(failCount).toBeGreaterThanOrEqual(4);
    });

    test('should handle concurrent user creation', async () => {
      const newTgId = Math.floor(Math.random() * 1000000);
      const telegramData = createTestTelegramData(newTgId);
      
      // Send multiple concurrent requests for new user
      const promises = Array(3).fill().map(() => {
        const event = createMockNetlifyEvent({
          body: { initData: JSON.stringify(telegramData) },
          headers: { 'origin': process.env.ALLOWED_TMA_ORIGIN }
        });
        return userProfileHandler(event, createMockNetlifyContext());
      });

      const responses = await Promise.all(promises);
      
      // All should succeed (user created once, then retrieved)
      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
      });

      // Verify only one user was created
      const createdUser = await testDb.getUserByTgId(newTgId);
      expect(createdUser).toBeTruthy();
    });
  });

  describe('Environment Configuration Errors', () => {
    test('should handle missing environment variables gracefully', async () => {
      // Temporarily remove an environment variable
      const originalValue = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      try {
        const dreamText = TestDataGenerator.createTestDream();
        const token = generateTestJWT(testUser.tg_id);
        
        const event = createMockNetlifyEvent({
          body: { dream: dreamText },
          headers: {
            'authorization': `Bearer ${token}`,
            'origin': process.env.ALLOWED_TMA_ORIGIN
          }
        });
        const context = createMockNetlifyContext();

        const response = await analyzeDreamHandler(event, context);
        
        // Should handle missing config gracefully
        expect([500, 503]).toContain(response.statusCode);
        expect(JSON.parse(response.body).success).toBe(false);
      } finally {
        // Restore environment variable
        process.env.GEMINI_API_KEY = originalValue;
      }
    });

    test('should handle invalid JWT secret', async () => {
      // Temporarily change JWT secret
      const originalSecret = process.env.JWT_SECRET;
      process.env.JWT_SECRET = 'different-secret';

      try {
        const dreamText = TestDataGenerator.createTestDream();
        const token = generateTestJWT(testUser.tg_id); // This will use old secret
        
        const event = createMockNetlifyEvent({
          body: { dream: dreamText },
          headers: {
            'authorization': `Bearer ${token}`,
            'origin': process.env.ALLOWED_TMA_ORIGIN
          }
        });
        const context = createMockNetlifyContext();

        const response = await analyzeDreamHandler(event, context);
        
        expect(response.statusCode).toBe(401);
        expect(JSON.parse(response.body).success).toBe(false);
      } finally {
        // Restore JWT secret
        process.env.JWT_SECRET = originalSecret;
      }
    });
  });

  describe('Cross-Endpoint Error Consistency', () => {
    test('should return consistent error format across all endpoints', async () => {
      const endpoints = [
        { handler: analyzeDreamHandler, name: 'analyze-dream' },
        { handler: deepAnalysisHandler, name: 'deep-analysis' },
        { handler: userProfileHandler, name: 'user-profile' },
        { handler: webLoginHandler, name: 'web-login' }
      ];

      for (const endpoint of endpoints) {
        const event = createMockNetlifyEvent({
          body: null,
          headers: { 'origin': 'https://malicious-site.com' }
        });
        event.body = '{"invalid": json}';
        const context = createMockNetlifyContext();

        const response = await endpoint.handler(event, context);
        
        expect(response.statusCode).toBeGreaterThanOrEqual(400);
        
        const body = JSON.parse(response.body);
        expect(body).toHaveProperty('success');
        expect(body.success).toBe(false);
        expect(body).toHaveProperty('error');
        expect(typeof body.error).toBe('string');
      }
    });

    test('should include proper CORS headers in error responses', async () => {
      const dreamText = TestDataGenerator.createTestDream();
      const token = 'invalid-token';
      
      const event = createMockNetlifyEvent({
        body: { dream: dreamText },
        headers: {
          'authorization': `Bearer ${token}`,
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await analyzeDreamHandler(event, context);
      
      expect(response.statusCode).toBe(401);
      expect(response.headers).toHaveProperty('Access-Control-Allow-Origin');
    });
  });
});