/// <reference types="vitest" />
import { resolve } from 'path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/setupTests.ts'],
    include: ['**/*.{test,spec}.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    env: {
      NODE_ENV: 'test',
    },
    envDir: '.',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
