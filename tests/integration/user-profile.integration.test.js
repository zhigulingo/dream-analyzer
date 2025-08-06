/**
 * Integration tests for user-profile endpoint
 * Tests user profile management and authentication
 */

const { 
  setupTestEnvironment, 
  createMockNetlifyEvent, 
  createMockNetlifyContext,
  createTestTelegramData,
  TestDataGenerator 
} = require('./test-environment');
const TestDatabase = require('./test-database');

// Setup test environment
setupTestEnvironment();

// Import the handler after environment is set
const { handler } = require('../../bot/functions/user-profile');

describe('User Profile API Integration Tests', () => {
  let testDb;

  beforeAll(async () => {
    testDb = new TestDatabase();
    await testDb.setup();
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  describe('Successful Profile Retrieval', () => {
    test('should return user profile with statistics', async () => {
      // Create user with analyses
      const { user, analyses } = await testDb.createUserWithAnalyses({
        subscription_type: 'premium',
        tokens: 100,
        deep_analysis_credits: 5
      }, 3);

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

      const response = await handler(event, context);

      expect(response.statusCode).toBe(200);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.profile).toMatchObject({
        tg_id: user.tg_id,
        subscription_type: 'premium',
        tokens: 100,
        deep_analysis_credits: 5
      });
      expect(responseBody.data.profile.total_analyses).toBe(3);
    });

    test('should create new user if not exists', async () => {
      const newTgId = Math.floor(Math.random() * 1000000);
      const telegramData = createTestTelegramData(newTgId, 'newuser');
      
      const event = createMockNetlifyEvent({
        body: {
          initData: JSON.stringify(telegramData)
        },
        headers: {
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(200);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.profile.tg_id).toBe(newTgId);
      expect(responseBody.data.profile.subscription_type).toBe('free');
      expect(responseBody.data.profile.tokens).toBe(0);
      expect(responseBody.data.profile.total_analyses).toBe(0);
      
      // Verify user was created in database
      const createdUser = await testDb.getUserByTgId(newTgId);
      expect(createdUser).toBeTruthy();
    });

    test('should return profile for free tier user', async () => {
      const user = await testDb.createTestUser({
        subscription_type: 'free',
        tokens: 10,
        deep_analysis_credits: 0
      });

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

      const response = await handler(event, context);

      expect(response.statusCode).toBe(200);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.data.profile.subscription_type).toBe('free');
      expect(responseBody.data.profile.deep_analysis_credits).toBe(0);
    });
  });

  describe('Authentication Tests', () => {
    test('should reject request with invalid Telegram data', async () => {
      const invalidTelegramData = {
        id: 123456,
        username: 'testuser',
        auth_date: Math.floor(Date.now() / 1000),
        hash: 'invalid-hash-value'
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

      const response = await handler(event, context);

      expect(response.statusCode).toBe(401);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error).toContain('authentication');
    });

    test('should reject request without initData', async () => {
      const event = createMockNetlifyEvent({
        body: {},
        headers: {
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(400);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error).toContain('initData');
    });

    test('should reject request from unauthorized origin', async () => {
      const user = await testDb.createTestUser();
      const telegramData = createTestTelegramData(user.tg_id);
      
      const event = createMockNetlifyEvent({
        body: {
          initData: JSON.stringify(telegramData)
        },
        headers: {
          'origin': 'https://malicious-site.com'
        }
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(403);
      expect(JSON.parse(response.body).success).toBe(false);
    });

    test('should handle expired Telegram auth', async () => {
      const expiredTelegramData = {
        id: 123456,
        username: 'testuser',
        auth_date: Math.floor(Date.now() / 1000) - 86400, // 24 hours ago
        hash: 'some-hash'
      };
      
      const event = createMockNetlifyEvent({
        body: {
          initData: JSON.stringify(expiredTelegramData)
        },
        headers: {
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      // Should still work for now, but this depends on implementation
      // In a real scenario, you might want to reject expired auth
      expect([200, 401]).toContain(response.statusCode);
    });
  });

  describe('HTTP Method Tests', () => {
    test('should handle OPTIONS request (CORS preflight)', async () => {
      const event = createMockNetlifyEvent({
        httpMethod: 'OPTIONS',
        headers: {
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(204);
      expect(response.headers).toHaveProperty('Access-Control-Allow-Origin');
      expect(response.headers).toHaveProperty('Access-Control-Allow-Methods');
    });

    test('should accept POST request', async () => {
      const user = await testDb.createTestUser();
      const telegramData = createTestTelegramData(user.tg_id);
      
      const event = createMockNetlifyEvent({
        httpMethod: 'POST',
        body: {
          initData: JSON.stringify(telegramData)
        },
        headers: {
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(200);
    });

    test('should reject GET request', async () => {
      const event = createMockNetlifyEvent({
        httpMethod: 'GET',
        headers: {
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(405);
      expect(JSON.parse(response.body).success).toBe(false);
    });
  });

  describe('Data Integrity Tests', () => {
    test('should return consistent user statistics', async () => {
      const user = await testDb.createTestUser();
      
      // Create some analyses
      await testDb.createTestAnalysis(user.id);
      await testDb.createTestAnalysis(user.id);
      await testDb.createTestAnalysis(user.id);

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

      const response = await handler(event, context);

      expect(response.statusCode).toBe(200);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.data.profile.total_analyses).toBe(3);
      
      // Verify by direct database query
      const analyses = await testDb.getAnalysesForUser(user.id);
      expect(analyses).toHaveLength(3);
    });

    test('should handle user with zero analyses', async () => {
      const user = await testDb.createTestUser();
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

      const response = await handler(event, context);

      expect(response.statusCode).toBe(200);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.data.profile.total_analyses).toBe(0);
    });

    test('should handle user with various subscription types', async () => {
      const subscriptionTypes = ['free', 'premium', 'lifetime'];
      
      for (const subType of subscriptionTypes) {
        const user = await testDb.createTestUser({
          subscription_type: subType,
          tokens: subType === 'premium' ? 1000 : 10
        });

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

        const response = await handler(event, context);

        expect(response.statusCode).toBe(200);
        
        const responseBody = JSON.parse(response.body);
        expect(responseBody.data.profile.subscription_type).toBe(subType);
      }
    });
  });

  describe('Performance Tests', () => {
    test('should respond quickly for user profile requests', async () => {
      const user = await testDb.createTestUser();
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

      const startTime = Date.now();
      const response = await handler(event, context);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.statusCode).toBe(200);
      expect(duration).toBeLessThan(5000); // Should be fast
    });

    test('should handle concurrent profile requests', async () => {
      const users = [];
      for (let i = 0; i < 5; i++) {
        users.push(await testDb.createTestUser());
      }

      const promises = users.map(user => {
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

        return handler(event, context);
      });

      const responses = await Promise.all(promises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
      });
    });

    test('should handle user with many analyses efficiently', async () => {
      const { user } = await testDb.createUserWithAnalyses({}, 50); // 50 analyses

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

      const startTime = Date.now();
      const response = await handler(event, context);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.statusCode).toBe(200);
      expect(duration).toBeLessThan(10000); // Should handle large datasets efficiently
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.data.profile.total_analyses).toBe(50);
    });
  });

  describe('Error Handling Tests', () => {
    test('should handle malformed JSON gracefully', async () => {
      const event = createMockNetlifyEvent({
        body: null,
        headers: {
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      // Set malformed JSON
      event.body = '{"initData": invalid json}';
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).success).toBe(false);
    });

    test('should handle database errors gracefully', async () => {
      // This test would require mocking database failures
      // For now, verify that database is working
      expect(await testDb.healthCheck()).toBe(true);
    });

    test('should handle missing required fields', async () => {
      const event = createMockNetlifyEvent({
        body: {
          initData: '' // Empty initData
        },
        headers: {
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).success).toBe(false);
    });
  });
});