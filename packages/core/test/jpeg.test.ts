import { describe, it, expect } from 'vitest';
import { parse, scrub, detectFormat } from '../src/index.js';
import { makeJpeg } from './helpers/build-jpeg.js';

describe('JPEG format', () => {
  it('detects JPEG by magic number', async () => {
    const data = makeJpeg({ orientation: 1 });
    const format = await detectFormat({ kind: 'bytes', data });
    expect(format).toBe('jpeg');
  });

  it('parses EXIF Make/Model/Orientation', async () => {
    const data = makeJpeg({
      make: 'Canon',
      model: 'EOS R5',
      orientation: 6,
    });
    const result = await parse({ kind: 'bytes', data, filename: 'test.jpg' });
    expect(result.format).toBe('jpeg');
    const exif = result.groups.EXIF ?? [];
    const keys = new Map(exif.map((f) => [f.key, f.value]));
    expect(keys.get('Make')).toBe('Canon');
    expect(keys.get('Model')).toBe('EOS R5');
    expect(result.highlights.device?.make).toBe('Canon');
    expect(result.highlights.device?.model).toBe('EOS R5');
  });

  it('parses GPS and produces gps highlight + warning', async () => {
    const data = makeJpeg({
      make: 'Canon',
      gps: { lat: 40.7128, lon: -74.006 },
    });
    const result = await parse({ kind: 'bytes', data });
    expect(result.highlights.gps).toBeDefined();
    expect(result.highlights.gps?.lat).toBeCloseTo(40.7128, 2);
    expect(result.highlights.gps?.lon).toBeCloseTo(-74.006, 2);
    expect(result.warnings.some((w) => w.toLowerCase().includes('gps'))).toBe(true);
  });

  it('parses serial number and flags it as sensitive', async () => {
    const data = makeJpeg({
      make: 'Canon',
      serialNumber: '123456789',
    });
    const result = await parse({ kind: 'bytes', data });
    expect(result.warnings.some((w) => w.toLowerCase().includes('serial'))).toBe(true);
  });

  it('round-trip: scrub with preset=all removes EXIF identifiers', async () => {
    const data = makeJpeg({
      make: 'Canon',
      model: 'EOS R5',
      serialNumber: '123456789',
      gps: { lat: 40.7128, lon: -74.006 },
      orientation: 6,
      artist: 'Anton',
    });
    const scrubbed = await scrub({ kind: 'bytes', data }, { preset: 'all' });
    const reparsed = await parse({ kind: 'bytes', data: scrubbed });

    // Make/Model/GPS/Serial/Artist must be gone.
    expect(reparsed.highlights.gps).toBeUndefined();
    expect(reparsed.highlights.device?.serial).toBeUndefined();
    expect(reparsed.highlights.author).toBeUndefined();

    // Orientation preserved.
    const exif = reparsed.groups.EXIF ?? [];
    const ori = exif.find((f) => f.key === 'Orientation');
    expect(ori?.value).toBe(6);
  });

  it('scrubbed file still starts with SOI and ends with EOI', async () => {
    const data = makeJpeg({ make: 'Canon', gps: { lat: 1, lon: 2 } });
    const scrubbed = await scrub({ kind: 'bytes', data }, { preset: 'all' });
    expect(scrubbed[0]).toBe(0xff);
    expect(scrubbed[1]).toBe(0xd8);
    expect(scrubbed[scrubbed.length - 2]).toBe(0xff);
    expect(scrubbed[scrubbed.length - 1]).toBe(0xd9);
  });

  it('preserves XMP when scrubbing with gps-only', async () => {
    const xmpPacket =
      '<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>' +
      '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">' +
      '<rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:creator><rdf:Seq><rdf:li>Anton</rdf:li></rdf:Seq></dc:creator></rdf:Description>' +
      '</rdf:RDF></x:xmpmeta><?xpacket end="w"?>';
    const data = makeJpeg({
      gps: { lat: 1, lon: 2 },
      xmpPacket,
    });
    const scrubbed = await scrub({ kind: 'bytes', data }, { preset: 'gps-only' });
    // XMP segment header bytes should still appear.
    const xmpHeader = Uint8Array.from([
      0x68, 0x74, 0x74, 0x70, 0x3a, 0x2f, 0x2f, 0x6e, 0x73, 0x2e, 0x61, 0x64, 0x6f, 0x62, 0x65,
      0x2e, 0x63, 0x6f, 0x6d,
    ]);
    let found = false;
    for (let i = 0; i + xmpHeader.length <= scrubbed.length; i += 1) {
      let match = true;
      for (let j = 0; j < xmpHeader.length; j += 1) {
        if (scrubbed[i + j] !== xmpHeader[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });
});
