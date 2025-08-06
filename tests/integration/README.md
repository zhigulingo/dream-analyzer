# Integration Tests for Dream Analyzer API

This directory contains comprehensive integration tests for the Dream Analyzer Netlify Functions API endpoints.

## Overview

Integration tests verify the complete flow from HTTP request to response, including database interactions, authentication, and external service calls. These tests ensure that all API endpoints work correctly in a production-like environment.

## Test Structure

### Test Environment (`test-environment.js`)
- Configures test environment variables
- Provides mock Netlify event and context objects  
- Generates test JWT tokens and Telegram authentication data
- Includes test data generators for consistent test data

### Test Database (`test-database.js`)
- Manages test database setup and teardown
- Provides helper methods for creating test users and analyses
- Handles database cleanup between tests
- Includes health check functionality

### API Endpoint Tests

#### `analyze-dream.integration.test.js`
Tests for the `/analyze-dream` endpoint:
- ✅ Successful dream analysis with valid JWT tokens
- ✅ Authentication and authorization tests
- ✅ Input validation (empty dreams, malformed JSON, etc.)
- ✅ HTTP method validation (POST, OPTIONS, reject GET/PUT)
- ✅ Database integration (user creation, analysis storage)
- ✅ Performance benchmarks (response time, concurrent requests)

#### `deep-analysis.integration.test.js`
Tests for the `/deep-analysis` endpoint:
- ✅ Deep analysis with sufficient dreams and credits
- ✅ Credit management and safe decrement
- ✅ Minimum dreams requirement validation
- ✅ Telegram authentication flow
- ✅ Race condition handling for credit deduction
- ✅ Performance with large datasets

#### `user-profile.integration.test.js`
Tests for the `/user-profile` endpoint:
- ✅ Profile retrieval with statistics
- ✅ User creation for new Telegram users
- ✅ Authentication via Telegram data validation
- ✅ Data integrity and consistency checks
- ✅ Concurrent access patterns
- ✅ Performance with users having many analyses

#### `web-login.integration.test.js`
Tests for the `/web-login` endpoint:
- ✅ Login with correct username/password
- ✅ Password security (scrypt hashing validation)
- ✅ JWT token generation and cookie security
- ✅ Authentication failures (wrong password, missing user)
- ✅ Input validation and security (SQL injection, XSS attempts)
- ✅ CORS and origin validation

### Cross-Cutting Concerns

#### `error-scenarios.integration.test.js`
Comprehensive error handling tests:
- ✅ Network and infrastructure errors
- ✅ Authentication edge cases
- ✅ Data validation edge cases
- ✅ Rate limiting and resource exhaustion
- ✅ Concurrent access edge cases
- ✅ Environment configuration errors
- ✅ Cross-endpoint error consistency

#### `auth-flow.integration.test.js`
Authentication workflow tests:
- ✅ Complete JWT authentication cycle
- ✅ Token expiration and validation
- ✅ Telegram data authentication flow
- ✅ Cross-authentication compatibility
- ✅ Authentication security measures
- ✅ User creation during authentication

#### `performance.integration.test.js`
Performance benchmarks and monitoring:
- ✅ Response time benchmarks for all endpoints
- ✅ Throughput testing (concurrent requests)
- ✅ Scalability with large datasets
- ✅ Memory usage monitoring
- ✅ Error handling performance
- ✅ Baseline performance metrics

## Running the Tests

### Prerequisites

1. **Environment Variables**: Set up test environment variables:
   ```bash
   export TEST_SUPABASE_URL="your-test-supabase-url"
   export TEST_SUPABASE_SERVICE_KEY="your-test-service-key"
   export TEST_JWT_SECRET="test-jwt-secret"
   export TEST_GEMINI_API_KEY="test-gemini-key"
   export TEST_BOT_TOKEN="test-bot-token"
   ```

2. **Test Database**: Ensure you have a test database set up with the same schema as production.

### Running Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific test file
npm test tests/integration/analyze-dream.integration.test.js

# Run with verbose output
npm test tests/integration -- --verbose

# Run with coverage
npm run test:all
```

### Test Scripts

- `npm run test:unit` - Run only unit tests
- `npm run test:integration` - Run only integration tests  
- `npm run test:all` - Run all tests with coverage
- `npm run test:coverage` - Generate coverage report

## Test Configuration

### Timeouts
- Standard tests: 30 seconds
- Performance tests: Up to 3 minutes for comprehensive benchmarks
- Network tests: Extended timeouts for external service calls

### Database
- Automatic setup and teardown
- Isolated test data for each test
- Cleanup between tests to prevent interference

### Mocking
- Minimal mocking - tests use real services when possible
- Environment variables mocked for safety
- Netlify context and event objects mocked

## Performance Baselines

Current performance expectations:

| Endpoint | Response Time | Concurrent Load |
|----------|---------------|-----------------|
| `/analyze-dream` | < 15 seconds | 10 concurrent requests |
| `/deep-analysis` | < 30 seconds | 5 concurrent requests |
| `/user-profile` | < 3 seconds | 5 concurrent requests |
| `/web-login` | < 5 seconds | 5 concurrent requests |

## Coverage Goals

- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 80%
- **Statements**: 80%

## Debugging Tests

### Console Output
Performance metrics are logged during test runs:
```
[PERF] analyze-dream: 1234.56ms
[PERF] 10 concurrent analyze-dream: total=5678.90ms, avg=567.89ms
[BASELINE] analyzeDream: avg=1234ms, min=987ms, max=1567ms
```

### Test Database
- All test data is prefixed for easy identification
- Database health checks ensure connectivity
- Manual cleanup available if tests fail

### Environment Issues
- Tests verify required environment variables
- Graceful handling of missing configuration
- Clear error messages for setup issues

## Maintenance

### Adding New Tests
1. Create test file following naming convention: `*.integration.test.js`
2. Use test environment helpers for consistency
3. Include performance benchmarks for new endpoints
4. Add appropriate error scenarios

### Updating Tests
- Update performance baselines as the system evolves
- Adjust timeouts based on infrastructure changes
- Keep test data generators up to date with schema changes

### CI/CD Integration
Tests are designed to run in CI/CD environments:
- No dependency on external services for basic functionality
- Configurable timeouts for different environments
- Detailed reporting for build pipeline integration

## Security Considerations

Integration tests include security validation:
- Authentication bypass attempts
- SQL injection prevention
- XSS attack prevention  
- Token security validation
- Rate limiting verification
- CORS policy enforcement

## Contributing

When adding new API endpoints:
1. Create corresponding integration test file
2. Include all test categories (success, failure, security, performance)
3. Update this README with new endpoints
4. Ensure coverage meets project standards
5. Add performance baselines for the new endpoint