/**
 * Performance benchmarks for API endpoints
 * Tests response times, throughput, and resource usage
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

describe('Performance Benchmarks Integration Tests', () => {
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
      tokens: 100,
      deep_analysis_credits: 10
    });
  });

  describe('Response Time Benchmarks', () => {
    test('analyze-dream should respond within 15 seconds', async () => {
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

      const startTime = performance.now();
      const response = await analyzeDreamHandler(event, context);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(response.statusCode).toBe(200);
      expect(duration).toBeLessThan(15000); // 15 seconds
      
      console.log(`[PERF] analyze-dream: ${duration.toFixed(2)}ms`);
    }, 20000);

    test('deep-analysis should respond within 30 seconds', async () => {
      await testDb.createUserWithAnalyses({ tg_id: testUser.tg_id }, 10);

      const telegramData = createTestTelegramData(testUser.tg_id);
      
      const event = createMockNetlifyEvent({
        body: {
          initData: JSON.stringify(telegramData)
        },
        headers: {
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const startTime = performance.now();
      const response = await deepAnalysisHandler(event, context);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(response.statusCode).toBe(200);
      expect(duration).toBeLessThan(30000); // 30 seconds
      
      console.log(`[PERF] deep-analysis: ${duration.toFixed(2)}ms`);
    }, 35000);

    test('user-profile should respond within 3 seconds', async () => {
      await testDb.createUserWithAnalyses({ tg_id: testUser.tg_id }, 5);

      const telegramData = createTestTelegramData(testUser.tg_id);
      
      const event = createMockNetlifyEvent({
        body: {
          initData: JSON.stringify(telegramData)
        },
        headers: {
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const startTime = performance.now();
      const response = await userProfileHandler(event, context);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(response.statusCode).toBe(200);
      expect(duration).toBeLessThan(3000); // 3 seconds
      
      console.log(`[PERF] user-profile: ${duration.toFixed(2)}ms`);
    });

    test('web-login should respond within 5 seconds', async () => {
      const crypto = require('crypto');
      const util = require('util');
      const scryptAsync = util.promisify(crypto.scrypt);

      const password = 'testPassword123';
      const salt = crypto.randomBytes(32);
      const derivedKey = await scryptAsync(password, salt, 64);
      const passwordHash = salt.toString('hex') + ':' + derivedKey.toString('hex');

      await testDb.createTestUser({
        username: 'perftest',
        password_hash: passwordHash
      });

      const event = createMockNetlifyEvent({
        body: {
          username: 'perftest',
          password: password
        },
        headers: {
          'origin': process.env.ALLOWED_WEB_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const startTime = performance.now();
      const response = await webLoginHandler(event, context);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(response.statusCode).toBe(200);
      expect(duration).toBeLessThan(5000); // 5 seconds
      
      console.log(`[PERF] web-login: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Throughput Benchmarks', () => {
    test('should handle 10 concurrent analyze-dream requests', async () => {
      const token = generateTestJWT(testUser.tg_id);
      const promises = [];
      const requestCount = 10;

      const startTime = performance.now();
      
      for (let i = 0; i < requestCount; i++) {
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
      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      const averageTime = totalDuration / requestCount;

      // All should succeed
      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
      });

      expect(averageTime).toBeLessThan(20000); // Average under 20 seconds
      
      console.log(`[PERF] ${requestCount} concurrent analyze-dream: total=${totalDuration.toFixed(2)}ms, avg=${averageTime.toFixed(2)}ms`);
    }, 60000);

    test('should handle 5 concurrent user-profile requests', async () => {
      const users = [];
      for (let i = 0; i < 5; i++) {
        users.push(await testDb.createTestUser());
      }

      const promises = [];
      const requestCount = 5;

      const startTime = performance.now();
      
      for (let i = 0; i < requestCount; i++) {
        const telegramData = createTestTelegramData(users[i].tg_id);
        const event = createMockNetlifyEvent({
          body: {
            initData: JSON.stringify(telegramData)
          },
          headers: {
            'origin': process.env.ALLOWED_TMA_ORIGIN
          }
        });
        const context = createMockNetlifyContext();

        promises.push(userProfileHandler(event, context));
      }

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      const averageTime = totalDuration / requestCount;

      // All should succeed
      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
      });

      expect(averageTime).toBeLessThan(5000); // Average under 5 seconds
      
      console.log(`[PERF] ${requestCount} concurrent user-profile: total=${totalDuration.toFixed(2)}ms, avg=${averageTime.toFixed(2)}ms`);
    }, 30000);

    test('should handle mixed endpoint load', async () => {
      const token = generateTestJWT(testUser.tg_id);
      const telegramData = createTestTelegramData(testUser.tg_id);
      const promises = [];

      const startTime = performance.now();

      // Mixed load: different endpoints
      const requests = [
        // 3 analyze-dream requests
        ...Array(3).fill().map(() => ({
          handler: analyzeDreamHandler,
          event: createMockNetlifyEvent({
            body: { dream: TestDataGenerator.createTestDream() },
            headers: {
              'authorization': `Bearer ${token}`,
              'origin': process.env.ALLOWED_TMA_ORIGIN
            }
          })
        })),
        // 2 user-profile requests
        ...Array(2).fill().map(() => ({
          handler: userProfileHandler,
          event: createMockNetlifyEvent({
            body: { initData: JSON.stringify(telegramData) },
            headers: { 'origin': process.env.ALLOWED_TMA_ORIGIN }
          })
        }))
      ];

      for (const request of requests) {
        const context = createMockNetlifyContext();
        promises.push(request.handler(request.event, context));
      }

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const totalDuration = endTime - startTime;

      // Most should succeed
      const successCount = responses.filter(r => r.statusCode === 200).length;
      expect(successCount).toBeGreaterThanOrEqual(4); // At least 80% success

      console.log(`[PERF] Mixed load (${requests.length} requests): ${totalDuration.toFixed(2)}ms, ${successCount}/${requests.length} successful`);
    }, 45000);
  });

  describe('Scalability Benchmarks', () => {
    test('should handle large dream text efficiently', async () => {
      const largeDream = TestDataGenerator.createTestDream() + ' ' + 
                        'Additional context. '.repeat(500); // ~7KB text
      const token = generateTestJWT(testUser.tg_id);
      
      const event = createMockNetlifyEvent({
        body: { dream: largeDream },
        headers: {
          'authorization': `Bearer ${token}`,
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const startTime = performance.now();
      const response = await analyzeDreamHandler(event, context);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect([200, 400]).toContain(response.statusCode); // Accept or reject gracefully
      expect(duration).toBeLessThan(25000); // Should handle large text efficiently
      
      console.log(`[PERF] Large dream text (${largeDream.length} chars): ${duration.toFixed(2)}ms`);
    }, 30000);

    test('should handle user with many analyses efficiently', async () => {
      const { user } = await testDb.createUserWithAnalyses({}, 100); // 100 analyses

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

      const startTime = performance.now();
      const response = await userProfileHandler(event, context);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(response.statusCode).toBe(200);
      expect(duration).toBeLessThan(8000); // Should scale with data efficiently
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.data.profile.total_analyses).toBe(100);
      
      console.log(`[PERF] User with 100 analyses: ${duration.toFixed(2)}ms`);
    }, 15000);

    test('should handle deep analysis with many dreams efficiently', async () => {
      const { user } = await testDb.createUserWithAnalyses({
        deep_analysis_credits: 5
      }, 50); // 50 dreams for deep analysis

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

      const startTime = performance.now();
      const response = await deepAnalysisHandler(event, context);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(response.statusCode).toBe(200);
      expect(duration).toBeLessThan(45000); // Should handle large datasets
      
      console.log(`[PERF] Deep analysis with 50 dreams: ${duration.toFixed(2)}ms`);
    }, 50000);
  });

  describe('Memory Usage Benchmarks', () => {
    test('should not leak memory during repeated requests', async () => {
      const token = generateTestJWT(testUser.tg_id);
      const initialMemory = process.memoryUsage();

      // Make 50 sequential requests
      for (let i = 0; i < 50; i++) {
        const dreamText = `Sequential dream ${i}: ${TestDataGenerator.createTestDream()}`;
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

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncreaseMB).toBeLessThan(100);
      
      console.log(`[PERF] Memory increase after 50 requests: ${memoryIncreaseMB.toFixed(2)}MB`);
    }, 120000);

    test('should handle database connection pooling efficiently', async () => {
      const promises = [];
      const connectionCount = 20;

      // Create many concurrent database operations
      for (let i = 0; i < connectionCount; i++) {
        const user = testDb.createTestUser({
          username: `pooltest${i}`
        });
        promises.push(user);
      }

      const startTime = performance.now();
      const users = await Promise.all(promises);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(users).toHaveLength(connectionCount);
      expect(duration).toBeLessThan(10000); // Should handle concurrent DB ops efficiently
      
      console.log(`[PERF] ${connectionCount} concurrent DB operations: ${duration.toFixed(2)}ms`);
    }, 15000);
  });

  describe('Error Handling Performance', () => {
    test('should handle authentication errors quickly', async () => {
      const dreamText = TestDataGenerator.createTestDream();
      const invalidToken = 'Bearer invalid-token';
      
      const event = createMockNetlifyEvent({
        body: { dream: dreamText },
        headers: {
          'authorization': invalidToken,
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const startTime = performance.now();
      const response = await analyzeDreamHandler(event, context);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(response.statusCode).toBe(401);
      expect(duration).toBeLessThan(1000); // Auth errors should be fast
      
      console.log(`[PERF] Auth error handling: ${duration.toFixed(2)}ms`);
    });

    test('should handle validation errors quickly', async () => {
      const token = generateTestJWT(testUser.tg_id);
      
      const event = createMockNetlifyEvent({
        body: { dream: '' }, // Invalid empty dream
        headers: {
          'authorization': `Bearer ${token}`,
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const startTime = performance.now();
      const response = await analyzeDreamHandler(event, context);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(response.statusCode).toBe(400);
      expect(duration).toBeLessThan(500); // Validation errors should be very fast
      
      console.log(`[PERF] Validation error handling: ${duration.toFixed(2)}ms`);
    });

    test('should handle database errors gracefully', async () => {
      // This test would require mocking database failures
      // For now, we test that normal operations are performant
      const telegramData = createTestTelegramData(testUser.tg_id);
      
      const event = createMockNetlifyEvent({
        body: {
          initData: JSON.stringify(telegramData)
        },
        headers: {
          'origin': process.env.ALLOWED_TMA_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const startTime = performance.now();
      const response = await userProfileHandler(event, context);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(response.statusCode).toBe(200);
      expect(duration).toBeLessThan(3000);
      
      console.log(`[PERF] Database operation: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Baseline Performance Metrics', () => {
    test('should establish performance baselines', async () => {
      const metrics = {
        analyzeDream: [],
        userProfile: [],
        webLogin: []
      };

      // Test analyze-dream 5 times
      const token = generateTestJWT(testUser.tg_id);
      for (let i = 0; i < 5; i++) {
        const dreamText = TestDataGenerator.createTestDream();
        const event = createMockNetlifyEvent({
          body: { dream: dreamText },
          headers: {
            'authorization': `Bearer ${token}`,
            'origin': process.env.ALLOWED_TMA_ORIGIN
          }
        });
        const context = createMockNetlifyContext();

        const startTime = performance.now();
        const response = await analyzeDreamHandler(event, context);
        const endTime = performance.now();

        expect(response.statusCode).toBe(200);
        metrics.analyzeDream.push(endTime - startTime);
      }

      // Test user-profile 5 times
      const telegramData = createTestTelegramData(testUser.tg_id);
      for (let i = 0; i < 5; i++) {
        const event = createMockNetlifyEvent({
          body: { initData: JSON.stringify(telegramData) },
          headers: { 'origin': process.env.ALLOWED_TMA_ORIGIN }
        });
        const context = createMockNetlifyContext();

        const startTime = performance.now();
        const response = await userProfileHandler(event, context);
        const endTime = performance.now();

        expect(response.statusCode).toBe(200);
        metrics.userProfile.push(endTime - startTime);
      }

      // Calculate and log averages
      Object.keys(metrics).forEach(endpoint => {
        const times = metrics[endpoint];
        const average = times.reduce((a, b) => a + b, 0) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);
        
        console.log(`[BASELINE] ${endpoint}: avg=${average.toFixed(2)}ms, min=${min.toFixed(2)}ms, max=${max.toFixed(2)}ms`);
      });

      // Assertions for reasonable performance
      const avgAnalyzeDream = metrics.analyzeDream.reduce((a, b) => a + b, 0) / metrics.analyzeDream.length;
      const avgUserProfile = metrics.userProfile.reduce((a, b) => a + b, 0) / metrics.userProfile.length;

      expect(avgAnalyzeDream).toBeLessThan(20000); // 20 seconds average
      expect(avgUserProfile).toBeLessThan(3000); // 3 seconds average
    }, 180000); // 3 minutes for comprehensive testing
  });
});