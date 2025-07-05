module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'supabase/functions/**/*.ts',
    '!supabase/functions/**/*.d.ts',
    '!supabase/functions/_shared/cors.ts', // Skip CORS helper
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,
  // Environment variables for tests
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  }
} 