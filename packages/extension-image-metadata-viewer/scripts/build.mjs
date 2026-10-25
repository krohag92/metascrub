/* eslint-disable no-console */
import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { packZip } from './zip.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

const banner =
  '/*! Image Metadata Viewer ' +
  pkg.version +
  '. Includes ExifReader 4.31.0 (MPL-2.0); see licenses/ExifReader-MPL-2.0.txt. https://metadatafinder.com */\n';

function stage(dir, manifestName) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const manifest = JSON.parse(readFileSync(join(root, manifestName), 'utf8'));
  manifest.version = pkg.version;
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  cpSync(join(root, 'src/style.css'), join(dir, 'style.css'));
  cpSync(join(root, 'icons'), join(dir, 'icons'), { recursive: true });
  cpSync(join(root, 'licenses'), join(dir, 'licenses'), { recursive: true });
  for (const file of ['LICENSE', 'NOTICE.md', 'PRIVACY.md', 'README.md']) {
    cpSync(join(root, file), join(dir, file));
  }
}

async function bundle(dir) {
  const common = {
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'chrome109',
    legalComments: 'eof',
  };
  await esbuild.build({
    ...common,
    entryPoints: [join(root, 'src/background.ts')],
    outfile: join(dir, 'background.js'),
    banner: { js: banner },
  });
  await esbuild.build({
    ...common,
    entryPoints: [join(root, 'src/content.ts')],
    outfile: join(dir, 'content.js'),
  });
}

export async function build() {
  const chromiumDir = join(root, 'dist/chromium');
  const firefoxDir = join(root, 'dist/firefox');
  stage(chromiumDir, 'manifest.chromium.json');
  stage(firefoxDir, 'manifest.firefox.json');
  await bundle(chromiumDir);
  await bundle(firefoxDir);
  const chromiumZip = join(root, 'dist/image-metadata-viewer-chromium.zip');
  const firefoxZip = join(root, 'dist/image-metadata-viewer-firefox.zip');
  writeFileSync(chromiumZip, packZip(chromiumDir));
  writeFileSync(firefoxZip, packZip(firefoxDir));
  return { chromiumDir, firefoxDir, chromiumZip, firefoxZip };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  build()
    .then(({ chromiumZip, firefoxZip }) => {
      console.log(chromiumZip);
      console.log(firefoxZip);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
