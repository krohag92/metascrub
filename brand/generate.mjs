/* eslint-disable no-console */
/**
 * Rasterise brand/logo/mark.svg into every icon size the monorepo ships.
 *
 *   pnpm brand:icons
 *
 * Edit brand/logo/mark.svg and brand/tokens.json, then re-run. Do not hand-edit
 * the PNGs, ICO, ICNS, or brand/logo/wordmark.svg — this script overwrites them.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync, inflateRawSync, crc32 } from 'node:zlib';
import sharp from 'sharp';

const brandDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(brandDir, '..');

const tokens = JSON.parse(readFileSync(join(brandDir, 'tokens.json'), 'utf8'));
const markSvg = readFileSync(join(brandDir, 'logo', 'mark.svg'), 'utf8');

const NAVY = tokens.color.navy;
const GREEN = tokens.color.green;
const PAPER = tokens.color.paper;
const SLATE = tokens.color.slate;
const MIST = tokens.color.mist;
const MUTED = tokens.color.muted;
const FONT = tokens.font.family;

if (!markSvg.includes(NAVY) || !markSvg.includes(GREEN)) {
  throw new Error('brand/logo/mark.svg must use the navy and green tokens');
}

/** @type {{ path: string, width: number, height: number, kind: string }[]} */
const manifest = [];

function repoPath(path) {
  return relative(repoRoot, path).split('\\').join('/');
}

function ensureDir(file) {
  mkdirSync(dirname(file), { recursive: true });
}

function record(file, width, height, kind) {
  manifest.push({ path: repoPath(file), width, height, kind });
}

function innerMarkup(svg) {
  return svg.replace(/^\s*<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
}

function squareMark(svg) {
  return svg.replace('rx="3.5"', 'rx="0"');
}

function artworkSvg(svg) {
  const inner = innerMarkup(svg).replace(/<rect id="bg"[^>]*\/>/, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">${inner}</svg>`;
}

function withPixelSize(svg, width, height) {
  return svg.replace('<svg ', `<svg width="${width}" height="${height}" `);
}

async function raster(svg, width, height) {
  const buf = await sharp(Buffer.from(withPixelSize(svg, width, height)))
    .png({ compressionLevel: 9 })
    .toBuffer();
  const meta = await sharp(buf).metadata();
  if (meta.width !== width || meta.height !== height) {
    throw new Error(`Rendered ${meta.width}x${meta.height}, expected ${width}x${height}`);
  }
  return buf;
}

async function writeRaster(svg, width, height, file, kind) {
  ensureDir(file);
  const buf = await raster(svg, width, height);
  writeFileSync(file, buf);
  record(file, width, height, kind);
  return buf;
}

async function writeSquarePng(size, file, kind) {
  return writeRaster(markSvg, size, size, file, kind);
}

async function writeSolid(size, file) {
  ensureDir(file);
  const buf = await sharp({
    create: { width: size, height: size, channels: 3, background: NAVY },
  })
    .png({ compressionLevel: 9 })
    .toBuffer();
  writeFileSync(file, buf);
  record(file, size, size, 'background');
}

async function writeForeground(size, file) {
  const artSize = Math.max(1, Math.round(size * 0.72));
  const art = await raster(artworkSvg(markSvg), artSize, artSize);
  ensureDir(file);
  const buf = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: art, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  writeFileSync(file, buf);
  record(file, size, size, 'foreground');
}

function wordmarkSvg() {
  const inner = innerMarkup(markSvg);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 168" role="img" aria-label="MetaScrub, Metadata Finder">
  <title>MetaScrub — Metadata Finder</title>
  <svg x="8" y="20" width="128" height="128" viewBox="0 0 16 16">${inner}</svg>
  <text x="160" y="86" font-family="${FONT}" font-size="64" font-weight="700" fill="${NAVY}">${tokens.product}</text>
  <text x="164" y="124" font-family="${FONT}" font-size="24" font-weight="500" fill="${SLATE}">${tokens.brand}</text>
</svg>
`;
}

function promoSvg(width, height) {
  const mark = Math.round(height * 0.42);
  const pad = Math.round(width * 0.055);
  const textX = pad + mark + Math.round(width * 0.04);
  const title = Math.round(height * 0.145);
  const sub = Math.round(height * 0.058);
  const body = Math.round(height * 0.048);
  const url = Math.round(height * 0.04);
  const blockH = title + sub + body * 2 + url + Math.round(height * 0.08);
  let y = Math.round((height - blockH) / 2) + title;
  const subY = y + Math.round(sub * 1.35);
  const bodyY = subY + Math.round(body * 1.7);
  const body2Y = bodyY + Math.round(body * 1.35);
  const urlY = height - pad - 4;
  const markY = Math.round((height - mark) / 2);
  const inner = innerMarkup(markSvg);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${NAVY}"/>
  <svg x="${pad}" y="${markY}" width="${mark}" height="${mark}" viewBox="0 0 16 16">${inner}</svg>
  <text x="${textX}" y="${y}" font-family="${FONT}" font-size="${title}" font-weight="700" fill="${PAPER}">${tokens.product}</text>
  <text x="${textX}" y="${subY}" font-family="${FONT}" font-size="${sub}" font-weight="600" fill="${GREEN}">${tokens.brand}</text>
  <text x="${textX}" y="${bodyY}" font-family="${FONT}" font-size="${body}" font-weight="400" fill="${MIST}">See and strip metadata</text>
  <text x="${textX}" y="${body2Y}" font-family="${FONT}" font-size="${body}" font-weight="400" fill="${MIST}">from any file</text>
  <text x="${pad}" y="${urlY}" font-family="${FONT}" font-size="${url}" font-weight="500" fill="${MUTED}">metadatafinder.com</text>
</svg>`;
}

function writeIco(images) {
  const count = images.length;
  let offset = 6 + count * 16;
  const header = Buffer.alloc(offset);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  const parts = [header];
  images.forEach((img, index) => {
    const pos = 6 + index * 16;
    const dim = img.size >= 256 ? 0 : img.size;
    header.writeUInt8(dim, pos);
    header.writeUInt8(dim, pos + 1);
    header.writeUInt16LE(1, pos + 4);
    header.writeUInt16LE(32, pos + 6);
    header.writeUInt32LE(img.png.length, pos + 8);
    header.writeUInt32LE(offset, pos + 12);
    parts.push(img.png);
    offset += img.png.length;
  });
  return Buffer.concat(parts);
}

const ICNS_TYPES = [
  ['icp4', 16],
  ['icp5', 32],
  ['ic11', 32],
  ['icp6', 64],
  ['ic12', 64],
  ['ic07', 128],
  ['ic08', 256],
  ['ic13', 256],
  ['ic09', 512],
  ['ic14', 512],
  ['ic10', 1024],
];

function writeIcns(pngBySize) {
  const chunks = [];
  for (const [type, size] of ICNS_TYPES) {
    const png = pngBySize.get(size);
    if (!png) throw new Error(`ICNS missing ${size}px PNG for ${type}`);
    const header = Buffer.alloc(8);
    header.write(type, 0, 'ascii');
    header.writeUInt32BE(8 + png.length, 4);
    chunks.push(header, png);
  }
  const body = Buffer.concat(chunks);
  const fileHeader = Buffer.alloc(8);
  fileHeader.write('icns', 0, 'ascii');
  fileHeader.writeUInt32BE(8 + body.length, 4);
  return Buffer.concat([fileHeader, body]);
}

function findEocd(buf) {
  const min = Math.max(0, buf.length - 22 - 65535);
  for (let i = buf.length - 22; i >= min; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) return i;
  }
  throw new Error('ZIP end-of-central-directory not found');
}

function readZip(buf) {
  const eocd = findEocd(buf);
  const count = buf.readUInt16LE(eocd + 8);
  let p = buf.readUInt32LE(eocd + 16);
  const entries = [];
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('Bad ZIP central directory');
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString('utf8');
    const localNameLen = buf.readUInt16LE(localOffset + 26);
    const localExtraLen = buf.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    const compressed = buf.subarray(dataStart, dataStart + compSize);
    let data;
    if (method === 0) data = Buffer.from(compressed);
    else if (method === 8) data = inflateRawSync(compressed);
    else throw new Error(`Unsupported ZIP method ${method} for ${name}`);
    entries.push({ name, data });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function dosStamp() {
  // Fixed 2026-01-01 00:00 so re-runs do not churn ZIP timestamps.
  const day = ((2026 - 1980) << 9) | (1 << 5) | 1;
  return { time: 0, day };
}

function writeZip(entries) {
  const { time, day } = dosStamp();
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const entry of entries) {
    const nameBytes = Buffer.from(entry.name, 'utf8');
    const compressed = deflateRawSync(entry.data, { level: 9 });
    const crc = crc32(entry.data);
    const local = Buffer.alloc(30 + nameBytes.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    nameBytes.copy(local, 30);
    locals.push(local, compressed);

    const central = Buffer.alloc(46 + nameBytes.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(day, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    nameBytes.copy(central, 46);
    centrals.push(central);
    offset += local.length + compressed.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuf, eocd]);
}

function patchZip(zipFile, replacements) {
  if (!existsSync(zipFile)) return;
  const entries = readZip(readFileSync(zipFile));
  let replaced = 0;
  for (const entry of entries) {
    const next = replacements.get(entry.name);
    if (next) {
      entry.data = next;
      replaced += 1;
    }
  }
  if (replaced !== replacements.size) {
    const missing = [...replacements.keys()].filter(
      (name) => !entries.some((e) => e.name === name),
    );
    throw new Error(`${zipFile} is missing icon entries: ${missing.join(', ')}`);
  }
  writeFileSync(zipFile, writeZip(entries));
  console.log(`patched ${repoPath(zipFile)} (${replaced} icons)`);
}

const pngBySize = new Map();

async function rounded(size, file) {
  const buf = await writeSquarePng(size, file, 'mark');
  if (!pngBySize.has(size)) pngBySize.set(size, buf);
  return buf;
}

async function copyRounded(size, file) {
  if (!pngBySize.has(size)) {
    return rounded(size, file);
  }
  ensureDir(file);
  writeFileSync(file, pngBySize.get(size));
  record(file, size, size, 'mark');
  return pngBySize.get(size);
}

const distIcons = join(brandDir, 'dist', 'icons');
const ROUNDED_MASTER = [16, 24, 32, 48, 64, 96, 128, 180, 192, 256, 512, 1024];
for (const size of ROUNDED_MASTER) {
  await rounded(size, join(distIcons, `${size}.png`));
}

const squareBySize = new Map();
async function square(size, file) {
  const svg = squareMark(markSvg);
  const buf = await writeRaster(svg, size, size, file, 'square');
  squareBySize.set(size, buf);
  return buf;
}

const IOS = [20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024];
for (const size of IOS) {
  await square(size, join(brandDir, 'dist', 'icons', 'ios', `${size}.png`));
}

const wordmark = wordmarkSvg();
const wordmarkFileSvg = join(brandDir, 'logo', 'wordmark.svg');
writeFileSync(wordmarkFileSvg, wordmark);
record(wordmarkFileSvg, 760, 168, 'svg');
const wordmarkBuf = await sharp(
  Buffer.from(wordmark.replace('<svg ', '<svg width="1520" height="336" ')),
)
  .png({ compressionLevel: 9 })
  .toBuffer();
const wordmarkFile = join(brandDir, 'dist', 'wordmark.png');
ensureDir(wordmarkFile);
writeFileSync(wordmarkFile, wordmarkBuf);
const wordmarkMeta = await sharp(wordmarkBuf).metadata();
record(wordmarkFile, wordmarkMeta.width ?? 0, wordmarkMeta.height ?? 0, 'wordmark');

const tiles = [
  ['chrome-small-tile-440x280.png', 440, 280],
  ['chrome-marquee-1400x560.png', 1400, 560],
  ['social-1280x640.png', 1280, 640],
];
for (const [name, width, height] of tiles) {
  const file = join(brandDir, 'dist', 'store', name);
  const buf = await sharp(Buffer.from(promoSvg(width, height)))
    .png({ compressionLevel: 9 })
    .toBuffer();
  const meta = await sharp(buf).metadata();
  if (meta.width !== width || meta.height !== height) {
    throw new Error(`${name} rendered ${meta.width}x${meta.height}`);
  }
  ensureDir(file);
  writeFileSync(file, buf);
  record(file, width, height, 'promo');
}

const icoSizes = [16, 32, 48, 64, 128, 256];
const ico = writeIco(icoSizes.map((size) => ({ size, png: pngBySize.get(size) })));
const icoFile = join(brandDir, 'dist', 'favicon.ico');
writeFileSync(icoFile, ico);
record(icoFile, 256, 256, 'ico');

for (const file of [
  join(repoRoot, 'packages', 'mobile', 'public', 'favicon.ico'),
  join(repoRoot, 'packages', 'desktop', 'public', 'favicon.ico'),
]) {
  ensureDir(file);
  writeFileSync(file, ico);
  record(file, 256, 256, 'ico');
}

const icnsSizes = [16, 32, 64, 128, 256, 512, 1024];
for (const size of icnsSizes) {
  if (!pngBySize.has(size)) await rounded(size, join(distIcons, `${size}.png`));
}
const icns = writeIcns(pngBySize);
const icnsFile = join(brandDir, 'dist', 'icon.icns');
writeFileSync(icnsFile, icns);
record(icnsFile, 1024, 1024, 'icns');

const extIcon = (size, name) =>
  join(repoRoot, 'packages', 'extension', 'public', 'icons', name ?? `${size}.png`);
for (const size of [16, 32, 48, 128]) {
  await copyRounded(size, extIcon(size));
  await copyRounded(
    size,
    join(repoRoot, 'packages', 'extension', 'dist-firefox', 'icons', `${size}.png`),
  );
}

const zipIcons = new Map();
for (const size of [16, 32, 48, 128]) {
  zipIcons.set(`icons/${size}.png`, pngBySize.get(size));
}
patchZip(join(repoRoot, 'packages', 'extension', 'dist.zip'), zipIcons);
patchZip(join(repoRoot, 'packages', 'extension', 'dist-firefox.zip'), zipIcons);

await copyRounded(128, join(repoRoot, 'packages', 'vscode', 'icon.png'));
await copyRounded(256, join(repoRoot, 'packages', 'vscode', 'icon-256.png'));
await copyRounded(512, join(repoRoot, 'packages', 'raycast', 'command-icon.png'));
await copyRounded(256, join(repoRoot, 'packages', 'obsidian', 'icon.png'));
await copyRounded(128, join(repoRoot, 'packages', 'figma', 'icon.png'));

const n8nSvg = join(repoRoot, 'packages', 'n8n-node', 'nodes', 'MetaScrub', 'metascrub.svg');
writeFileSync(n8nSvg, markSvg);
record(n8nSvg, 16, 16, 'svg');

const tauriDir = join(repoRoot, 'packages', 'desktop', 'src-tauri', 'icons');
const tauriSizes = {
  '16x16.png': 16,
  '32x32.png': 32,
  '48x48.png': 48,
  '64x64.png': 64,
  '128x128.png': 128,
  '128x128@2x.png': 256,
  '256x256.png': 256,
  '512x512.png': 512,
  '1024x1024.png': 1024,
  'icon.png': 512,
};
for (const [name, size] of Object.entries(tauriSizes)) {
  await copyRounded(size, join(tauriDir, name));
}
writeFileSync(join(tauriDir, 'icon.ico'), ico);
record(join(tauriDir, 'icon.ico'), 256, 256, 'ico');
writeFileSync(join(tauriDir, 'icon.icns'), icns);
record(join(tauriDir, 'icon.icns'), 1024, 1024, 'icns');
await copyRounded(32, join(repoRoot, 'packages', 'desktop', 'public', 'icons', '32x32.png'));

const mobilePublic = join(repoRoot, 'packages', 'mobile', 'public', 'icons');
for (const size of [16, 32, 48, 128, 180, 192, 512]) {
  const kindFile = join(mobilePublic, `icon-${size}.png`);
  if (size === 180) await square(size, kindFile);
  else await copyRounded(size, kindFile);
}

const iosDir = join(repoRoot, 'packages', 'mobile', 'ios', 'icons');
for (const size of IOS) {
  const file = join(iosDir, `icon-${size}.png`);
  ensureDir(file);
  writeFileSync(file, squareBySize.get(size));
  record(file, size, size, 'square');
}

const android = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
};
for (const [density, size] of Object.entries(android)) {
  const dir = join(repoRoot, 'packages', 'mobile', 'android', 'icons', `mipmap-${density}`);
  await copyRounded(size, join(dir, 'ic_launcher.png'));
  await writeSolid(size, join(dir, 'ic_launcher_background.png'));
  await writeForeground(size, join(dir, 'ic_launcher_foreground.png'));
}

const viewerIcons = join(
  repoRoot,
  'packages',
  'extension-image-metadata-viewer',
  'icons',
);
for (const size of [16, 32, 48, 128]) {
  await copyRounded(size, join(viewerIcons, `${size}.png`));
}

writeFileSync(
  join(brandDir, 'dist', 'manifest.json'),
  JSON.stringify({ files: manifest }, null, 2) + '\n',
);
console.log(`wrote ${manifest.length} brand assets`);
