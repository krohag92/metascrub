import { describe, it, expect } from 'vitest';
import { parse, scrub, detectFormat } from '../src/index.js';
import { makeDocx } from './helpers/build-docx.js';

describe('DOCX format', () => {
  it('detects DOCX by magic + extension', async () => {
    const data = await makeDocx();
    expect(await detectFormat({ kind: 'bytes', data, filename: 'test.docx' })).toBe('docx');
  });

  it('parses core and app metadata', async () => {
    const data = await makeDocx({
      creator: 'Anton',
      lastModifiedBy: 'EditorBob',
      title: 'Confidential Memo',
      keywords: 'leak,secret',
      application: 'Microsoft Word',
      company: 'Acme Co',
      manager: 'Manager Jane',
      revision: 5,
    });
    const result = await parse({
      kind: 'bytes',
      data,
      filename: 'memo.docx',
    });
    const core = new Map((result.groups['DOCX.core'] ?? []).map((f) => [f.key, f.value]));
    const app = new Map((result.groups['DOCX.app'] ?? []).map((f) => [f.key, f.value]));
    expect(core.get('creator')).toBe('Anton');
    expect(core.get('lastModifiedBy')).toBe('EditorBob');
    expect(core.get('title')).toBe('Confidential Memo');
    expect(app.get('Application')).toBe('Microsoft Word');
    expect(app.get('Company')).toBe('Acme Co');
    expect(app.get('Manager')).toBe('Manager Jane');
    expect(result.highlights.author).toBe('Anton');
    expect(result.highlights.lastModifiedBy).toBe('EditorBob');
    expect(result.warnings.some((w) => w.toLowerCase().includes('edited by another user'))).toBe(
      true,
    );
  });

  it('round-trip: scrub with preset=all empties creator/lastModifiedBy', async () => {
    const data = await makeDocx({
      creator: 'Anton',
      lastModifiedBy: 'EditorBob',
      title: 'Secret',
      company: 'Acme Co',
    });
    const scrubbed = await scrub({ kind: 'bytes', data }, { preset: 'all' });
    const reparsed = await parse({
      kind: 'bytes',
      data: scrubbed,
      filename: 'memo.docx',
    });
    const core = new Map((reparsed.groups['DOCX.core'] ?? []).map((f) => [f.key, f.value]));
    expect(core.get('creator') ?? '').toBe('');
    expect(core.get('lastModifiedBy') ?? '').toBe('');
    expect(reparsed.highlights.author).toBeUndefined();
    expect(reparsed.highlights.lastModifiedBy).toBeUndefined();
  });

  it('regenerates core.xml (does not delete it) on scrub', async () => {
    const data = await makeDocx({ creator: 'Anton' });
    const scrubbed = await scrub({ kind: 'bytes', data }, { preset: 'all' });
    // Quickly check the zip still contains docProps/core.xml.
    const JSZip = (await import('jszip')).default;
    const z = await JSZip.loadAsync(scrubbed);
    expect(z.file('docProps/core.xml')).not.toBeNull();
    expect(z.file('docProps/app.xml')).not.toBeNull();
  });
});
