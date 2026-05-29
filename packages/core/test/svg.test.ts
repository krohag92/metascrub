import { describe, it, expect } from 'vitest';
import { parse, scrub, detectFormat } from '../src/index.js';

const enc = new TextEncoder();

const SAMPLE_SVG = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!-- Created by Anton -->
<svg xmlns="http://www.w3.org/2000/svg" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.0.dtd" width="100" height="100" sodipodi:docname="diagram.svg" inkscape:version="1.3.2">
  <metadata>
    <rdf:RDF>
      <rdf:Description>
        <dc:title>My Diagram</dc:title>
        <dc:creator>Anton</dc:creator>
        <dc:rights>Copyright Anton 2026</dc:rights>
      </rdf:Description>
    </rdf:RDF>
  </metadata>
  <title>Visible Title</title>
  <rect width="100" height="100" fill="red"/>
</svg>`;

describe('SVG format', () => {
  it('detects SVG by content', async () => {
    const data = enc.encode(SAMPLE_SVG);
    expect(await detectFormat({ kind: 'bytes', data })).toBe('svg');
  });

  it('parses dc:title, dc:creator, inkscape attrs, comments', async () => {
    const data = enc.encode(SAMPLE_SVG);
    const result = await parse({ kind: 'bytes', data, filename: 'd.svg' });
    const meta = new Map((result.groups['SVG.metadata'] ?? []).map((f) => [f.key, f.value]));
    expect(meta.get('title')).toBe('My Diagram');
    expect(meta.get('creator')).toBe('Anton');
    expect(meta.get('docname')).toBe('diagram.svg');
    expect(meta.get('editor')).toBe('1.3.2');
    expect(result.highlights.author).toBe('Anton');
    expect((result.groups['SVG.comments'] ?? []).length).toBeGreaterThan(0);
  });

  it('round-trip: scrub with preset=all removes metadata, comments, inkscape attrs', async () => {
    const data = enc.encode(SAMPLE_SVG);
    const scrubbed = await scrub({ kind: 'bytes', data }, { preset: 'all' });
    const text = new TextDecoder('utf-8').decode(scrubbed);
    expect(text).not.toContain('<metadata');
    expect(text).not.toContain('<!--');
    expect(text).not.toContain('inkscape:version');
    expect(text).not.toContain('sodipodi:docname');
    // Geometry preserved
    expect(text).toContain('<rect');
  });
});
