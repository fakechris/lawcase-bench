/** @type {import('jest').Config} */
const config = {
  // Use Node environment for testing
  testEnvironment: 'node',

  // Test timeout
  testTimeout: 10000,

  // Enable ES modules support
  transform: {},

  // Coverage configuration
  collectCoverage: false,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.js',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/*.config.{js,ts}',
  ],

  // Test match patterns
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],

  // Ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/', '/.next/'],

  // Module name mapping for aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Reporter configuration
  reporters: ['default'],

  // Performance settings
  maxWorkers: '50%',

  // Verbose output
  verbose: true,
};

export default config;
