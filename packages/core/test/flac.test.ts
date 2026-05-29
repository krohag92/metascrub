import { describe, it, expect } from 'vitest';
import { parse, scrub, detectFormat } from '../src/index.js';
import { makeFlac } from './helpers/build-flac.js';

describe('FLAC format', () => {
  it('detects FLAC by fLaC magic', async () => {
    const data = makeFlac();
    expect(await detectFormat({ kind: 'bytes', data })).toBe('flac');
  });

  it('parses vorbis comments (ARTIST/TITLE)', async () => {
    const data = makeFlac({
      vendor: 'reference libFLAC',
      comments: [
        { key: 'ARTIST', value: 'Anton' },
        { key: 'TITLE', value: 'Test' },
        { key: 'ALBUM', value: 'Synthetic' },
      ],
    });
    const result = await parse({ kind: 'bytes', data, filename: 'a.flac' });
    expect(result.format).toBe('flac');
    const vorbis = new Map((result.groups['FLAC.vorbis'] ?? []).map((f) => [f.key, f.value]));
    expect(vorbis.get('ARTIST')).toBe('Anton');
    expect(vorbis.get('TITLE')).toBe('Test');
    expect(vorbis.get('vendor')).toBe('reference libFLAC');
    // STREAMINFO + VORBIS_COMMENT blocks should appear in FLAC.blocks
    const blocks = (result.groups['FLAC.blocks'] ?? []).map((f) => f.key);
    expect(blocks).toContain('STREAMINFO');
    expect(blocks).toContain('VORBIS_COMMENT');
  });

  it('round-trip: scrub preset=all removes VORBIS_COMMENT, keeps STREAMINFO', async () => {
    const data = makeFlac({
      vendor: 'libFLAC',
      comments: [
        { key: 'ARTIST', value: 'Anton' },
        { key: 'TITLE', value: 'Test' },
      ],
      padding: 64,
    });
    const scrubbed = await scrub({ kind: 'bytes', data, filename: 'a.flac' }, { preset: 'all' });
    // Still starts with "fLaC".
    expect(scrubbed[0]).toBe(0x66);
    expect(scrubbed[1]).toBe(0x4c);
    expect(scrubbed[2]).toBe(0x61);
    expect(scrubbed[3]).toBe(0x43);
    const reparsed = await parse({ kind: 'bytes', data: scrubbed, filename: 'a.flac' });
    expect(reparsed.groups['FLAC.vorbis']).toBeUndefined();
    const blocks = (reparsed.groups['FLAC.blocks'] ?? []).map((f) => f.key);
    expect(blocks).toContain('STREAMINFO');
    expect(blocks).not.toContain('VORBIS_COMMENT');
    expect(blocks).not.toContain('PADDING');
  });
});
