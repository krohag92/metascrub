import { describe, it, expect } from 'vitest';
import { parse, scrub, detectFormat } from '../src/index.js';
import { makeWav } from './helpers/build-wav.js';

describe('WAV format', () => {
  it('detects WAV by RIFF/WAVE', async () => {
    const data = makeWav();
    expect(await detectFormat({ kind: 'bytes', data })).toBe('wav');
  });

  it('parses LIST/INFO chunk fields', async () => {
    const data = makeWav({
      title: 'Test Title',
      artist: 'Anton',
      software: 'MetaScrub Tests',
      comment: 'hello',
    });
    const result = await parse({ kind: 'bytes', data, filename: 't.wav' });
    expect(result.format).toBe('wav');
    const info = new Map((result.groups['WAV.INFO'] ?? []).map((f) => [f.key, f.value]));
    expect(info.get('INAM')).toBe('Test Title');
    expect(info.get('IART')).toBe('Anton');
    expect(info.get('ISFT')).toBe('MetaScrub Tests');
    expect(info.get('ICMT')).toBe('hello');
    // Sensitive flags
    const iart = (result.groups['WAV.INFO'] ?? []).find((f) => f.key === 'IART');
    expect(iart?.sensitive).toBe(true);
  });

  it('round-trip: scrub preset=all removes the LIST/INFO chunk', async () => {
    const data = makeWav({
      title: 'Test Title',
      artist: 'Anton',
    });
    const scrubbed = await scrub({ kind: 'bytes', data, filename: 't.wav' }, { preset: 'all' });
    // Still RIFF/WAVE
    expect(String.fromCharCode(scrubbed[0]!, scrubbed[1]!, scrubbed[2]!, scrubbed[3]!)).toBe(
      'RIFF',
    );
    expect(String.fromCharCode(scrubbed[8]!, scrubbed[9]!, scrubbed[10]!, scrubbed[11]!)).toBe(
      'WAVE',
    );
    // Re-parse: no WAV.INFO group.
    const reparsed = await parse({ kind: 'bytes', data: scrubbed, filename: 't.wav' });
    expect(reparsed.groups['WAV.INFO']).toBeUndefined();
    // Smaller than original.
    expect(scrubbed.length).toBeLessThan(data.length);
  });
});
