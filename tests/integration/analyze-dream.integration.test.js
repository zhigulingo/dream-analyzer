/**
 * Integration tests for analyze-dream endpoint
 * Tests the complete flow from HTTP request to database
 */

const { 
  setupTestEnvironment, 
  createMockNetlifyEvent, 
  createMockNetlifyContext,
  generateTestJWT,
  TestDataGenerator 
} = require('./test-environment');
const TestDatabase = require('./test-database');

// Setup test environment
setupTestEnvironment();

// Import the handler after environment is set
const { handler } = require('../../bot/functions/analyze-dream');

describe('Analyze Dream API Integration Tests', () => {
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
    // Create fresh test user for each test
    testUser = await testDb.createTestUser({
      tokens: 10, // Give user some tokens
      deep_analysis_credits: 5
    });
  });

  describe('Successful Dream Analysis', () => {
    test('should analyze dream with valid JWT token', async () => {
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

      const response = await handler(event, context);

      expect(response.statusCode).toBe(200);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.success).toBe(true);
      expect(responseBody.data).toHaveProperty('analysis');
      expect(responseBody.data).toHaveProperty('analysisId');
      
      // Verify analysis was saved to database
      const analyses = await testDb.getAnalysesForUser(testUser.id);
      expect(analyses).toHaveLength(1);
      expect(analyses[0].dream_text).toBe(dreamText);
    });

    test('should handle long dream text', async () => {
      const longDream = 'I had a very detailed dream. ' + 'This is a long dream text. '.repeat(100);
      const token = generateTestJWT(testUser.tg_id);
      
      const event = createMockNetlifyEvent({
        body: { dream: longDream },
        headers: {
          'authorization': `Bearer ${token}`,
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(200);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.analysis).toBeDefined();
    });

    test('should work with different origins', async () => {
      const dreamText = TestDataGenerator.createTestDream();
      const token = generateTestJWT(testUser.tg_id);
      
      const event = createMockNetlifyEvent({
        body: { dream: dreamText },
        headers: {
          'authorization': `Bearer ${token}`,
          'origin': process.env.ALLOWED_WEB_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).success).toBe(true);
    });
  });

  describe('Authentication Tests', () => {
    test('should reject request without authorization header', async () => {
      const dreamText = TestDataGenerator.createTestDream();
      
      const event = createMockNetlifyEvent({
        body: { dream: dreamText },
        headers: {
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(401);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error).toContain('authorization');
    });

    test('should reject request with invalid token', async () => {
      const dreamText = TestDataGenerator.createTestDream();
      
      const event = createMockNetlifyEvent({
        body: { dream: dreamText },
        headers: {
          'authorization': 'Bearer invalid-token',
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.body).success).toBe(false);
    });

    test('should reject expired token', async () => {
      const dreamText = TestDataGenerator.createTestDream();
      const expiredToken = generateTestJWT(testUser.tg_id, -3600); // Expired 1 hour ago
      
      const event = createMockNetlifyEvent({
        body: { dream: dreamText },
        headers: {
          'authorization': `Bearer ${expiredToken}`,
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.body).success).toBe(false);
    });

    test('should reject request from unauthorized origin', async () => {
      const dreamText = TestDataGenerator.createTestDream();
      const token = generateTestJWT(testUser.tg_id);
      
      const event = createMockNetlifyEvent({
        body: { dream: dreamText },
        headers: {
          'authorization': `Bearer ${token}`,
          'origin': 'https://malicious-site.com'
        }
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(403);
      expect(JSON.parse(response.body).success).toBe(false);
    });
  });

  describe('Input Validation Tests', () => {
    test('should reject request without dream text', async () => {
      const token = generateTestJWT(testUser.tg_id);
      
      const event = createMockNetlifyEvent({
        body: {},
        headers: {
          'authorization': `Bearer ${token}`,
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(400);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error).toContain('dream');
    });

    test('should reject empty dream text', async () => {
      const token = generateTestJWT(testUser.tg_id);
      
      const event = createMockNetlifyEvent({
        body: { dream: '' },
        headers: {
          'authorization': `Bearer ${token}`,
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).success).toBe(false);
    });

    test('should reject dream text that is too short', async () => {
      const token = generateTestJWT(testUser.tg_id);
      
      const event = createMockNetlifyEvent({
        body: { dream: 'short' },
        headers: {
          'authorization': `Bearer ${token}`,
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).success).toBe(false);
    });

    test('should handle malformed JSON', async () => {
      const token = generateTestJWT(testUser.tg_id);
      
      const event = createMockNetlifyEvent({
        body: null,
        headers: {
          'authorization': `Bearer ${token}`,
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      // Manually set malformed JSON
      event.body = '{"dream": invalid json}';
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(400);
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
      expect(response.headers).toHaveProperty('Access-Control-Allow-Methods');
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

    test('should reject PUT request', async () => {
      const event = createMockNetlifyEvent({
        httpMethod: 'PUT'
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(405);
      expect(JSON.parse(response.body).success).toBe(false);
    });
  });

  describe('Database Integration Tests', () => {
    test('should create user if not exists', async () => {
      const newTgId = Math.floor(Math.random() * 1000000);
      const dreamText = TestDataGenerator.createTestDream();
      const token = generateTestJWT(newTgId);
      
      const event = createMockNetlifyEvent({
        body: { dream: dreamText },
        headers: {
          'authorization': `Bearer ${token}`,
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(200);
      
      // Verify user was created in database
      const createdUser = await testDb.getUserByTgId(newTgId);
      expect(createdUser).toBeTruthy();
      expect(createdUser.tg_id).toBe(newTgId);
    });

    test('should increment analysis count for existing user', async () => {
      const dreamText = TestDataGenerator.createTestDream();
      const token = generateTestJWT(testUser.tg_id);
      
      // First analysis
      let event = createMockNetlifyEvent({
        body: { dream: dreamText },
        headers: {
          'authorization': `Bearer ${token}`,
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      let context = createMockNetlifyContext();

      await handler(event, context);
      
      // Second analysis
      event = createMockNetlifyEvent({
        body: { dream: dreamText + ' additional content' },
        headers: {
          'authorization': `Bearer ${token}`,
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });

      await handler(event, context);
      
      // Verify both analyses are in database
      const analyses = await testDb.getAnalysesForUser(testUser.id);
      expect(analyses).toHaveLength(2);
    });
  });

  describe('Performance Tests', () => {
    test('should complete analysis within timeout', async () => {
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

      const startTime = Date.now();
      const response = await handler(event, context);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.statusCode).toBe(200);
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
    }, 35000); // Set test timeout higher than expected duration

    test('should handle concurrent requests', async () => {
      const token = generateTestJWT(testUser.tg_id);
      const promises = [];

      // Send 5 concurrent requests
      for (let i = 0; i < 5; i++) {
        const dreamText = `Dream ${i}: ${TestDataGenerator.createTestDream()}`;
        const event = createMockNetlifyEvent({
          body: { dream: dreamText },
          headers: {
            'authorization': `Bearer ${token}`,
            'origin': process.env.ALLOWED_TMA_ORIGIN
          }
        });
        const context = createMockNetlifyContext();

        promises.push(handler(event, context));
      }

      const responses = await Promise.all(promises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
      });

      // Verify all analyses were saved
      const analyses = await testDb.getAnalysesForUser(testUser.id);
      expect(analyses.length).toBeGreaterThanOrEqual(5);
    }, 60000);
  });
});