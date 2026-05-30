// @ts-check
import * as esbuild from 'esbuild';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

/** @type {esbuild.BuildOptions} */
const config = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  // vscode is provided by the host; @metascrub/core is declared as a
  // dependency and will be present in node_modules at runtime — keeping it
  // external ensures the final bundle stays well under 200 KB.
  external: ['vscode', '@metascrub/core'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  minify: false,
  treeShaking: true,
  metafile: true,
  logLevel: 'info',
};

const result = await esbuild.build(config);

if (result.metafile) {
  const text = await esbuild.analyzeMetafile(result.metafile, { verbose: false });
  console.log(text);
}
