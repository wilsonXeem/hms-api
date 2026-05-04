module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      diagnostics: false
    }],
  },
  testPathIgnorePatterns: [
    '<rootDir>/src/tests/automated/',
    '<rootDir>/src/tests/e2e/',
    '<rootDir>/src/tests/integration/',
    '<rootDir>/src/tests/performance/',
    '<rootDir>/src/tests/security/'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/tests/**',
    '!src/drizzle/**',
    '!src/server.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testTimeout: 10000,
  clearMocks: true,
  resetMocks: true,
  maxWorkers: '50%',
  verbose: true
};
