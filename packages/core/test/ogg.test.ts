import { describe, it, expect } from 'vitest';
import { parse, scrub, detectFormat } from '../src/index.js';
import { makeOgg } from './helpers/build-ogg.js';

describe('OGG format', () => {
  it('detects OGG by OggS magic', async () => {
    const data = makeOgg();
    expect(await detectFormat({ kind: 'bytes', data })).toBe('ogg');
  });

  it('parses vorbis comment list', async () => {
    const data = makeOgg({
      vendor: 'libvorbis',
      comments: [
        { key: 'ARTIST', value: 'Anton' },
        { key: 'TITLE', value: 'Test Track' },
        { key: 'ALBUM', value: 'Synthetic' },
      ],
    });
    const result = await parse({ kind: 'bytes', data, filename: 't.ogg' });
    expect(result.format).toBe('ogg');
    const vorbis = new Map(
      (result.groups['OGG.vorbis_comment'] ?? []).map((f) => [f.key, f.value]),
    );
    expect(vorbis.get('ARTIST')).toBe('Anton');
    expect(vorbis.get('TITLE')).toBe('Test Track');
    expect(vorbis.get('vendor')).toBe('libvorbis');
  });

  it('round-trip: scrub preset=all empties the comment list, OGG still valid', async () => {
    const data = makeOgg({
      vendor: 'libvorbis',
      comments: [
        { key: 'ARTIST', value: 'Anton' },
        { key: 'TITLE', value: 'Test Track' },
      ],
    });
    const scrubbed = await scrub({ kind: 'bytes', data, filename: 't.ogg' }, { preset: 'all' });
    // Still starts with OggS.
    expect(scrubbed[0]).toBe(0x4f);
    expect(scrubbed[1]).toBe(0x67);
    expect(scrubbed[2]).toBe(0x67);
    expect(scrubbed[3]).toBe(0x53);
    const reparsed = await parse({ kind: 'bytes', data: scrubbed, filename: 't.ogg' });
    const vorbis = new Map(
      (reparsed.groups['OGG.vorbis_comment'] ?? []).map((f) => [f.key, f.value]),
    );
    // Only the vendor field should remain.
    expect(vorbis.get('ARTIST')).toBeUndefined();
    expect(vorbis.get('TITLE')).toBeUndefined();
    expect(vorbis.get('vendor')).toBe('libvorbis');
  });
});
