import { defineConfig } from 'vitest/config';

// Shared Vitest base per ADR-005 + R4. Packages override with defineConfig({ ...baseConfig, ... }).
export const baseConfig = defineConfig({
  test: {
    environment: 'node',
    globals: false,
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/*.config.*',
        '**/*.d.ts',
        '**/tests/**',
        '**/__fixtures__/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
    reporters: ['default'],
    testTimeout: 10_000,
    hookTimeout: 10_000,
  },
});

export default baseConfig;
