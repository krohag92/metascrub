import esbuild from 'esbuild';
import process from 'process';

const isWatch = process.argv.includes('--watch');

const ctx = await esbuild.context({
  entryPoints: ['main.ts'],
  bundle: true,
  // Obsidian runs inside Electron on desktop, which has full Node.js access.
  // On Obsidian mobile the runtime is JavaScriptCore; built-in Node modules
  // (fs/promises, path) will be unavailable at runtime, but @metascrub/core
  // only imports them lazily via dynamic import when a file-path input is used.
  // Since we always pass { kind: 'bytes' }, those branches are never hit.
  platform: 'node',
  target: 'es2022',
  format: 'cjs',
  outfile: 'main.js',
  sourcemap: true,
  external: [
    'obsidian',
    'electron',
    '@codemirror/autocomplete',
    '@codemirror/collab',
    '@codemirror/commands',
    '@codemirror/language',
    '@codemirror/lint',
    '@codemirror/search',
    '@codemirror/state',
    '@codemirror/view',
    '@lezer/common',
    '@lezer/highlight',
    '@lezer/lr',
  ],
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  logLevel: 'info',
});

if (isWatch) {
  await ctx.watch();
  console.log('Watching for changes...');
} else {
  await ctx.rebuild();
  await ctx.dispose();
}
