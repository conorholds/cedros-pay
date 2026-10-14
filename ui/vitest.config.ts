import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'cedros:admin': resolve(__dirname, 'src/__tests__/mocks/cedrosAdminRuntime.ts'),
    },
  },
  test: {
    // Keep a single worker to avoid dynamic-module mock cross-suite interference.
    maxWorkers: 1,
    minWorkers: 1,
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['react-native/**'],
    coverage: {
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/__tests__/**',
        'examples/**',
        '**/*.d.ts',
      ],
      // Global thresholds (minimum 80% for all code)
      thresholds: {
        statements: 80,
        lines: 80,
        branches: 75,
        functions: 80,
      },
    },
  },
});
