import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Point to the core source directory so Vite bundles its deps (exifr etc.)
      // along with the rest of the app. Using the src entry avoids needing to
      // have exifr pre-installed in mobile's own node_modules.
      '@metascrub/core': resolve(__dirname, '../../packages/core/src/index.ts'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      // Stub out Node-only built-ins that exifr may reference conditionally.
      // They are never called in the browser path.
      external: ['fs', 'fs/promises', 'path', 'stream', 'os'],
      output: {
        manualChunks: undefined,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
  },
});
