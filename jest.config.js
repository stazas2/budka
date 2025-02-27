module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverage: true,
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '.*\\.cs$', // Exclude C# files
    '/C:/MosPhotoBooth2/', // Exclude C# project directory
    '/D:/budka/modules/systemMonitor.js', // Exclude specific files temporarily
    '/D:/budka/utils/configLoader.js'
  ],
  moduleNameMapper: {
    '^electron$': '<rootDir>/__mocks__/electron.js'
  },
  coverageThreshold: {
    global: {
      branches: 30, // Lower thresholds for initial testing
      functions: 20,
      lines: 50,
      statements: 50,
    },
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  // Set up automatic mocking of the modules directory
  moduleDirectories: ['node_modules', '<rootDir>'],
  clearMocks: true,
  resetMocks: false,
};