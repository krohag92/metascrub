import { describe, it, expect } from 'vitest';
import { parse, scrub, detectFormat } from '../src/index.js';
import { makeIsobmff } from './helpers/build-isobmff.js';

describe('HEIC format', () => {
  it('detects HEIC by major ftyp brand', async () => {
    const data = makeIsobmff({ major: 'heic', compat: ['mif1', 'heic'] });
    expect(await detectFormat({ kind: 'bytes', data, filename: 'a.heic' })).toBe('heic');
  });

  it('detects HEIC via compatible-brands list when major brand is mif1', async () => {
    const data = makeIsobmff({ major: 'mif1', compat: ['mif1', 'heic'] });
    expect(await detectFormat({ kind: 'bytes', data })).toBe('heic');
  });

  it('parses a HEIC without metadata gracefully (no exif/xmp items)', async () => {
    const data = makeIsobmff({ major: 'heic', compat: ['mif1', 'heic'] });
    // No exifArtist passed → no EXIF item in the file.
    const result = await parse({ kind: 'bytes', data, filename: 'a.heic' });
    expect(result.format).toBe('heic');
    // No metadata is fine; warnings list should be empty (or only have warnings
    // unrelated to EXIF).
    expect(result.highlights.author).toBeUndefined();
  });

  it('scrub on a HEIC with no metadata returns bytes unchanged', async () => {
    const data = makeIsobmff({ major: 'heic', compat: ['mif1', 'heic'] });
    const scrubbed = await scrub({ kind: 'bytes', data }, { preset: 'all' });
    expect(scrubbed.length).toBe(data.length);
  });

  it('scrub blanks the EXIF item payload when present', async () => {
    const data = makeIsobmff({
      major: 'heic',
      compat: ['mif1', 'heic'],
      exifArtist: 'Anton',
    });
    // Sanity: source bytes contain "Anton" somewhere.
    const sourceText = new TextDecoder('latin1').decode(data);
    expect(sourceText.includes('Anton')).toBe(true);

    const scrubbed = await scrub({ kind: 'bytes', data }, { preset: 'all' });
    // Same length (we don't move boxes).
    expect(scrubbed.length).toBe(data.length);
    // "Anton" must be gone from the EXIF payload region.
    const scrubbedText = new TextDecoder('latin1').decode(scrubbed);
    expect(scrubbedText.includes('Anton')).toBe(false);
  });

  it('throws SCRUB_ERROR for gps-only preset (not supported in v0.1)', async () => {
    const data = makeIsobmff({ major: 'heic', compat: ['mif1', 'heic'], exifArtist: 'Anton' });
    await expect(scrub({ kind: 'bytes', data }, { preset: 'gps-only' })).rejects.toThrow(
      /gps-only|HEIC/,
    );
  });
});
