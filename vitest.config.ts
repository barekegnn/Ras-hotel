import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Use jsdom for component tests; individual test files can override with
    // @vitest-environment node for pure server-side logic
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: [
        'node_modules/**',
        '.next/**',
        'src/shared/types/**',
        'src/app/api/**',          // API routes need integration tests
        'scripts/**',
        'supabase/**',
      ],
      thresholds: {
        lines:     60,
        functions: 60,
        branches:  55,
      },
    },
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'test_runner'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
