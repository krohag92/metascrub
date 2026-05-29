import { describe, it, expect } from 'vitest';
import { parse, scrub, detectFormat } from '../src/index.js';
import { makeM4a } from './helpers/build-m4a.js';

describe('M4A format', () => {
  it('detects M4A by ftyp brand', async () => {
    const data = makeM4a({ title: 'X' });
    const fmt = await detectFormat({ kind: 'bytes', data, filename: 'a.m4a' });
    expect(fmt).toBe('m4a');
  });

  it('parses iTunes ilst atoms', async () => {
    const data = makeM4a({
      title: 'Test Title',
      artist: 'Anton',
      album: 'Synthetic',
      encoder: 'MetaScrub Tests',
    });
    const result = await parse({ kind: 'bytes', data, filename: 'a.m4a' });
    expect(result.format).toBe('m4a');
    const ilst = new Map((result.groups['M4A.ilst'] ?? []).map((f) => [f.key, f.value]));
    expect(ilst.get('©nam')).toBe('Test Title');
    expect(ilst.get('©ART')).toBe('Anton');
    expect(ilst.get('©alb')).toBe('Synthetic');
    expect(ilst.get('©too')).toBe('MetaScrub Tests');
    // ©ART, ©too marked sensitive
    const art = (result.groups['M4A.ilst'] ?? []).find((f) => f.key === '©ART');
    expect(art?.sensitive).toBe(true);
  });

  it('round-trip: scrub preset=all drops moov.udta', async () => {
    const data = makeM4a({
      title: 'Test',
      artist: 'Anton',
    });
    const scrubbed = await scrub({ kind: 'bytes', data, filename: 'a.m4a' }, { preset: 'all' });
    // Still starts with the same ftyp box.
    expect(scrubbed[4]).toBe(0x66); // f
    expect(scrubbed[5]).toBe(0x74); // t
    expect(scrubbed[6]).toBe(0x79); // y
    expect(scrubbed[7]).toBe(0x70); // p
    // Re-parse: no M4A.ilst group.
    const reparsed = await parse({ kind: 'bytes', data: scrubbed, filename: 'a.m4a' });
    expect(reparsed.groups['M4A.ilst']).toBeUndefined();
    // Smaller than original.
    expect(scrubbed.length).toBeLessThan(data.length);
  });
});
