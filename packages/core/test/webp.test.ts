import { describe, it, expect } from 'vitest';
import { parse, scrub, detectFormat } from '../src/index.js';
import { makeWebp } from './helpers/build-webp.js';

describe('WebP format', () => {
  it('detects WebP by magic number', async () => {
    const data = makeWebp({ artist: 'Anton' });
    expect(await detectFormat({ kind: 'bytes', data })).toBe('webp');
  });

  it('parses EXIF chunk with Artist tag', async () => {
    const data = makeWebp({ artist: 'Anton', software: 'TestApp' });
    const result = await parse({ kind: 'bytes', data, filename: 'a.webp' });
    expect(result.format).toBe('webp');
    const exif = new Map((result.groups.EXIF ?? []).map((f) => [f.key, f.value]));
    expect(exif.get('Artist')).toBe('Anton');
    expect(exif.get('Software')).toBe('TestApp');
    expect(result.highlights.author).toBe('Anton');
    expect(result.highlights.software).toBe('TestApp');
  });

  it('parses GPS and produces highlight + warning', async () => {
    const data = makeWebp({ gps: { lat: 48.85, lon: 2.35 } });
    const result = await parse({ kind: 'bytes', data });
    expect(result.highlights.gps).toBeDefined();
    expect(result.highlights.gps?.lat).toBeCloseTo(48.85, 1);
    expect(result.warnings.some((w) => w.toLowerCase().includes('gps'))).toBe(true);
  });

  it('parses XMP chunk creator', async () => {
    const xmp =
      '<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>' +
      '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">' +
      '<rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:creator>Anton</dc:creator></rdf:Description>' +
      '</rdf:RDF></x:xmpmeta><?xpacket end="w"?>';
    const data = makeWebp({ xmp });
    const result = await parse({ kind: 'bytes', data });
    const xmpGroup = new Map((result.groups.XMP ?? []).map((f) => [f.key, f.value]));
    expect(xmpGroup.get('creator')).toBe('Anton');
  });

  it('round-trip: scrub with preset=all removes EXIF/XMP and clears VP8X flags', async () => {
    const data = makeWebp({
      artist: 'Anton',
      gps: { lat: 1.0, lon: 2.0 },
      xmp: '<x:xmpmeta xmlns:x="adobe:ns:meta/"><dc:creator>Anton</dc:creator></x:xmpmeta>',
    });
    const scrubbed = await scrub({ kind: 'bytes', data }, { preset: 'all' });

    // Still a WebP container.
    expect(await detectFormat({ kind: 'bytes', data: scrubbed })).toBe('webp');

    // No EXIF/XMP chunks left.
    const text = new TextDecoder('latin1').decode(scrubbed);
    expect(text.includes('EXIF')).toBe(false);
    // The 4-byte "XMP " FourCC has a trailing space; check for both.
    expect(text.indexOf('XMP ')).toBe(-1);

    // VP8X flags byte should not include EXIF (0x08) or XMP (0x04) bits.
    // VP8X chunk starts at offset 12; payload at 12+8=20; flags at byte 20.
    const flags = scrubbed[20] ?? 0;
    expect(flags & 0x08).toBe(0);
    expect(flags & 0x04).toBe(0);

    const reparsed = await parse({ kind: 'bytes', data: scrubbed });
    expect(reparsed.groups.EXIF).toBeUndefined();
    expect(reparsed.groups.XMP).toBeUndefined();
    expect(reparsed.highlights.author).toBeUndefined();
    expect(reparsed.highlights.gps).toBeUndefined();
  });
});
