import { describe, it, expect } from 'vitest';
import { parse, scrub, detectFormat } from '../src/index.js';
import { makeEbml } from './helpers/build-ebml.js';

describe('WebM format', () => {
  it('detects WebM by DocType=webm', async () => {
    const data = makeEbml({ docType: 'webm', title: 'webm clip' });
    expect(await detectFormat({ kind: 'bytes', data })).toBe('webm');
  });

  it('parses Info fields and Tag SimpleTag children', async () => {
    const data = makeEbml({
      docType: 'webm',
      title: 'WebM Title',
      muxingApp: 'ffmpeg-libwebm',
      writingApp: 'ffmpeg',
      simpleTags: [['ENCODER', 'libvpx-vp9']],
    });
    const result = await parse({ kind: 'bytes', data, filename: 'v.webm' });
    const info = new Map((result.groups['MKV.info'] ?? []).map((f) => [f.key, f.value]));
    expect(info.get('Title')).toBe('WebM Title');
    expect(info.get('MuxingApp')).toBe('ffmpeg-libwebm');
    const tags = new Map((result.groups['MKV.tags'] ?? []).map((f) => [f.key, f.value]));
    expect(tags.get('ENCODER')).toBe('libvpx-vp9');
    const docType = new Map((result.groups['EBML.header'] ?? []).map((f) => [f.key, f.value]));
    expect(docType.get('DocType')).toBe('webm');
  });

  it('round-trip: scrub blanks Info fields and drops Tags', async () => {
    const data = makeEbml({
      docType: 'webm',
      title: 'WebM',
      muxingApp: 'mux',
      writingApp: 'wrt',
      simpleTags: [['ARTIST', 'Anton']],
    });
    const scrubbed = await scrub({ kind: 'bytes', data }, { preset: 'all' });
    const reparsed = await parse({ kind: 'bytes', data: scrubbed, filename: 'v.webm' });
    const info = new Map((reparsed.groups['MKV.info'] ?? []).map((f) => [f.key, f.value]));
    expect(info.get('Title')).toBe('');
    expect(info.get('MuxingApp')).toBe('');
    expect(info.get('WritingApp')).toBe('');
    expect(reparsed.groups['MKV.tags']).toBeUndefined();
    // DocType preserved.
    expect(await detectFormat({ kind: 'bytes', data: scrubbed })).toBe('webm');
  });
});
