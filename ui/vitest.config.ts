import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
        'stories/**',
        'examples/**',
        '**/*.d.ts',
        'src/index.ts', // Re-export file
      ],
      // Global thresholds (minimum 80% for all code)
      thresholds: {
        statements: 80,
        lines: 80,
        branches: 75,
        functions: 80,
      },
      // Per-file thresholds for critical payment logic (90%)
      perFile: true,
      thresholdsPerFile: {
        'src/components/CedrosPay.tsx': {
          statements: 90,
          lines: 90,
          branches: 85,
          functions: 90,
        },
        'src/hooks/useStripeCheckout.ts': {
          statements: 90,
          lines: 90,
          branches: 85,
          functions: 90,
        },
        'src/hooks/useX402Payment.ts': {
          statements: 90,
          lines: 90,
          branches: 85,
          functions: 90,
        },
      },
    },
  },
});
