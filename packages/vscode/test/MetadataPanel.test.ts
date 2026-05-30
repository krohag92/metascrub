import { describe, it, expect } from 'vitest';
import type { MetadataResult } from '@metascrub/core';

// We import the static buildHtml directly from MetadataPanel.
// Because the test runs outside of a real VS Code runtime we need to stub
// the `vscode` module before importing MetadataPanel.
import { vi } from 'vitest';

// Stub the vscode module so MetadataPanel can be imported without a real host.
vi.mock('vscode', () => ({
  window: {
    createWebviewPanel: vi.fn(),
    activeTextEditor: undefined,
  },
  ViewColumn: { One: 1 },
  Uri: { file: (p: string) => ({ fsPath: p }) },
}));

// Dynamically import after the mock is set up.
const { MetadataPanel } = await import('../src/MetadataPanel.js');

// Minimal stub matching vscode.Webview shape for cspSource.
const fakeWebview = {
  cspSource: 'vscode-resource:',
} as unknown as import('vscode').Webview;

function makeResult(overrides: Partial<MetadataResult> = {}): MetadataResult {
  return {
    format: 'jpeg',
    filename: 'test.jpg',
    sizeBytes: 204800,
    groups: {
      EXIF: [
        { key: 'Make', label: 'Camera Make', value: 'Canon', sensitive: false },
        { key: 'GPS.Lat', label: 'GPS Latitude', value: 37.7749, sensitive: true },
      ],
      IPTC: [{ key: 'Creator', label: 'Creator', value: 'Jane Doe', sensitive: true }],
    },
    highlights: {
      gps: { lat: 37.7749, lon: -122.4194, alt: 50 },
      device: { make: 'Canon', model: 'EOS R5' },
      author: 'Jane Doe',
      software: 'Adobe Photoshop 2024',
      capturedAt: '2024-06-01T10:00:00',
    },
    warnings: ['GPS coordinates found', 'Personal info found: Creator'],
    ...overrides,
  };
}

describe('MetadataPanel.buildHtml', () => {
  it('includes the filename in the title', () => {
    const html = MetadataPanel.buildHtml(fakeWebview, makeResult(), 'photo.jpg');
    expect(html).toContain('photo.jpg');
  });

  it('renders warnings section when warnings are present', () => {
    const html = MetadataPanel.buildHtml(fakeWebview, makeResult(), 'photo.jpg');
    expect(html).toContain('GPS coordinates found');
    expect(html).toContain('Personal info found: Creator');
    expect(html).toContain('class="warnings"');
  });

  it('does NOT render warnings section when there are no warnings', () => {
    const result = makeResult({ warnings: [] });
    const html = MetadataPanel.buildHtml(fakeWebview, result, 'photo.jpg');
    expect(html).not.toContain('class="warnings"');
  });

  it('renders highlight badges for GPS', () => {
    const html = MetadataPanel.buildHtml(fakeWebview, makeResult(), 'photo.jpg');
    expect(html).toContain('37.77490');
    expect(html).toContain('-122.41940');
    expect(html).toContain('alt 50m');
  });

  it('renders highlight badges for device', () => {
    const html = MetadataPanel.buildHtml(fakeWebview, makeResult(), 'photo.jpg');
    expect(html).toContain('Canon EOS R5');
  });

  it('renders highlight badges for author', () => {
    const html = MetadataPanel.buildHtml(fakeWebview, makeResult(), 'photo.jpg');
    expect(html).toContain('Author: Jane Doe');
  });

  it('renders highlight badges for software', () => {
    const html = MetadataPanel.buildHtml(fakeWebview, makeResult(), 'photo.jpg');
    expect(html).toContain('Software: Adobe Photoshop 2024');
  });

  it('renders collapsible group sections', () => {
    const html = MetadataPanel.buildHtml(fakeWebview, makeResult(), 'photo.jpg');
    expect(html).toContain('<details');
    expect(html).toContain('<summary>EXIF</summary>');
    expect(html).toContain('<summary>IPTC</summary>');
  });

  it('renders field rows with sensitive class for sensitive fields', () => {
    const html = MetadataPanel.buildHtml(fakeWebview, makeResult(), 'photo.jpg');
    expect(html).toContain('class="sensitive"');
    expect(html).toContain('GPS Latitude');
  });

  it('renders the metadatafinder.com footer link', () => {
    const html = MetadataPanel.buildHtml(fakeWebview, makeResult(), 'photo.jpg');
    expect(html).toContain('href="https://metadatafinder.com"');
    expect(html).toContain('metadatafinder.com');
  });

  it('includes correct CSP with webview.cspSource', () => {
    const html = MetadataPanel.buildHtml(fakeWebview, makeResult(), 'photo.jpg');
    expect(html).toContain('vscode-resource:');
    expect(html).toContain('Content-Security-Policy');
  });

  it('renders format and file size in meta-info line', () => {
    const html = MetadataPanel.buildHtml(fakeWebview, makeResult(), 'photo.jpg');
    expect(html).toContain('jpeg');
    expect(html).toContain('200.0 KB');
  });

  it('renders "No metadata found" when groups are all empty', () => {
    const result = makeResult({ groups: {} });
    const html = MetadataPanel.buildHtml(fakeWebview, result, 'empty.jpg');
    expect(html).toContain('No metadata found in this file.');
  });

  it('escapes HTML in field values to prevent XSS', () => {
    const result = makeResult({
      groups: {
        EXIF: [
          {
            key: 'Comment',
            label: 'Comment',
            value: '<script>alert("xss")</script>',
            sensitive: false,
          },
        ],
      },
    });
    const html = MetadataPanel.buildHtml(fakeWebview, result, 'test.jpg');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('shows no highlights section when highlights object is empty', () => {
    const result = makeResult({ highlights: {} });
    const html = MetadataPanel.buildHtml(fakeWebview, result, 'test.jpg');
    expect(html).not.toContain('class="highlights"');
  });
});
