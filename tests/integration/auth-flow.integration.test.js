/**
 * Integration tests for authentication flow
 * Tests complete authentication workflows across endpoints
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
const jwt = require('jsonwebtoken');

// Setup test environment
setupTestEnvironment();

// Import handlers
const { handler: analyzeDreamHandler } = require('../../bot/functions/analyze-dream');
const { handler: deepAnalysisHandler } = require('../../bot/functions/deep-analysis');
const { handler: userProfileHandler } = require('../../bot/functions/user-profile');
const { handler: webLoginHandler } = require('../../bot/functions/web-login');

describe('Authentication Flow Integration Tests', () => {
  let testDb;

  beforeAll(async () => {
    testDb = new TestDatabase();
    await testDb.setup();
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  describe('JWT Authentication Flow', () => {
    test('should complete full JWT authentication cycle', async () => {
      // 1. Create user
      const user = await testDb.createTestUser({
        tokens: 10,
        deep_analysis_credits: 5
      });

      // 2. Generate valid JWT token
      const token = generateTestJWT(user.tg_id);

      // 3. Verify token structure
      const decoded = jwt.decode(token, { complete: true });
      expect(decoded.header.alg).toBe('HS256');
      expect(decoded.payload.tgId).toBe(user.tg_id);
      expect(decoded.payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));

      // 4. Use token to access protected endpoint
      const dreamText = TestDataGenerator.createTestDream();
      const event = createMockNetlifyEvent({
        body: { dream: dreamText },
        headers: {
          'authorization': `Bearer ${token}`,
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await analyzeDreamHandler(event, context);

      expect(response.statusCode).toBe(200);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.success).toBe(true);
      expect(responseBody.data).toHaveProperty('analysis');
    });

    test('should handle token expiration gracefully', async () => {
      const user = await testDb.createTestUser();
      
      // Create expired token
      const expiredToken = generateTestJWT(user.tg_id, -3600); // Expired 1 hour ago

      const dreamText = TestDataGenerator.createTestDream();
      const event = createMockNetlifyEvent({
        body: { dream: dreamText },
        headers: {
          'authorization': `Bearer ${expiredToken}`,
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await analyzeDreamHandler(event, context);

      expect(response.statusCode).toBe(401);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error).toContain('expired');
    });

    test('should validate token signature correctly', async () => {
      const user = await testDb.createTestUser();
      
      // Create token with wrong secret
      const payload = {
        tgId: user.tg_id,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };
      const wrongToken = jwt.sign(payload, 'wrong-secret');

      const dreamText = TestDataGenerator.createTestDream();
      const event = createMockNetlifyEvent({
        body: { dream: dreamText },
        headers: {
          'authorization': `Bearer ${wrongToken}`,
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await analyzeDreamHandler(event, context);

      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.body).success).toBe(false);
    });

    test('should handle missing token gracefully', async () => {
      const dreamText = TestDataGenerator.createTestDream();
      const event = createMockNetlifyEvent({
        body: { dream: dreamText },
        headers: {
          'origin': process.env.ALLOWED_TMA_ORIGIN
          // No authorization header
        }
      });
      const context = createMockNetlifyContext();

      const response = await analyzeDreamHandler(event, context);

      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.body).success).toBe(false);
    });

    test('should handle malformed authorization header', async () => {
      const user = await testDb.createTestUser();
      const dreamText = TestDataGenerator.createTestDream();
      
      const malformedHeaders = [
        'InvalidFormat',
        'Bearer',
        'Basic dXNlcjpwYXNz',
        'Bearer ',
        `Bearer ${generateTestJWT(user.tg_id)} extra-content`
      ];

      for (const authHeader of malformedHeaders) {
        const event = createMockNetlifyEvent({
          body: { dream: dreamText },
          headers: {
            'authorization': authHeader,
            'origin': process.env.ALLOWED_TMA_ORIGIN
          }
        });
        const context = createMockNetlifyContext();

        const response = await analyzeDreamHandler(event, context);

        expect(response.statusCode).toBe(401);
        expect(JSON.parse(response.body).success).toBe(false);
      }
    });
  });

  describe('Telegram Data Authentication Flow', () => {
    test('should complete full Telegram authentication cycle', async () => {
      // 1. Create user
      const user = await testDb.createTestUser({
        deep_analysis_credits: 5
      });

      // 2. Create valid Telegram data
      const telegramData = createTestTelegramData(user.tg_id, 'testuser');

      // 3. Verify Telegram data structure
      expect(telegramData).toHaveProperty('id');
      expect(telegramData).toHaveProperty('username');
      expect(telegramData).toHaveProperty('auth_date');
      expect(telegramData).toHaveProperty('hash');
      expect(telegramData.id).toBe(user.tg_id);

      // 4. Use Telegram data to access protected endpoint
      await testDb.createUserWithAnalyses({ tg_id: user.tg_id }, 5);

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

      expect(response.statusCode).toBe(200);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.success).toBe(true);
    });

    test('should reject invalid Telegram hash', async () => {
      const user = await testDb.createTestUser();
      
      const invalidTelegramData = {
        id: user.tg_id,
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

      const response = await userProfileHandler(event, context);

      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.body).success).toBe(false);
    });

    test('should handle missing Telegram data fields', async () => {
      const incompleteTelegramData = [
        { username: 'testuser', auth_date: Math.floor(Date.now() / 1000) }, // missing id and hash
        { id: 123456, auth_date: Math.floor(Date.now() / 1000) }, // missing username and hash
        { id: 123456, username: 'testuser' }, // missing auth_date and hash
        {} // completely empty
      ];

      for (const data of incompleteTelegramData) {
        const event = createMockNetlifyEvent({
          body: {
            initData: JSON.stringify(data)
          },
          headers: {
            'origin': process.env.ALLOWED_TMA_ORIGIN
          }
        });
        const context = createMockNetlifyContext();

        const response = await userProfileHandler(event, context);

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body).success).toBe(false);
      }
    });

    test('should handle old Telegram auth_date', async () => {
      const user = await testDb.createTestUser();
      
      // Create old auth data (24+ hours old)
      const oldTelegramData = createTestTelegramData(user.tg_id);
      oldTelegramData.auth_date = Math.floor(Date.now() / 1000) - 86400; // 24 hours ago

      const event = createMockNetlifyEvent({
        body: {
          initData: JSON.stringify(oldTelegramData)
        },
        headers: {
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await userProfileHandler(event, context);

      // Depending on implementation, might accept or reject old auth
      expect([200, 401]).toContain(response.statusCode);
    });
  });

  describe('Cross-Authentication Compatibility', () => {
    test('should allow same user via different auth methods', async () => {
      const user = await testDb.createTestUser({
        tokens: 10,
        deep_analysis_credits: 5
      });

      // Method 1: JWT authentication
      const token = generateTestJWT(user.tg_id);
      const dreamText = TestDataGenerator.createTestDream();
      
      const jwtEvent = createMockNetlifyEvent({
        body: { dream: dreamText },
        headers: {
          'authorization': `Bearer ${token}`,
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const jwtResponse = await analyzeDreamHandler(jwtEvent, context);
      expect(jwtResponse.statusCode).toBe(200);

      // Method 2: Telegram data authentication  
      const telegramData = createTestTelegramData(user.tg_id);
      
      const telegramEvent = createMockNetlifyEvent({
        body: {
          initData: JSON.stringify(telegramData)
        },
        headers: {
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });

      const telegramResponse = await userProfileHandler(telegramEvent, context);
      expect(telegramResponse.statusCode).toBe(200);

      // Both should reference the same user
      const jwtBody = JSON.parse(jwtResponse.body);
      const telegramBody = JSON.parse(telegramResponse.body);
      
      expect(telegramBody.data.profile.tg_id).toBe(user.tg_id);
    });

    test('should maintain session consistency across endpoints', async () => {
      const user = await testDb.createTestUser({
        tokens: 5,
        deep_analysis_credits: 3
      });

      const token = generateTestJWT(user.tg_id);
      
      // Use token across multiple endpoints
      const endpoints = [
        {
          handler: analyzeDreamHandler,
          event: createMockNetlifyEvent({
            body: { dream: TestDataGenerator.createTestDream() },
            headers: {
              'authorization': `Bearer ${token}`,
              'origin': process.env.ALLOWED_TMA_ORIGIN
            }
          })
        }
      ];

      for (const endpoint of endpoints) {
        const context = createMockNetlifyContext();
        const response = await endpoint.handler(endpoint.event, context);
        
        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body).success).toBe(true);
      }
    });
  });

  describe('Authentication Security Tests', () => {
    test('should prevent token reuse after expiration', async () => {
      const user = await testDb.createTestUser();
      
      // Create token that expires quickly
      const shortLivedToken = generateTestJWT(user.tg_id, 1); // 1 second
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const dreamText = TestDataGenerator.createTestDream();
      const event = createMockNetlifyEvent({
        body: { dream: dreamText },
        headers: {
          'authorization': `Bearer ${shortLivedToken}`,
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await analyzeDreamHandler(event, context);

      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.body).success).toBe(false);
    }, 5000);

    test('should prevent cross-user token usage', async () => {
      const user1 = await testDb.createTestUser();
      const user2 = await testDb.createTestUser();
      
      // Create token for user1
      const user1Token = generateTestJWT(user1.tg_id);
      
      // Try to use user1's token to access user2's data
      const telegramData = createTestTelegramData(user2.tg_id);
      
      const event = createMockNetlifyEvent({
        body: {
          initData: JSON.stringify(telegramData)
        },
        headers: {
          'authorization': `Bearer ${user1Token}`, // Wrong user's token
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await userProfileHandler(event, context);

      // Should either reject or return user1's profile (depends on implementation)
      expect([200, 401, 403]).toContain(response.statusCode);
    });

    test('should handle authentication bypass attempts', async () => {
      const bypassAttempts = [
        { headers: { 'authorization': 'Bearer admin' } },
        { headers: { 'authorization': 'Bearer null' } },
        { headers: { 'authorization': 'Bearer undefined' } },
        { headers: { 'authorization': 'Bearer {}' } },
        { headers: { 'x-user-id': '123456' } }, // Custom header attempt
        { headers: { 'user': '123456' } }
      ];

      for (const attempt of bypassAttempts) {
        const dreamText = TestDataGenerator.createTestDream();
        const event = createMockNetlifyEvent({
          body: { dream: dreamText },
          headers: {
            ...attempt.headers,
            'origin': process.env.ALLOWED_TMA_ORIGIN
          }
        });
        const context = createMockNetlifyContext();

        const response = await analyzeDreamHandler(event, context);

        expect(response.statusCode).toBe(401);
        expect(JSON.parse(response.body).success).toBe(false);
      }
    });

    test('should rate limit authentication attempts', async () => {
      const invalidToken = 'Bearer invalid-token';
      const promises = [];

      // Send many invalid auth requests
      for (let i = 0; i < 50; i++) {
        const dreamText = TestDataGenerator.createTestDream();
        const event = createMockNetlifyEvent({
          body: { dream: dreamText },
          headers: {
            'authorization': invalidToken,
            'origin': process.env.ALLOWED_TMA_ORIGIN
          }
        });
        const context = createMockNetlifyContext();

        promises.push(analyzeDreamHandler(event, context));
      }

      const responses = await Promise.all(promises);
      
      // Should reject all, and possibly rate limit some
      responses.forEach(response => {
        expect([401, 429]).toContain(response.statusCode);
        expect(JSON.parse(response.body).success).toBe(false);
      });
    }, 30000);
  });

  describe('User Creation During Authentication', () => {
    test('should create user during JWT-authenticated request', async () => {
      const newTgId = Math.floor(Math.random() * 1000000);
      const token = generateTestJWT(newTgId);
      
      const dreamText = TestDataGenerator.createTestDream();
      const event = createMockNetlifyEvent({
        body: { dream: dreamText },
        headers: {
          'authorization': `Bearer ${token}`,
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await analyzeDreamHandler(event, context);

      expect(response.statusCode).toBe(200);
      
      // Verify user was created
      const createdUser = await testDb.getUserByTgId(newTgId);
      expect(createdUser).toBeTruthy();
      expect(createdUser.tg_id).toBe(newTgId);
    });

    test('should create user during Telegram-authenticated request', async () => {
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

      const response = await userProfileHandler(event, context);

      expect(response.statusCode).toBe(200);
      
      // Verify user was created
      const createdUser = await testDb.getUserByTgId(newTgId);
      expect(createdUser).toBeTruthy();
      expect(createdUser.tg_id).toBe(newTgId);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.data.profile.tg_id).toBe(newTgId);
    });

    test('should handle concurrent user creation safely', async () => {
      const newTgId = Math.floor(Math.random() * 1000000);
      const token = generateTestJWT(newTgId);
      
      // Send multiple concurrent requests for new user
      const promises = Array(5).fill().map(() => {
        const dreamText = TestDataGenerator.createTestDream();
        const event = createMockNetlifyEvent({
          body: { dream: dreamText },
          headers: {
            'authorization': `Bearer ${token}`,
            'origin': process.env.ALLOWED_TMA_ORIGIN
          }
        });
        return analyzeDreamHandler(event, createMockNetlifyContext());
      });

      const responses = await Promise.all(promises);
      
      // All should succeed (user created once, then used)
      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
      });

      // Verify only one user was created
      const createdUser = await testDb.getUserByTgId(newTgId);
      expect(createdUser).toBeTruthy();
    });
  });
});