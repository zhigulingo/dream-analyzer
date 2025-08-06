/**
 * Integration tests for web-login endpoint
 * Tests web authentication flow and password management
 */

const { 
  setupTestEnvironment, 
  createMockNetlifyEvent, 
  createMockNetlifyContext,
  TestDataGenerator 
} = require('./test-environment');
const TestDatabase = require('./test-database');
const crypto = require('crypto');
const util = require('util');

// Setup test environment
setupTestEnvironment();

// Import the handler after environment is set
const { handler } = require('../../bot/functions/web-login');

const scryptAsync = util.promisify(crypto.scrypt);

describe('Web Login API Integration Tests', () => {
  let testDb;

  beforeAll(async () => {
    testDb = new TestDatabase();
    await testDb.setup();
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  describe('Successful Login Tests', () => {
    test('should login user with correct credentials', async () => {
      // Create user with password hash
      const password = 'testPassword123';
      const salt = crypto.randomBytes(32);
      const derivedKey = await scryptAsync(password, salt, 64);
      const passwordHash = salt.toString('hex') + ':' + derivedKey.toString('hex');

      const user = await testDb.createTestUser({
        username: 'testuser',
        password_hash: passwordHash
      });

      const event = createMockNetlifyEvent({
        body: {
          username: 'testuser',
          password: password
        },
        headers: {
          'origin': process.env.ALLOWED_WEB_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(200);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.success).toBe(true);
      expect(responseBody.data).toHaveProperty('accessToken');
      expect(responseBody.data).toHaveProperty('refreshToken');
      expect(responseBody.data.user).toMatchObject({
        id: user.id,
        username: 'testuser'
      });
      
      // Verify JWT tokens are present in cookies
      expect(response.headers).toHaveProperty('Set-Cookie');
      const cookies = Array.isArray(response.headers['Set-Cookie']) 
        ? response.headers['Set-Cookie'] 
        : [response.headers['Set-Cookie']];
      
      const hasAccessToken = cookies.some(cookie => cookie.includes('accessToken='));
      const hasRefreshToken = cookies.some(cookie => cookie.includes('refreshToken='));
      
      expect(hasAccessToken).toBe(true);
      expect(hasRefreshToken).toBe(true);
    });

    test('should login user with email instead of username', async () => {
      const password = 'testPassword123';
      const salt = crypto.randomBytes(32);
      const derivedKey = await scryptAsync(password, salt, 64);
      const passwordHash = salt.toString('hex') + ':' + derivedKey.toString('hex');

      const user = await testDb.createTestUser({
        username: 'user@example.com',
        password_hash: passwordHash
      });

      const event = createMockNetlifyEvent({
        body: {
          username: 'user@example.com',
          password: password
        },
        headers: {
          'origin': process.env.ALLOWED_WEB_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).success).toBe(true);
    });

    test('should handle case-insensitive username', async () => {
      const password = 'testPassword123';
      const salt = crypto.randomBytes(32);
      const derivedKey = await scryptAsync(password, salt, 64);
      const passwordHash = salt.toString('hex') + ':' + derivedKey.toString('hex');

      await testDb.createTestUser({
        username: 'TestUser',
        password_hash: passwordHash
      });

      const event = createMockNetlifyEvent({
        body: {
          username: 'testuser', // lowercase
          password: password
        },
        headers: {
          'origin': process.env.ALLOWED_WEB_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).success).toBe(true);
    });
  });

  describe('Authentication Failure Tests', () => {
    test('should reject login with incorrect password', async () => {
      const correctPassword = 'correctPassword123';
      const salt = crypto.randomBytes(32);
      const derivedKey = await scryptAsync(correctPassword, salt, 64);
      const passwordHash = salt.toString('hex') + ':' + derivedKey.toString('hex');

      await testDb.createTestUser({
        username: 'testuser',
        password_hash: passwordHash
      });

      const event = createMockNetlifyEvent({
        body: {
          username: 'testuser',
          password: 'wrongPassword123'
        },
        headers: {
          'origin': process.env.ALLOWED_WEB_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(401);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error).toContain('Invalid');
    });

    test('should reject login with non-existent username', async () => {
      const event = createMockNetlifyEvent({
        body: {
          username: 'nonexistentuser',
          password: 'anyPassword123'
        },
        headers: {
          'origin': process.env.ALLOWED_WEB_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(401);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error).toContain('Invalid');
    });

    test('should reject login with empty credentials', async () => {
      const event = createMockNetlifyEvent({
        body: {
          username: '',
          password: ''
        },
        headers: {
          'origin': process.env.ALLOWED_WEB_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(400);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error).toContain('username');
    });

    test('should reject login with missing password', async () => {
      const event = createMockNetlifyEvent({
        body: {
          username: 'testuser'
          // password missing
        },
        headers: {
          'origin': process.env.ALLOWED_WEB_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(400);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error).toContain('password');
    });

    test('should reject login with missing username', async () => {
      const event = createMockNetlifyEvent({
        body: {
          password: 'testPassword123'
          // username missing
        },
        headers: {
          'origin': process.env.ALLOWED_WEB_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).success).toBe(false);
    });
  });

  describe('CORS and Origin Tests', () => {
    test('should handle OPTIONS request (CORS preflight)', async () => {
      const event = createMockNetlifyEvent({
        httpMethod: 'OPTIONS',
        headers: {
          'origin': process.env.ALLOWED_WEB_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(204);
      expect(response.headers).toHaveProperty('Access-Control-Allow-Origin');
      expect(response.headers).toHaveProperty('Access-Control-Allow-Methods');
      expect(response.headers).toHaveProperty('Access-Control-Allow-Headers');
      expect(response.headers).toHaveProperty('Access-Control-Allow-Credentials');
    });

    test('should reject request from unauthorized origin', async () => {
      const password = 'testPassword123';
      const salt = crypto.randomBytes(32);
      const derivedKey = await scryptAsync(password, salt, 64);
      const passwordHash = salt.toString('hex') + ':' + derivedKey.toString('hex');

      await testDb.createTestUser({
        username: 'testuser',
        password_hash: passwordHash
      });

      const event = createMockNetlifyEvent({
        body: {
          username: 'testuser',
          password: password
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

    test('should work with allowed web origin', async () => {
      const password = 'testPassword123';
      const salt = crypto.randomBytes(32);
      const derivedKey = await scryptAsync(password, salt, 64);
      const passwordHash = salt.toString('hex') + ':' + derivedKey.toString('hex');

      await testDb.createTestUser({
        username: 'testuser',
        password_hash: passwordHash
      });

      const event = createMockNetlifyEvent({
        body: {
          username: 'testuser',
          password: password
        },
        headers: {
          'origin': process.env.ALLOWED_WEB_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).success).toBe(true);
    });
  });

  describe('HTTP Method Tests', () => {
    test('should accept POST request', async () => {
      const password = 'testPassword123';
      const salt = crypto.randomBytes(32);
      const derivedKey = await scryptAsync(password, salt, 64);
      const passwordHash = salt.toString('hex') + ':' + derivedKey.toString('hex');

      await testDb.createTestUser({
        username: 'testuser',
        password_hash: passwordHash
      });

      const event = createMockNetlifyEvent({
        httpMethod: 'POST',
        body: {
          username: 'testuser',
          password: password
        },
        headers: {
          'origin': process.env.ALLOWED_WEB_ORIGIN
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
          'origin': process.env.ALLOWED_WEB_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(405);
      expect(JSON.parse(response.body).success).toBe(false);
    });

    test('should reject PUT request', async () => {
      const event = createMockNetlifyEvent({
        httpMethod: 'PUT',
        headers: {
          'origin': process.env.ALLOWED_WEB_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(405);
      expect(JSON.parse(response.body).success).toBe(false);
    });
  });

  describe('Token Security Tests', () => {
    test('should generate unique tokens for different users', async () => {
      const password = 'testPassword123';
      const salt1 = crypto.randomBytes(32);
      const derivedKey1 = await scryptAsync(password, salt1, 64);
      const passwordHash1 = salt1.toString('hex') + ':' + derivedKey1.toString('hex');

      const salt2 = crypto.randomBytes(32);
      const derivedKey2 = await scryptAsync(password, salt2, 64);
      const passwordHash2 = salt2.toString('hex') + ':' + derivedKey2.toString('hex');

      const user1 = await testDb.createTestUser({
        username: 'user1',
        password_hash: passwordHash1
      });

      const user2 = await testDb.createTestUser({
        username: 'user2',
        password_hash: passwordHash2
      });

      // Login as user1
      const event1 = createMockNetlifyEvent({
        body: {
          username: 'user1',
          password: password
        },
        headers: {
          'origin': process.env.ALLOWED_WEB_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response1 = await handler(event1, context);

      // Login as user2
      const event2 = createMockNetlifyEvent({
        body: {
          username: 'user2',
          password: password
        },
        headers: {
          'origin': process.env.ALLOWED_WEB_ORIGIN
        }
      });

      const response2 = await handler(event2, context);

      expect(response1.statusCode).toBe(200);
      expect(response2.statusCode).toBe(200);

      const body1 = JSON.parse(response1.body);
      const body2 = JSON.parse(response2.body);

      // Tokens should be different
      expect(body1.data.accessToken).not.toBe(body2.data.accessToken);
      expect(body1.data.refreshToken).not.toBe(body2.data.refreshToken);
    });

    test('should generate secure cookies with proper flags', async () => {
      const password = 'testPassword123';
      const salt = crypto.randomBytes(32);
      const derivedKey = await scryptAsync(password, salt, 64);
      const passwordHash = salt.toString('hex') + ':' + derivedKey.toString('hex');

      await testDb.createTestUser({
        username: 'testuser',
        password_hash: passwordHash
      });

      const event = createMockNetlifyEvent({
        body: {
          username: 'testuser',
          password: password
        },
        headers: {
          'origin': process.env.ALLOWED_WEB_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(200);
      
      const cookies = Array.isArray(response.headers['Set-Cookie']) 
        ? response.headers['Set-Cookie'] 
        : [response.headers['Set-Cookie']];

      // Check for security flags
      cookies.forEach(cookie => {
        if (cookie.includes('Token=')) {
          expect(cookie).toContain('HttpOnly');
          expect(cookie).toContain('SameSite=Strict');
          // In production, should also have Secure flag
        }
      });
    });

    test('should set appropriate token expiration', async () => {
      const password = 'testPassword123';
      const salt = crypto.randomBytes(32);
      const derivedKey = await scryptAsync(password, salt, 64);
      const passwordHash = salt.toString('hex') + ':' + derivedKey.toString('hex');

      await testDb.createTestUser({
        username: 'testuser',
        password_hash: passwordHash
      });

      const event = createMockNetlifyEvent({
        body: {
          username: 'testuser',
          password: password
        },
        headers: {
          'origin': process.env.ALLOWED_WEB_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(200);

      const cookies = Array.isArray(response.headers['Set-Cookie']) 
        ? response.headers['Set-Cookie'] 
        : [response.headers['Set-Cookie']];

      // Check for Max-Age or Expires
      cookies.forEach(cookie => {
        if (cookie.includes('Token=')) {
          expect(cookie).toMatch(/Max-Age=\d+|Expires=/);
        }
      });
    });
  });

  describe('Input Validation and Security Tests', () => {
    test('should handle SQL injection attempts', async () => {
      const event = createMockNetlifyEvent({
        body: {
          username: "'; DROP TABLE users; --",
          password: 'anyPassword'
        },
        headers: {
          'origin': process.env.ALLOWED_WEB_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.body).success).toBe(false);
      
      // Verify database is still intact
      expect(await testDb.healthCheck()).toBe(true);
    });

    test('should handle XSS attempts in username', async () => {
      const event = createMockNetlifyEvent({
        body: {
          username: '<script>alert("xss")</script>',
          password: 'anyPassword'
        },
        headers: {
          'origin': process.env.ALLOWED_WEB_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.body).success).toBe(false);
    });

    test('should handle very long username', async () => {
      const longUsername = 'a'.repeat(1000);
      
      const event = createMockNetlifyEvent({
        body: {
          username: longUsername,
          password: 'anyPassword'
        },
        headers: {
          'origin': process.env.ALLOWED_WEB_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).success).toBe(false);
    });

    test('should handle malformed JSON', async () => {
      const event = createMockNetlifyEvent({
        body: null,
        headers: {
          'origin': process.env.ALLOWED_WEB_ORIGIN
        }
      });
      // Set malformed JSON
      event.body = '{"username": "test", invalid json}';
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).success).toBe(false);
    });
  });

  describe('Performance Tests', () => {
    test('should complete login within reasonable time', async () => {
      const password = 'testPassword123';
      const salt = crypto.randomBytes(32);
      const derivedKey = await scryptAsync(password, salt, 64);
      const passwordHash = salt.toString('hex') + ':' + derivedKey.toString('hex');

      await testDb.createTestUser({
        username: 'testuser',
        password_hash: passwordHash
      });

      const event = createMockNetlifyEvent({
        body: {
          username: 'testuser',
          password: password
        },
        headers: {
          'origin': process.env.ALLOWED_WEB_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const startTime = Date.now();
      const response = await handler(event, context);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.statusCode).toBe(200);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    test('should handle concurrent login attempts', async () => {
      const password = 'testPassword123';
      const promises = [];

      // Create multiple users
      for (let i = 0; i < 5; i++) {
        const salt = crypto.randomBytes(32);
        const derivedKey = await scryptAsync(password, salt, 64);
        const passwordHash = salt.toString('hex') + ':' + derivedKey.toString('hex');

        await testDb.createTestUser({
          username: `user${i}`,
          password_hash: passwordHash
        });

        const event = createMockNetlifyEvent({
          body: {
            username: `user${i}`,
            password: password
          },
          headers: {
            'origin': process.env.ALLOWED_WEB_ORIGIN
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
    });
  });

  describe('Database Integration Tests', () => {
    test('should handle user creation during login flow', async () => {
      // This test verifies the database interaction works correctly
      const password = 'testPassword123';
      const salt = crypto.randomBytes(32);
      const derivedKey = await scryptAsync(password, salt, 64);
      const passwordHash = salt.toString('hex') + ':' + derivedKey.toString('hex');

      const user = await testDb.createTestUser({
        username: 'dbtest',
        password_hash: passwordHash
      });

      const event = createMockNetlifyEvent({
        body: {
          username: 'dbtest',
          password: password
        },
        headers: {
          'origin': process.env.ALLOWED_WEB_ORIGIN
        }
      });
      const context = createMockNetlifyContext();

      const response = await handler(event, context);

      expect(response.statusCode).toBe(200);
      
      // Verify user exists in database
      const dbUser = await testDb.getUserByTgId(user.tg_id);
      expect(dbUser).toBeTruthy();
      expect(dbUser.username).toBe('dbtest');
    });
  });
});