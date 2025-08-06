module.exports = {
  // Test environment - Node.js for backend tests
  testEnvironment: 'node',
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },
  
  // Files to include in coverage
  collectCoverageFrom: [
    'bot/functions/**/*.js',
    '!bot/functions/**/*.test.js',
    '!bot/functions/**/node_modules/**'
  ],
  
  // Test file patterns
  testMatch: ['**/tests/**/*.test.js'],
  
  // Setup files (if needed)
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Module paths
  moduleDirectories: ['node_modules', '<rootDir>'],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Timeout for tests (30 seconds)
  testTimeout: 30000,

  // Transform ignore patterns for proper .mjs parsing
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ]
};