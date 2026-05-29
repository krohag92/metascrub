import { describe, it, expect } from 'vitest';
import { parse, scrub, detectFormat } from '../src/index.js';
import { makeMp3 } from './helpers/build-mp3.js';

describe('MP3 format', () => {
  it('detects MP3 by ID3v2 magic', async () => {
    const data = makeMp3({ title: 'Hello' });
    const fmt = await detectFormat({ kind: 'bytes', data });
    expect(fmt).toBe('mp3');
  });

  it('detects MP3 by raw MPEG sync', async () => {
    const data = makeMp3({ frames: 1 });
    // Strip ID3v2 — the remaining bytes start with 0xff 0xfb (MPEG sync).
    // We just leave the file untouched in this synthetic case; detection
    // should still work because we already injected ID3v2. To test raw sync
    // we hand-craft a buffer.
    const raw = new Uint8Array(8);
    raw[0] = 0xff;
    raw[1] = 0xfb;
    raw[2] = 0x90;
    raw[3] = 0x64;
    const fmt = await detectFormat({ kind: 'bytes', data: raw, filename: 'a.mp3' });
    expect(fmt).toBe('mp3');
    expect(data.length).toBeGreaterThan(0);
  });

  it('parses ID3v2 TIT2 (title) and TPE1 (artist)', async () => {
    const data = makeMp3({ title: 'Test Title', artist: 'Anton' });
    const result = await parse({ kind: 'bytes', data, filename: 'test.mp3' });
    expect(result.format).toBe('mp3');
    // music-metadata exposes these via common
    const common = new Map((result.groups['Audio.common'] ?? []).map((f) => [f.key, f.value]));
    expect(common.get('title')).toBe('Test Title');
    expect(common.get('artist')).toBe('Anton');
    // And via container we should see id3v2 length
    const container = new Map((result.groups['MP3.container'] ?? []).map((f) => [f.key, f.value]));
    expect(container.has('id3v2')).toBe(true);
  });

  it('flags author/artist warnings via highlights', async () => {
    const data = makeMp3({ title: 'X', artist: 'Anton' });
    const result = await parse({ kind: 'bytes', data });
    // music-metadata maps TPE1 to common.artist. The highlights util doesn't
    // yet know about audio-specific author paths, so the warning surface for
    // audio is via the sensitive flags rather than the .author highlight.
    const native = result.groups['MP3.ID3v2.3'] ?? [];
    const tpe1 = native.find((f) => f.key === 'TPE1');
    expect(tpe1?.sensitive).toBe(true);
  });

  it('round-trip: scrub preset=all drops the ID3v2 prefix', async () => {
    const data = makeMp3({
      title: 'Test',
      artist: 'Anton',
      album: 'Acme',
      id3v1: { title: 'Test', artist: 'Anton' },
    });
    const scrubbed = await scrub({ kind: 'bytes', data, filename: 'test.mp3' }, { preset: 'all' });
    // First two bytes should be the MPEG frame sync.
    expect(scrubbed[0]).toBe(0xff);
    expect((scrubbed[1] ?? 0) & 0xe0).toBe(0xe0);
    // Trailing ID3v1 ("TAG") must be gone.
    const tail = scrubbed.slice(scrubbed.length - 128, scrubbed.length - 125);
    expect(String.fromCharCode(...tail)).not.toBe('TAG');
    // Smaller than original.
    expect(scrubbed.length).toBeLessThan(data.length);
    // Re-parsing the scrubbed bytes should yield no Audio.common artist.
    const reparsed = await parse({ kind: 'bytes', data: scrubbed, filename: 'test.mp3' });
    const common = new Map((reparsed.groups['Audio.common'] ?? []).map((f) => [f.key, f.value]));
    expect(common.get('artist') ?? '').toBe('');
    expect(common.get('title') ?? '').toBe('');
  });
});
