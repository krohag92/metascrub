/**
 * @vitest-environment jsdom
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { bindDrag, renderOverlay } from '../src/overlay';

const malicious = '<img src=x onerror=alert(1)>';

describe('renderOverlay', () => {
  it('does not turn EXIF, alt text, or javascript URLs into HTML', () => {
    const root = renderOverlay(document, {
      imageUrl: 'javascript:alert(1)',
      alt: malicious,
      title: '<b>title</b>',
      displayedWidth: 10,
      displayedHeight: 12,
      facts: {
        byteLength: 100,
        mimeType: 'image/jpeg',
        naturalWidth: 8,
        naturalHeight: 8,
        exif: [{ label: 'Software', value: malicious }],
      },
      errorMessage: null,
      utmSource: 'chrome_extension',
    });
    document.body.append(root);

    expect(root.querySelector('img')).toBeNull();
    expect(root.querySelector('b')).toBeNull();
    expect(root.textContent).toContain(malicious);
    expect(root.textContent).toContain('<b>title</b>');
    const links = [...root.querySelectorAll('a')];
    expect(links).toHaveLength(1);
    expect(links[0]?.getAttribute('href')).toBe(
      'https://metadatafinder.com/jpg-metadata-viewer?utm_source=chrome_extension&utm_medium=extension&utm_campaign=metadatafinder_extension_launch',
    );
    expect(links[0]?.textContent).toBe('MetadataFinder.com');
    expect(links[0]?.getAttribute('href')).not.toMatch(/\s/);
  });

  it('explains a refused host permission instead of printing Error', () => {
    const root = renderOverlay(document, {
      imageUrl: 'https://cdn.example/photo.jpg',
      alt: 'A hill',
      title: null,
      displayedWidth: 320,
      displayedHeight: 180,
      facts: null,
      errorMessage: 'The extension needs permission to read images on this site.',
      utmSource: 'edge_extension',
    });
    expect(root.textContent).toContain('A hill');
    expect(root.textContent).toContain('320px');
    expect(root.textContent).toContain('needs permission');
    expect(root.textContent).not.toContain('>Error<');
    expect(root.textContent).not.toMatch(/\bError\b/);
  });
});

describe('bindDrag', () => {
  it('registers document listeners once', () => {
    let adds = 0;
    const original = document.addEventListener.bind(document);
    document.addEventListener = ((type: string, listener: EventListener) => {
      adds += 1;
      original(type, listener);
    }) as typeof document.addEventListener;
    const root = document.createElement('div');
    bindDrag(document, () => root);
    bindDrag(document, () => root);
    expect(adds).toBe(3);
    expect(document.documentElement.dataset.imvDragBound).toBe('1');
  });
});

describe('extension source', () => {
  it('does not build overlay HTML with innerHTML', () => {
    const srcDir = resolve(import.meta.dirname, '../src');
    const sources = ['overlay.ts', 'content.ts', 'background.ts', 'inspect.ts']
      .map((file) => readFileSync(resolve(srcDir, file), 'utf8'))
      .join('\n');
    expect(sources).not.toMatch(/innerHTML|insertAdjacentHTML|document\.write|importScripts/);
  });
});
