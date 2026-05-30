import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Resolve workspace dependencies from the monorepo root node_modules.
  // This ensures that transitive deps of @metascrub/core (exifr, jszip, etc.)
  // are found during the Vite bundle step.
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      // Point to the workspace root node_modules as a fallback resolver
    },
  },

  // Tell Vite where to look for node_modules (workspace root + local)
  optimizeDeps: {
    include: [
      'exifr',
      'jszip',
      'pdf-lib',
      'music-metadata',
    ],
  },

  // Vite options tailored for Tauri development and only if `tauri dev` is used:
  // - prevent vite from obscuring rust errors
  clearScreen: false,
  // - tauri expects a fixed port, fail if that port is not available
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      // tell vite to ignore watching `src-tauri`
      ignored: ['**/src-tauri/**'],
    },
  },

  // Build the frontend to the `dist` folder (Tauri reads this on release)
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
      // Silence the "module externalized" warnings for Node built-ins that
      // are only reachable via the Node-only code path in @metascrub/core
      // (which is never exercised in the browser bundle).
      external: ['fs/promises', 'path', 'module'],
      onwarn(warning, warn) {
        // Suppress "Module externalized" noise — fs/path are only hit at
        // Node runtime, never in the browser Tauri webview.
        if (warning.code === 'UNRESOLVED_IMPORT') return;
        if (warning.message.includes('externalized for browser compatibility')) return;
        warn(warning);
      },
    },
  },

  // When testing with vitest, mock Tauri IPC
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    globals: true,
  },
});
