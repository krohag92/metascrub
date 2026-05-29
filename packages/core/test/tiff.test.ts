import { describe, it, expect } from 'vitest';
import { parse, scrub, detectFormat } from '../src/index.js';
import { makeTiff } from './helpers/build-tiff.js';

describe('TIFF format', () => {
  it('detects TIFF by magic (II*\\0 little-endian)', async () => {
    const data = makeTiff({ artist: 'Anton' });
    expect(await detectFormat({ kind: 'bytes', data, filename: 'a.tif' })).toBe('tiff');
  });

  it('parses Artist and Software EXIF tags', async () => {
    const data = makeTiff({ artist: 'Anton', software: 'TestApp', orientation: 1 });
    const result = await parse({ kind: 'bytes', data, filename: 'a.tif' });
    const exif = new Map((result.groups.EXIF ?? []).map((f) => [f.key, f.value]));
    expect(exif.get('Artist')).toBe('Anton');
    expect(exif.get('Software')).toBe('TestApp');
    expect(result.highlights.author).toBe('Anton');
    expect(result.highlights.software).toBe('TestApp');
  });

  it('round-trip: scrub with preset=all removes Artist/Software, keeps Orientation', async () => {
    const data = makeTiff({
      artist: 'Anton',
      software: 'TestApp',
      orientation: 6,
      width: 4,
      height: 4,
    });
    const scrubbed = await scrub({ kind: 'bytes', data }, { preset: 'all' });
    // Still a TIFF.
    expect(await detectFormat({ kind: 'bytes', data: scrubbed, filename: 'a.tif' })).toBe('tiff');

    const reparsed = await parse({ kind: 'bytes', data: scrubbed, filename: 'a.tif' });
    expect(reparsed.highlights.author).toBeUndefined();
    expect(reparsed.highlights.software).toBeUndefined();

    // Orientation must survive.
    const exif = new Map((reparsed.groups.EXIF ?? []).map((f) => [f.key, f.value]));
    // exifr decodes Orientation as a string label like 'Rotate 270 CW' or as a number,
    // depending on translateValues. We disabled translateValues, so it stays numeric (6).
    expect(exif.get('Orientation')).toBe(6);
  });

  it('throws SCRUB_ERROR for gps-only preset (not supported in v0.1)', async () => {
    const data = makeTiff({ artist: 'Anton' });
    await expect(scrub({ kind: 'bytes', data }, { preset: 'gps-only' })).rejects.toThrow(
      /gps-only|TIFF/,
    );
  });
});
