import { describe, it, expect } from 'vitest';
import { parse, scrub, detectFormat } from '../src/index.js';
import { makeMp4 } from './helpers/build-mp4.js';

describe('MP4 format', () => {
  it('detects MP4 by ftyp brand', async () => {
    const data = makeMp4({ title: 'Demo' });
    expect(await detectFormat({ kind: 'bytes', data })).toBe('mp4');
  });

  it('parses ilst tags and ©xyz location', async () => {
    const data = makeMp4({
      title: 'Demo Clip',
      artist: 'Anton',
      year: '2026',
      encodingTool: 'iMovie 10.4',
      location: '+37.7749-122.4194/',
    });
    const result = await parse({ kind: 'bytes', data, filename: 'demo.mp4' });
    const tags = new Map((result.groups['MP4.tags'] ?? []).map((f) => [f.key, f.value]));
    expect(tags.get('Title')).toBe('Demo Clip');
    expect(tags.get('Artist')).toBe('Anton');
    expect(tags.get('Year')).toBe('2026');
    expect(tags.get('EncodingTool')).toBe('iMovie 10.4');
    // GPS derived from ISO 6709 string.
    expect(result.highlights.gps).toBeDefined();
    expect(result.highlights.gps?.lat).toBeCloseTo(37.7749, 4);
    expect(result.highlights.gps?.lon).toBeCloseTo(-122.4194, 4);
    expect(result.warnings.some((w) => w.startsWith('GPS coordinates'))).toBe(true);
  });

  it('round-trip: scrub preset=all removes udta and clears tags', async () => {
    const data = makeMp4({
      title: 'Demo Clip',
      artist: 'Anton',
      location: '+12.34+56.78/',
    });
    const scrubbed = await scrub({ kind: 'bytes', data, filename: 'demo.mp4' }, { preset: 'all' });
    const reparsed = await parse({ kind: 'bytes', data: scrubbed, filename: 'demo.mp4' });
    expect(reparsed.groups['MP4.tags']).toBeUndefined();
    expect(reparsed.groups.GPS).toBeUndefined();
    // Byte length preserved (udta replaced with free of identical size).
    expect(scrubbed.length).toBe(data.length);
  });

  it('handles file with no udta gracefully', async () => {
    const data = makeMp4({}); // no title/artist/etc
    const result = await parse({ kind: 'bytes', data });
    expect(result.groups['MP4.tags']).toBeUndefined();
    const scrubbed = await scrub({ kind: 'bytes', data }, { preset: 'all' });
    // No-op when no udta — bytes identical.
    expect(scrubbed.length).toBe(data.length);
  });
});
