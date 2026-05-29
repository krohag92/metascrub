import { describe, it, expect } from 'vitest';
import { parse, scrub, detectFormat } from '../src/index.js';
import { makePng } from './helpers/build-png.js';

describe('PNG format', () => {
  it('detects PNG by magic number', async () => {
    const data = makePng();
    expect(await detectFormat({ kind: 'bytes', data })).toBe('png');
  });

  it('parses tEXt chunks (Author, Software)', async () => {
    const data = makePng({
      texts: [
        { keyword: 'Author', value: 'Anton' },
        { keyword: 'Software', value: 'Photoshop' },
      ],
    });
    const result = await parse({ kind: 'bytes', data });
    const text = result.groups['PNG.text'] ?? [];
    const map = new Map(text.map((f) => [f.key, f.value]));
    expect(map.get('Author')).toBe('Anton');
    expect(map.get('Software')).toBe('Photoshop');
    expect(result.highlights.author).toBe('Anton');
    expect(result.highlights.software).toBe('Photoshop');
  });

  it('parses tIME chunk', async () => {
    const data = makePng({
      modificationTime: new Date(Date.UTC(2024, 7, 12, 14, 23, 11)),
    });
    const result = await parse({ kind: 'bytes', data });
    const time = result.groups['PNG.tIME'] ?? [];
    expect(time[0]?.key).toBe('LastModified');
    expect(time[0]?.value).toBe('2024-08-12T14:23:11Z');
  });

  it('round-trip: scrub with preset=all strips all tEXt and tIME', async () => {
    const data = makePng({
      texts: [
        { keyword: 'Author', value: 'Anton' },
        { keyword: 'Comment', value: 'secret' },
      ],
      modificationTime: new Date(),
    });
    const scrubbed = await scrub({ kind: 'bytes', data }, { preset: 'all' });
    const reparsed = await parse({ kind: 'bytes', data: scrubbed });
    expect(reparsed.groups['PNG.text']).toBeUndefined();
    expect(reparsed.groups['PNG.tIME']).toBeUndefined();
  });

  it('PNG signature preserved after scrub', async () => {
    const data = makePng({ texts: [{ keyword: 'Author', value: 'X' }] });
    const scrubbed = await scrub({ kind: 'bytes', data }, { preset: 'all' });
    const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    for (let i = 0; i < sig.length; i += 1) {
      expect(scrubbed[i]).toBe(sig[i]);
    }
  });
});
