import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    globals: false,
  },
  resolve: {
    alias: {
      '@metascrub/core': path.resolve(__dirname, '../core/dist/index.mjs'),
    },
  },
});
