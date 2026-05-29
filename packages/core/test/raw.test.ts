import { describe, it, expect } from 'vitest';
import { parse, scrub, detectFormat } from '../src/index.js';
import { makeTiff } from './helpers/build-tiff.js';

/** Patches a synthetic TIFF to look like a CR2 file by injecting "CR\x02" at offset 8. */
function tiffToCr2(tiff: Uint8Array): Uint8Array {
  // The header is II*\0 + uint32 IFD0 offset. CR2 replaces the version byte at
  // offset 10 with 0x02 and inserts 'C','R' at bytes 8,9. We just overwrite.
  const out = new Uint8Array(tiff.length);
  out.set(tiff, 0);
  out[8] = 0x43; // 'C'
  out[9] = 0x52; // 'R'
  out[10] = 0x02;
  // byte 11 left as-is (it was the high byte of the IFD0 offset which is small)
  return out;
}

describe('RAW formats', () => {
  it('detects CR2 by TIFF + "CR\\x02" marker', async () => {
    const tiff = makeTiff({ artist: 'Anton' });
    const cr2 = tiffToCr2(tiff);
    expect(await detectFormat({ kind: 'bytes', data: cr2 })).toBe('raw-cr2');
  });

  it('detects NEF/ARW/DNG by extension over generic TIFF', async () => {
    const tiff = makeTiff({ artist: 'Anton' });
    expect(await detectFormat({ kind: 'bytes', data: tiff, filename: 'a.nef' })).toBe('raw-nef');
    expect(await detectFormat({ kind: 'bytes', data: tiff, filename: 'a.arw' })).toBe('raw-arw');
    expect(await detectFormat({ kind: 'bytes', data: tiff, filename: 'a.dng' })).toBe('raw-dng');
  });

  it('parses RAW (via TIFF IFD0) — Artist tag visible', async () => {
    const tiff = makeTiff({ artist: 'Anton' });
    const result = await parse({ kind: 'bytes', data: tiff, filename: 'a.nef' });
    expect(result.format).toBe('raw-nef');
    const exif = new Map((result.groups.EXIF ?? []).map((f) => [f.key, f.value]));
    expect(exif.get('Artist')).toBe('Anton');
  });

  it('scrub throws SCRUB_ERROR for all RAW dialects', async () => {
    const tiff = makeTiff({ artist: 'Anton' });
    await expect(
      scrub({ kind: 'bytes', data: tiff, filename: 'a.nef' }, { preset: 'all' }),
    ).rejects.toThrow(/read-only|SCRUB/i);
    await expect(
      scrub({ kind: 'bytes', data: tiff, filename: 'a.arw' }, { preset: 'all' }),
    ).rejects.toThrow(/read-only|SCRUB/i);
    await expect(
      scrub({ kind: 'bytes', data: tiff, filename: 'a.dng' }, { preset: 'all' }),
    ).rejects.toThrow(/read-only|SCRUB/i);
    const cr2 = tiffToCr2(tiff);
    await expect(scrub({ kind: 'bytes', data: cr2 }, { preset: 'all' })).rejects.toThrow(
      /read-only|SCRUB/i,
    );
  });
});
