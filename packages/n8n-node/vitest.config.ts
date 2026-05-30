import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    alias: {
      '@metascrub/core': new URL('../core/src/index.ts', import.meta.url).pathname,
    },
  },
});
