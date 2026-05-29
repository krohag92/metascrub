import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
  },
  resolve: {
    alias: {
      // Point @metascrub/core/browser to the actual dist file
      '@metascrub/core/browser': new URL('../../core/dist/browser.mjs', import.meta.url).pathname,
      '@metascrub/core': new URL('../../core/dist/index.mjs', import.meta.url).pathname,
    },
  },
});
