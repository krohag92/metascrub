import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { inflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';

const brandDir = resolve(import.meta.dirname, '..');
const repoRoot = resolve(brandDir, '..');

interface ManifestEntry {
  path: string;
  width: number;
  height: number;
  kind: string;
}

const manifest = JSON.parse(readFileSync(resolve(brandDir, 'dist/manifest.json'), 'utf8')) as {
  files: ManifestEntry[];
};

function abs(entry: ManifestEntry): string {
  return resolve(repoRoot, entry.path);
}

describe('brand tokens', () => {
  it('uses the press-kit palette and the Metadata Finder homepage', () => {
    const tokens = JSON.parse(readFileSync(resolve(brandDir, 'tokens.json'), 'utf8')) as {
      color: { navy: string; green: string; paper: string };
      homepage: string;
      product: string;
      brand: string;
      tagline: string;
    };
    expect(tokens.product).toBe('MetaScrub');
    expect(tokens.brand).toBe('Metadata Finder');
    expect(tokens.tagline).toBe('See and strip metadata from any file');
    expect(tokens.homepage).toBe('https://metadatafinder.com');
    expect(tokens.color.navy).toBe('#0F172A');
    expect(tokens.color.green).toBe('#22C55E');
    expect(tokens.color.paper).toBe('#F8FAFC');

    const css = readFileSync(resolve(brandDir, 'tokens.css'), 'utf8').toLowerCase();
    expect(css).toContain(tokens.color.navy.toLowerCase());
    expect(css).toContain(tokens.color.green.toLowerCase());
    expect(css).toContain(tokens.color.paper.toLowerCase());
  });

  it('keeps the mark SVG self-contained and on the 16px grid', () => {
    const mark = readFileSync(resolve(brandDir, 'logo/mark.svg'), 'utf8');
    expect(mark).toContain('viewBox="0 0 16 16"');
    expect(mark).toContain('#0F172A');
    expect(mark).toContain('#22C55E');
    expect(mark).not.toMatch(/<script/i);
    expect(mark).not.toMatch(/href="http/i);
  });
});

describe('generated icon set', () => {
  const required = [
    'brand/logo/wordmark.svg',
    'brand/dist/icons/16.png',
    'brand/dist/icons/128.png',
    'brand/dist/icons/512.png',
    'brand/dist/store/chrome-small-tile-440x280.png',
    'brand/dist/store/chrome-marquee-1400x560.png',
    'brand/dist/store/social-1280x640.png',
    'packages/extension/public/icons/16.png',
    'packages/extension/public/icons/32.png',
    'packages/extension/public/icons/48.png',
    'packages/extension/public/icons/128.png',
    'packages/extension-image-metadata-viewer/icons/16.png',
    'packages/extension-image-metadata-viewer/icons/32.png',
    'packages/extension-image-metadata-viewer/icons/48.png',
    'packages/extension-image-metadata-viewer/icons/128.png',
    'packages/vscode/icon.png',
    'packages/vscode/icon-256.png',
    'packages/raycast/command-icon.png',
    'packages/obsidian/icon.png',
    'packages/figma/icon.png',
    'packages/n8n-node/nodes/MetaScrub/metascrub.svg',
    'packages/desktop/src-tauri/icons/icon.ico',
    'packages/desktop/src-tauri/icons/icon.icns',
    'packages/desktop/src-tauri/icons/128x128@2x.png',
    'packages/desktop/public/icons/32x32.png',
    'packages/mobile/public/favicon.ico',
    'packages/mobile/public/icons/icon-192.png',
    'packages/mobile/public/icons/icon-512.png',
    'packages/mobile/ios/icons/icon-1024.png',
    'packages/mobile/android/icons/mipmap-mdpi/ic_launcher_foreground.png',
    'packages/mobile/android/icons/mipmap-xxxhdpi/ic_launcher.png',
  ];

  it('covers every package slot the generator is supposed to fill', () => {
    const paths = new Set(manifest.files.map((file) => file.path));
    for (const path of required) {
      expect(paths.has(path), path).toBe(true);
    }
  });

  it('writes real images at the recorded sizes', async () => {
    expect(manifest.files.length).toBeGreaterThan(50);
    for (const entry of manifest.files) {
      const file = abs(entry);
      const buf = readFileSync(file);
      if (entry.kind === 'svg') {
        const text = buf.toString('utf8');
        expect(text).toContain('#22C55E');
        expect(text).toContain('#0F172A');
        expect(text).not.toMatch(/<script/i);
        continue;
      }
      if (entry.kind === 'ico') {
        expect(buf.readUInt16LE(0)).toBe(0);
        expect(buf.readUInt16LE(2)).toBe(1);
        expect(buf.readUInt16LE(4)).toBeGreaterThan(1);
        continue;
      }
      if (entry.kind === 'icns') {
        expect(buf.subarray(0, 4).toString('ascii')).toBe('icns');
        expect(buf.readUInt32BE(4)).toBe(buf.length);
        continue;
      }
      const meta = await sharp(buf).metadata();
      expect(meta.width, entry.path).toBe(entry.width);
      expect(meta.height, entry.path).toBe(entry.height);
      if (entry.kind === 'foreground') expect(meta.hasAlpha).toBe(true);
      if (entry.kind === 'background') expect(meta.hasAlpha).toBe(false);
    }
  });

  it('is not a flat placeholder at 16px', async () => {
    const stats = await sharp(resolve(brandDir, 'dist/icons/16.png')).stats();
    const variation = stats.channels.reduce((sum, channel) => sum + channel.stdev, 0);
    expect(variation).toBeGreaterThan(20);
  });

  it('puts the same 128px mark in the committed extension zips', () => {
    const png = readFileSync(resolve(repoRoot, 'packages/extension/public/icons/128.png'));
    for (const zipName of ['dist.zip', 'dist-firefox.zip']) {
      const extracted = readZipEntry(
        readFileSync(resolve(repoRoot, 'packages/extension', zipName)),
        'icons/128.png',
      );
      expect(Buffer.compare(extracted, png)).toBe(0);
    }
  });
});

function readZipEntry(buf: Buffer, name: string): Buffer {
  let eocd = -1;
  const min = Math.max(0, buf.length - 22 - 65535);
  for (let i = buf.length - 22; i >= min; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('ZIP end-of-central-directory not found');
  const count = buf.readUInt16LE(eocd + 8);
  let p = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const entryName = buf.subarray(p + 46, p + 46 + nameLen).toString('utf8');
    if (entryName === name) {
      const localNameLen = buf.readUInt16LE(localOffset + 26);
      const localExtraLen = buf.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + 30 + localNameLen + localExtraLen;
      const compressed = buf.subarray(dataStart, dataStart + compSize);
      if (method === 0) return Buffer.from(compressed);
      if (method === 8) return Buffer.from(inflateRawSync(compressed));
      throw new Error(`Unsupported ZIP method ${method}`);
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error(`ZIP entry not found: ${name}`);
}
