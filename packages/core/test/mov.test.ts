import { describe, it, expect } from 'vitest';
import { parse, scrub, detectFormat } from '../src/index.js';
import { makeMov } from './helpers/build-mp4.js';

describe('MOV format', () => {
  it('detects MOV by "qt  " ftyp brand', async () => {
    const data = makeMov({ title: 'QT Clip' });
    expect(await detectFormat({ kind: 'bytes', data })).toBe('mov');
  });

  it('detects MOV with no ftyp via top-level moov box', async () => {
    const data = makeMov({ title: 'QT Clip', noFtyp: true });
    expect(await detectFormat({ kind: 'bytes', data, filename: 'clip.mov' })).toBe('mov');
  });

  it('parses ilst tags', async () => {
    const data = makeMov({
      title: 'QuickTime Clip',
      artist: 'Anton',
      comment: 'shot on iPhone',
    });
    const result = await parse({ kind: 'bytes', data, filename: 'clip.mov' });
    const tags = new Map((result.groups['MP4.tags'] ?? []).map((f) => [f.key, f.value]));
    expect(tags.get('Title')).toBe('QuickTime Clip');
    expect(tags.get('Artist')).toBe('Anton');
    expect(tags.get('Comment')).toBe('shot on iPhone');
  });

  it('round-trip: scrub preset=all removes udta', async () => {
    const data = makeMov({ title: 'QT', artist: 'Anton' });
    const scrubbed = await scrub({ kind: 'bytes', data, filename: 'c.mov' }, { preset: 'all' });
    const reparsed = await parse({ kind: 'bytes', data: scrubbed, filename: 'c.mov' });
    expect(reparsed.groups['MP4.tags']).toBeUndefined();
    expect(scrubbed.length).toBe(data.length);
  });
});
