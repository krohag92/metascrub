/**
 * esbuild config for MetaScrub Figma plugin.
 *
 * Two outputs:
 *   1. dist/code.js   — sandbox bundle (IIFE, targets Figma plugin sandbox)
 *   2. dist/ui.html   — HTML file with inlined JS bundle (UI iframe)
 *
 * @metascrub/core dynamically imports Node-only modules (fs/promises, path,
 * exifr, pdf-lib, jszip, music-metadata) behind `isNode` guards. We mark those
 * as external so esbuild doesn't try to resolve them. In Figma's browser env,
 * `isNode` evaluates to false at runtime, so those code paths are never reached.
 */

import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

mkdirSync(path.join(__dirname, 'dist'), { recursive: true });

/** Node builtins and optional deps that are dynamically imported inside isNode guards. */
const nodeOnlyPackages = [
  'fs/promises',
  'path',
  'node:fs/promises',
  'node:path',
  'exifr',
  'pdf-lib',
  'jszip',
  'music-metadata',
];

const sharedOptions = {
  bundle: true,
  platform: /** @type {const} */ ('browser'),
  // es2020 is the minimum target that supports BigInt literals used by the core
  target: 'es2020',
  format: /** @type {const} */ ('iife'),
  define: {
    'process.env.NODE_ENV': '"production"',
    // Ensure isNode evaluates to false so tree-shaking eliminates dead branches
    'process.versions': 'undefined',
  },
  external: nodeOnlyPackages,
  logLevel: /** @type {const} */ ('info'),
};

// ---- Build 1: Sandbox code (code.ts → dist/code.js) ----
await esbuild.build({
  ...sharedOptions,
  entryPoints: [path.join(__dirname, 'src/code.ts')],
  outfile: path.join(__dirname, 'dist/code.js'),
});

// ---- Build 2: UI bundle (ui/main.ts → inline JS in ui.html) ----
const uiResult = await esbuild.build({
  ...sharedOptions,
  entryPoints: [path.join(__dirname, 'src/ui/main.ts')],
  write: false, // capture output in memory
});

const uiJS = uiResult.outputFiles[0].text;

// Read HTML template and inject the bundled JS
const htmlTemplate = readFileSync(
  path.join(__dirname, 'src/ui/index.html'),
  'utf-8',
);

const finalHtml = htmlTemplate.replace('__MAIN_SCRIPT__', uiJS);

writeFileSync(path.join(__dirname, 'dist/ui.html'), finalHtml, 'utf-8');

const uiSizeKb = (Buffer.byteLength(finalHtml, 'utf-8') / 1024).toFixed(1);
console.log(`dist/ui.html written (${uiSizeKb} KB)`);
