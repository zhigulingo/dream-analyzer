/**
 * @fileoverview Tests for CORS middleware module
 */

const { getCorsHeaders, handleCorsPrelight } = require('../bot/functions/shared/middleware/cors');

describe('CORS Middleware', () => {
  describe('getCorsHeaders', () => {
    test('should return default headers with wildcard origin when no allowed origins provided', () => {
      const event = { headers: { origin: 'https://example.com' } };
      const headers = getCorsHeaders(event);

      expect(headers).toEqual({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS, GET'
      });
    });

    test('should return default headers with first allowed origin when request origin not in list', () => {
      const event = { headers: { origin: 'https://evil.com' } };
      const allowedOrigins = ['https://app.example.com', 'https://staging.example.com'];
      const headers = getCorsHeaders(event, allowedOrigins);

      expect(headers).toEqual({
        'Access-Control-Allow-Origin': 'https://app.example.com',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS, GET'
      });
    });

    test('should return request origin when it matches allowed origins', () => {
      const requestOrigin = 'https://app.example.com';
      const event = { headers: { origin: requestOrigin } };
      const allowedOrigins = ['https://app.example.com', 'https://staging.example.com'];
      const headers = getCorsHeaders(event, allowedOrigins);

      expect(headers).toEqual({
        'Access-Control-Allow-Origin': requestOrigin,
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS, GET'
      });
    });

    test('should handle uppercase Origin header', () => {
      const requestOrigin = 'https://app.example.com';
      const event = { headers: { Origin: requestOrigin } };
      const allowedOrigins = ['https://app.example.com'];
      const headers = getCorsHeaders(event, allowedOrigins);

      expect(headers['Access-Control-Allow-Origin']).toBe(requestOrigin);
    });

    test('should handle missing origin header', () => {
      const event = { headers: {} };
      const allowedOrigins = ['https://app.example.com'];
      const headers = getCorsHeaders(event, allowedOrigins);

      expect(headers['Access-Control-Allow-Origin']).toBe('https://app.example.com');
    });

    test('should filter out falsy values from allowed origins', () => {
      const event = { headers: { origin: 'https://evil.com' } };
      const allowedOrigins = [null, '', 'https://app.example.com', undefined, false];
      const headers = getCorsHeaders(event, allowedOrigins);

      expect(headers['Access-Control-Allow-Origin']).toBe('https://app.example.com');
    });

    test('should return wildcard when all allowed origins are falsy', () => {
      const event = { headers: { origin: 'https://example.com' } };
      const allowedOrigins = [null, '', undefined, false];
      const headers = getCorsHeaders(event, allowedOrigins);

      expect(headers['Access-Control-Allow-Origin']).toBe('*');
    });

    test('should return consistent headers structure', () => {
      const event = { headers: { origin: 'https://example.com' } };
      const headers = getCorsHeaders(event);

      expect(headers).toHaveProperty('Access-Control-Allow-Origin');
      expect(headers).toHaveProperty('Access-Control-Allow-Headers');
      expect(headers).toHaveProperty('Access-Control-Allow-Methods');
      expect(headers['Access-Control-Allow-Headers']).toBe('Content-Type, Authorization');
      expect(headers['Access-Control-Allow-Methods']).toBe('POST, OPTIONS, GET');
    });

    test('should handle empty allowed origins array', () => {
      const event = { headers: { origin: 'https://example.com' } };
      const allowedOrigins = [];
      const headers = getCorsHeaders(event, allowedOrigins);

      expect(headers['Access-Control-Allow-Origin']).toBe('*');
    });

    test('should be case-sensitive for origin matching', () => {
      const event = { headers: { origin: 'https://APP.EXAMPLE.COM' } };
      const allowedOrigins = ['https://app.example.com'];
      const headers = getCorsHeaders(event, allowedOrigins);

      // Should not match due to case sensitivity
      expect(headers['Access-Control-Allow-Origin']).toBe('https://app.example.com');
    });
  });

  describe('handleCorsPrelight', () => {
    test('should handle OPTIONS request and return proper response', () => {
      const event = {
        httpMethod: 'OPTIONS',
        headers: { origin: 'https://app.example.com' }
      };
      const allowedOrigins = ['https://app.example.com'];
      const response = handleCorsPrelight(event, allowedOrigins);

      expect(response).toEqual({
        statusCode: 204,
        headers: {
          'Access-Control-Allow-Origin': 'https://app.example.com',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'POST, OPTIONS, GET'
        },
        body: ''
      });
    });

    test('should return null for non-OPTIONS requests', () => {
      const event = {
        httpMethod: 'POST',
        headers: { origin: 'https://app.example.com' }
      };
      const allowedOrigins = ['https://app.example.com'];
      const response = handleCorsPrelight(event, allowedOrigins);

      expect(response).toBe(null);
    });

    test('should handle OPTIONS request without allowed origins', () => {
      const event = {
        httpMethod: 'OPTIONS',
        headers: { origin: 'https://example.com' }
      };
      const response = handleCorsPrelight(event);

      expect(response).toEqual({
        statusCode: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'POST, OPTIONS, GET'
        },
        body: ''
      });
    });

    test('should handle case-insensitive HTTP method', () => {
      const event = {
        httpMethod: 'options', // lowercase
        headers: { origin: 'https://example.com' }
      };
      const response = handleCorsPrelight(event);

      expect(response).toBe(null); // Should not match lowercase 'options'
    });

    test('should return response with correct status code for OPTIONS', () => {
      const event = {
        httpMethod: 'OPTIONS',
        headers: {}
      };
      const response = handleCorsPrelight(event);

      expect(response.statusCode).toBe(204);
      expect(response.body).toBe('');
    });

    test('should include all required CORS headers in OPTIONS response', () => {
      const event = {
        httpMethod: 'OPTIONS',
        headers: { origin: 'https://test.com' }
      };
      const response = handleCorsPrelight(event, ['https://test.com']);

      const headers = response.headers;
      expect(headers).toHaveProperty('Access-Control-Allow-Origin');
      expect(headers).toHaveProperty('Access-Control-Allow-Headers');
      expect(headers).toHaveProperty('Access-Control-Allow-Methods');
    });

    test('should handle GET request and return null', () => {
      const event = {
        httpMethod: 'GET',
        headers: { origin: 'https://example.com' }
      };
      const response = handleCorsPrelight(event);

      expect(response).toBe(null);
    });

    test('should handle PUT request and return null', () => {
      const event = {
        httpMethod: 'PUT',
        headers: { origin: 'https://example.com' }
      };
      const response = handleCorsPrelight(event);

      expect(response).toBe(null);
    });

    test('should handle DELETE request and return null', () => {
      const event = {
        httpMethod: 'DELETE',
        headers: { origin: 'https://example.com' }
      };
      const response = handleCorsPrelight(event);

      expect(response).toBe(null);
    });
  });

  describe('Integration tests', () => {
    test('should work together for a typical CORS flow', () => {
      const allowedOrigins = ['https://app.example.com', 'https://staging.example.com'];
      const requestOrigin = 'https://app.example.com';

      // Step 1: Handle preflight
      const preflightEvent = {
        httpMethod: 'OPTIONS',
        headers: { origin: requestOrigin }
      };
      const preflightResponse = handleCorsPrelight(preflightEvent, allowedOrigins);

      expect(preflightResponse.statusCode).toBe(204);
      expect(preflightResponse.headers['Access-Control-Allow-Origin']).toBe(requestOrigin);

      // Step 2: Handle actual request headers
      const actualEvent = {
        httpMethod: 'POST',
        headers: { origin: requestOrigin }
      };
      const actualHeaders = getCorsHeaders(actualEvent, allowedOrigins);

      expect(actualHeaders['Access-Control-Allow-Origin']).toBe(requestOrigin);
    });

    test('should handle disallowed origin consistently', () => {
      const allowedOrigins = ['https://app.example.com'];
      const disallowedOrigin = 'https://evil.com';

      // Preflight
      const preflightEvent = {
        httpMethod: 'OPTIONS',
        headers: { origin: disallowedOrigin }
      };
      const preflightResponse = handleCorsPrelight(preflightEvent, allowedOrigins);

      expect(preflightResponse.headers['Access-Control-Allow-Origin']).toBe('https://app.example.com');

      // Actual request
      const actualEvent = {
        httpMethod: 'POST',
        headers: { origin: disallowedOrigin }
      };
      const actualHeaders = getCorsHeaders(actualEvent, allowedOrigins);

      expect(actualHeaders['Access-Control-Allow-Origin']).toBe('https://app.example.com');
    });
  });
});