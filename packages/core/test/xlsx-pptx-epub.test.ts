import { describe, it, expect } from 'vitest';
import { parse, scrub, detectFormat } from '../src/index.js';
import { makeXlsx, makePptx, makeEpub } from './helpers/build-ooxml.js';

describe('XLSX format', () => {
  it('detects + parses + scrubs', async () => {
    const data = await makeXlsx({
      creator: 'Anton',
      company: 'Acme Co',
      title: 'Q3 Numbers',
    });
    const detected = await detectFormat({
      kind: 'bytes',
      data,
      filename: 'q3.xlsx',
    });
    expect(detected).toBe('xlsx');

    const result = await parse({ kind: 'bytes', data, filename: 'q3.xlsx' });
    const core = new Map((result.groups['XLSX.core'] ?? []).map((f) => [f.key, f.value]));
    expect(core.get('creator')).toBe('Anton');
    expect(core.get('title')).toBe('Q3 Numbers');

    const scrubbed = await scrub({ kind: 'bytes', data }, { preset: 'all' });
    const reparsed = await parse({
      kind: 'bytes',
      data: scrubbed,
      filename: 'q3.xlsx',
    });
    const after = new Map((reparsed.groups['XLSX.core'] ?? []).map((f) => [f.key, f.value]));
    expect(after.get('creator') ?? '').toBe('');
  });
});

describe('PPTX format', () => {
  it('detects + parses + scrubs', async () => {
    const data = await makePptx({ creator: 'Anton', title: 'Slides' });
    expect(await detectFormat({ kind: 'bytes', data, filename: 'd.pptx' })).toBe('pptx');
    const result = await parse({ kind: 'bytes', data, filename: 'd.pptx' });
    const core = new Map((result.groups['PPTX.core'] ?? []).map((f) => [f.key, f.value]));
    expect(core.get('creator')).toBe('Anton');
    const scrubbed = await scrub({ kind: 'bytes', data }, { preset: 'all' });
    const reparsed = await parse({
      kind: 'bytes',
      data: scrubbed,
      filename: 'd.pptx',
    });
    const after = new Map((reparsed.groups['PPTX.core'] ?? []).map((f) => [f.key, f.value]));
    expect(after.get('creator') ?? '').toBe('');
  });
});

describe('EPUB format', () => {
  it('detects + parses + scrubs', async () => {
    const data = await makeEpub({
      title: 'Sample Book',
      creator: 'Anton',
      publisher: 'Acme Books',
      rights: 'All rights reserved',
      language: 'en',
    });
    expect(await detectFormat({ kind: 'bytes', data, filename: 'book.epub' })).toBe('epub');
    const result = await parse({ kind: 'bytes', data, filename: 'book.epub' });
    const meta = new Map((result.groups['EPUB.meta'] ?? []).map((f) => [f.key, f.value]));
    expect(meta.get('creator')).toBe('Anton');
    expect(meta.get('publisher')).toBe('Acme Books');

    const scrubbed = await scrub({ kind: 'bytes', data }, { preset: 'all' });
    const reparsed = await parse({
      kind: 'bytes',
      data: scrubbed,
      filename: 'book.epub',
    });
    const after = new Map((reparsed.groups['EPUB.meta'] ?? []).map((f) => [f.key, f.value]));
    expect(after.get('creator') ?? '').toBe('');
    expect(after.get('publisher') ?? '').toBe('');
  });
});
