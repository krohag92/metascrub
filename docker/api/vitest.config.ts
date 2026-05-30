import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

export default defineConfig({
  resolve: {
    alias: {
      // Allow importing core test helpers from the API test suite.
      '../../packages/core/test/helpers': path.join(repoRoot, 'packages/core/test/helpers'),
      '@metascrub/core': path.join(repoRoot, 'packages/core/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['test/**/*.test.ts'],
    testTimeout: 15_000,
    root: __dirname,
  },
});
