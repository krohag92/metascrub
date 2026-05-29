import { describe, it, expect } from 'vitest';
import { parse, scrub, detectFormat } from '../src/index.js';
import { makeEbml } from './helpers/build-ebml.js';

describe('MKV format', () => {
  it('detects MKV by DocType=matroska', async () => {
    const data = makeEbml({ docType: 'matroska', title: 'Demo' });
    expect(await detectFormat({ kind: 'bytes', data })).toBe('mkv');
  });

  it('parses Info fields and Tag SimpleTag children', async () => {
    const data = makeEbml({
      docType: 'matroska',
      title: 'My Movie',
      muxingApp: 'libmkv-1.0',
      writingApp: 'Anton handbrake',
      simpleTags: [
        ['ARTIST', 'Anton'],
        ['COPYRIGHT', '2026'],
      ],
    });
    const result = await parse({ kind: 'bytes', data, filename: 'm.mkv' });
    const info = new Map((result.groups['MKV.info'] ?? []).map((f) => [f.key, f.value]));
    expect(info.get('Title')).toBe('My Movie');
    expect(info.get('MuxingApp')).toBe('libmkv-1.0');
    expect(info.get('WritingApp')).toBe('Anton handbrake');
    const tags = new Map((result.groups['MKV.tags'] ?? []).map((f) => [f.key, f.value]));
    expect(tags.get('ARTIST')).toBe('Anton');
    expect(tags.get('COPYRIGHT')).toBe('2026');
  });

  it('round-trip: scrub blanks Info fields and drops Tags', async () => {
    const data = makeEbml({
      docType: 'matroska',
      title: 'My Movie',
      muxingApp: 'libmkv',
      writingApp: 'handbrake',
      simpleTags: [['ARTIST', 'Anton']],
    });
    const scrubbed = await scrub({ kind: 'bytes', data }, { preset: 'all' });
    const reparsed = await parse({ kind: 'bytes', data: scrubbed, filename: 'm.mkv' });
    const info = new Map((reparsed.groups['MKV.info'] ?? []).map((f) => [f.key, f.value]));
    expect(info.get('Title')).toBe('');
    expect(info.get('MuxingApp')).toBe('');
    expect(info.get('WritingApp')).toBe('');
    expect(reparsed.groups['MKV.tags']).toBeUndefined();
  });
});
