import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
  version: string;
  homepage: string;
};

function readManifest(name: string) {
  return JSON.parse(readFileSync(resolve(root, name), 'utf8')) as {
    version: string;
    homepage_url: string;
    update_url?: string;
    content_scripts?: unknown;
    host_permissions: string[];
    background: { service_worker?: string; scripts?: string[] };
    browser_specific_settings?: {
      gecko: {
        id: string;
        data_collection_permissions: { required: string[] };
      };
    };
  };
}

describe('manifests', () => {
  it('keeps the Chrome listing identity and drops the store update URL', () => {
    const manifest = readManifest('manifest.chromium.json');
    expect(manifest.version).toBe(pkg.version);
    expect(manifest.version).toBe('1.1.0');
    expect(manifest.homepage_url).toBe('https://metadatafinder.com/jpg-metadata-viewer');
    expect(manifest.homepage_url).toBe(pkg.homepage);
    expect(manifest.update_url).toBeUndefined();
    expect(manifest.content_scripts).toBeUndefined();
    expect(manifest.background.service_worker).toBe('background.js');
    expect(manifest.host_permissions).toEqual(['<all_urls>']);
  });

  it('declares the Firefox id and that no data is collected', () => {
    const manifest = readManifest('manifest.firefox.json');
    expect(manifest.background.scripts).toEqual(['background.js']);
    expect(manifest.background.service_worker).toBeUndefined();
    expect(manifest.content_scripts).toBeUndefined();
    const gecko = manifest.browser_specific_settings?.gecko;
    expect(gecko?.id).toBe('image-metadata-viewer@metadatafinder.com');
    expect(gecko?.data_collection_permissions.required).toEqual(['none']);
  });
});
