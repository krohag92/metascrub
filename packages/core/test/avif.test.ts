import { describe, it, expect } from 'vitest';
import { scrub, detectFormat } from '../src/index.js';
import { makeIsobmff } from './helpers/build-isobmff.js';

describe('AVIF format', () => {
  it('detects AVIF by major ftyp brand', async () => {
    const data = makeIsobmff({ major: 'avif', compat: ['mif1', 'avif'] });
    expect(await detectFormat({ kind: 'bytes', data, filename: 'a.avif' })).toBe('avif');
  });

  it('detects AVIF via compatible-brands list when major is mif1', async () => {
    const data = makeIsobmff({ major: 'mif1', compat: ['mif1', 'avif'] });
    expect(await detectFormat({ kind: 'bytes', data })).toBe('avif');
  });

  it('scrub blanks the EXIF item payload', async () => {
    const data = makeIsobmff({
      major: 'avif',
      compat: ['mif1', 'avif'],
      exifArtist: 'Anton',
    });
    const scrubbed = await scrub({ kind: 'bytes', data }, { preset: 'all' });
    expect(scrubbed.length).toBe(data.length);
    const scrubbedText = new TextDecoder('latin1').decode(scrubbed);
    expect(scrubbedText.includes('Anton')).toBe(false);
  });

  it('throws SCRUB_ERROR for gps-only preset (not supported in v0.1)', async () => {
    const data = makeIsobmff({ major: 'avif', compat: ['mif1', 'avif'], exifArtist: 'Anton' });
    await expect(scrub({ kind: 'bytes', data }, { preset: 'gps-only' })).rejects.toThrow(
      /gps-only|AVIF/,
    );
  });
});
