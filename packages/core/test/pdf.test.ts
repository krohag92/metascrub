import { describe, it, expect } from 'vitest';
import { parse, scrub, detectFormat } from '../src/index.js';
import { makePdf } from './helpers/build-pdf.js';

describe('PDF format', () => {
  it('detects PDF by magic number', async () => {
    const data = await makePdf();
    expect(await detectFormat({ kind: 'bytes', data })).toBe('pdf');
  });

  it('parses Info dictionary (Author, Title, Producer)', async () => {
    const data = await makePdf({
      title: 'Confidential Report',
      author: 'Anton',
      producer: 'Adobe Acrobat 24',
      creator: 'Microsoft Word',
    });
    const result = await parse({ kind: 'bytes', data });
    const info = result.groups['PDF.Info'] ?? [];
    const map = new Map(info.map((f) => [f.key, f.value]));
    expect(map.get('Title')).toBe('Confidential Report');
    expect(map.get('Author')).toBe('Anton');
    expect(map.get('Producer')).toBe('Adobe Acrobat 24');
    expect(map.get('Creator')).toBe('Microsoft Word');
    expect(result.highlights.author).toBe('Anton');
    expect(result.highlights.software).toBeDefined();
  });

  it('round-trip: scrub with preset=all wipes Author/Title/Producer', async () => {
    const data = await makePdf({
      title: 'Secret',
      author: 'Anton',
      producer: 'Adobe',
      keywords: ['leak', 'confidential'],
    });
    const scrubbed = await scrub({ kind: 'bytes', data }, { preset: 'all' });
    const reparsed = await parse({ kind: 'bytes', data: scrubbed });
    const info = reparsed.groups['PDF.Info'] ?? [];
    const map = new Map(info.map((f) => [f.key, f.value]));
    expect(map.get('Title') ?? '').toBe('');
    expect(map.get('Author') ?? '').toBe('');
    expect(map.get('Producer') ?? '').toBe('');
    expect(reparsed.highlights.author).toBeUndefined();
  });

  it('preserves Author with preset=gps-only (no-op on PDFs)', async () => {
    const data = await makePdf({ author: 'Anton' });
    const scrubbed = await scrub({ kind: 'bytes', data }, { preset: 'gps-only' });
    const reparsed = await parse({ kind: 'bytes', data: scrubbed });
    expect(reparsed.highlights.author).toBe('Anton');
  });
});
