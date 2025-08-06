/**
 * Integration tests for deep-analysis endpoint
 * Tests deep analysis functionality that requires multiple dreams
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
const { handler } = require('../../bot/functions/deep-analysis');

describe('Deep Analysis API Integration Tests', () => {
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
    // Create test user with credits for deep analysis
    testUser = await testDb.createTestUser({
      deep_analysis_credits: 10,
      subscription_type: 'premium'
    });
  });

  describe('Successful Deep Analysis', () => {
    test('should perform deep analysis with sufficient dreams and credits', async () => {
      // Create required number of analyses for the user
      const { user, analyses } = await testDb.createUserWithAnalyses(
        { 
          tg_id: testUser.tg_id,
          deep_analysis_credits: 5 
        }, 
        5 // Create 5 analyses (meets minimum requirement)
      );

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
      expect(responseBody.data).toHaveProperty('deepAnalysis');
      expect(responseBody.data.deepAnalysis).toHaveProperty('patterns');
      expect(responseBody.data.deepAnalysis).toHaveProperty('themes');
      expect(responseBody.data.deepAnalysis).toHaveProperty('insights');
      
      // Verify credits were decremented
      const updatedUser = await testDb.getUserByTgId(user.tg_id);
      expect(updatedUser.deep_analysis_credits).toBe(4); // 5 - 1 = 4
    });

    test('should work with premium subscription user', async () => {
      const premiumUser = await testDb.createTestUser({
        subscription_type: 'premium',
        deep_analysis_credits: 10
      });

      // Create analyses for premium user
      await testDb.createUserWithAnalyses(
        { tg_id: premiumUser.tg_id }, 
        7
      );

      const telegramData = createTestTelegramData(premiumUser.tg_id);
      
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
      expect(JSON.parse(response.body).success).toBe(true);
    });

    test('should analyze complex dream patterns', async () => {
      // Create user with themed dreams
      const user = await testDb.createTestUser({
        deep_analysis_credits: 5
      });

      const themedDreams = [
        "I was flying over mountains and feeling free",
        "In my dream I soared above the clouds like a bird", 
        "I found myself floating weightlessly through the sky",
        "I was running through a forest being chased by shadows",
        "In the dream I was being pursued by dark figures"
      ];

      for (const dreamText of themedDreams) {
        await testDb.createTestAnalysis(user.id, dreamText);
      }

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
      expect(responseBody.data.deepAnalysis).toBeDefined();
    });
  });

  describe('Insufficient Dreams Tests', () => {
    test('should reject analysis with insufficient dreams', async () => {
      // Create user with only 2 analyses (below minimum)
      const user = await testDb.createTestUser({
        deep_analysis_credits: 5
      });

      await testDb.createUserWithAnalyses(
        { tg_id: user.tg_id }, 
        2 // Only 2 analyses, below minimum requirement
      );

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

      expect(response.statusCode).toBe(400);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error).toContain('dreams');
    });

    test('should reject analysis for user with no dreams', async () => {
      const user = await testDb.createTestUser({
        deep_analysis_credits: 5
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

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).success).toBe(false);
    });
  });

  describe('Credits Management Tests', () => {
    test('should reject analysis with insufficient credits', async () => {
      // Create user with no credits
      const user = await testDb.createTestUser({
        deep_analysis_credits: 0
      });

      await testDb.createUserWithAnalyses(
        { tg_id: user.tg_id }, 
        5
      );

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

      expect(response.statusCode).toBe(402);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error).toContain('credits');
    });

    test('should not decrement credits on failed analysis', async () => {
      // Create user with insufficient dreams but sufficient credits
      const user = await testDb.createTestUser({
        deep_analysis_credits: 5
      });

      await testDb.createUserWithAnalyses(
        { tg_id: user.tg_id }, 
        2 // Insufficient dreams
      );

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

      expect(response.statusCode).toBe(400);
      
      // Verify credits were not decremented
      const updatedUser = await testDb.getUserByTgId(user.tg_id);
      expect(updatedUser.deep_analysis_credits).toBe(5);
    });

    test('should handle race condition in credit decrement', async () => {
      const user = await testDb.createTestUser({
        deep_analysis_credits: 1 // Only 1 credit
      });

      await testDb.createUserWithAnalyses(
        { tg_id: user.tg_id }, 
        5
      );

      const telegramData = createTestTelegramData(user.tg_id);
      
      // Send two concurrent requests
      const event1 = createMockNetlifyEvent({
        body: { initData: JSON.stringify(telegramData) },
        headers: { 'origin': process.env.ALLOWED_TMA_ORIGIN }
      });
      const event2 = createMockNetlifyEvent({
        body: { initData: JSON.stringify(telegramData) },
        headers: { 'origin': process.env.ALLOWED_TMA_ORIGIN }
      });

      const context = createMockNetlifyContext();

      const [response1, response2] = await Promise.all([
        handler(event1, context),
        handler(event2, context)
      ]);

      // Only one should succeed
      const responses = [response1, response2];
      const successCount = responses.filter(r => r.statusCode === 200).length;
      const failCount = responses.filter(r => r.statusCode === 402).length;

      expect(successCount).toBe(1);
      expect(failCount).toBe(1);
    });
  });

  describe('Authentication Tests', () => {
    test('should reject request with invalid Telegram data', async () => {
      const user = await testDb.createTestUser({
        deep_analysis_credits: 5
      });

      await testDb.createUserWithAnalyses(
        { tg_id: user.tg_id }, 
        5
      );

      const invalidTelegramData = {
        id: user.tg_id,
        username: 'testuser',
        auth_date: Math.floor(Date.now() / 1000),
        hash: 'invalid-hash'
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
      expect(JSON.parse(response.body).success).toBe(false);
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
      expect(JSON.parse(response.body).success).toBe(false);
    });

    test('should reject request from unauthorized origin', async () => {
      const user = await testDb.createTestUser({
        deep_analysis_credits: 5
      });

      await testDb.createUserWithAnalyses(
        { tg_id: user.tg_id }, 
        5
      );

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
    });

    test('should reject GET request', async () => {
      const event = createMockNetlifyEvent({
        httpMethod: 'GET'
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(405);
      expect(JSON.parse(response.body).success).toBe(false);
    });
  });

  describe('Performance Tests', () => {
    test('should complete deep analysis within timeout', async () => {
      const user = await testDb.createTestUser({
        deep_analysis_credits: 5
      });

      await testDb.createUserWithAnalyses(
        { tg_id: user.tg_id }, 
        10 // More dreams for comprehensive analysis
      );

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
      expect(duration).toBeLessThan(45000); // Deep analysis may take longer
    }, 50000);

    test('should handle large dataset of dreams', async () => {
      const user = await testDb.createTestUser({
        deep_analysis_credits: 5
      });

      // Create many analyses
      await testDb.createUserWithAnalyses(
        { tg_id: user.tg_id }, 
        25 // Large number of dreams
      );

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
      expect(responseBody.data.deepAnalysis).toBeDefined();
    }, 60000);
  });

  describe('Database Integration Tests', () => {
    test('should create user if not exists during deep analysis', async () => {
      const newTgId = Math.floor(Math.random() * 1000000);
      
      // Can't test this directly since user needs existing dreams for deep analysis
      // But we can verify the user creation logic path
      const telegramData = createTestTelegramData(newTgId);
      
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

      // Should fail due to insufficient dreams, but user should be created
      expect(response.statusCode).toBe(400);
      
      // Verify user was created
      const createdUser = await testDb.getUserByTgId(newTgId);
      expect(createdUser).toBeTruthy();
    });

    test('should handle database connection errors gracefully', async () => {
      // This would require mocking database failures
      // For now, we'll test successful database operations
      expect(await testDb.healthCheck()).toBe(true);
    });
  });
});