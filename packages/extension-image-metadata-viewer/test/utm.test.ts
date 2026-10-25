import { describe, expect, it } from 'vitest';
import { HOST_PERMISSION_MESSAGE, resolveHostAccess } from '../src/permissions';
import { detectUtmSource, poweredByUrl } from '../src/utm';

describe('utm', () => {
  it('identifies the browser without treating Edge or Opera as Chrome', () => {
    expect(detectUtmSource('Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36')).toBe('chrome_extension');
    expect(detectUtmSource('Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0')).toBe(
      'edge_extension',
    );
    expect(detectUtmSource('Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0')).toBe(
      'opera_extension',
    );
    expect(detectUtmSource('Mozilla/5.0 Firefox/121.0')).toBe('firefox_extension');
  });

  it('builds a powered-by URL with no line break', () => {
    const url = poweredByUrl('firefox_extension');
    expect(url).toBe(
      'https://metadatafinder.com/jpg-metadata-viewer?utm_source=firefox_extension&utm_medium=extension&utm_campaign=metadatafinder_extension_launch',
    );
    expect(url).not.toMatch(/\s/);
  });
});

describe('resolveHostAccess', () => {
  it('does not prompt again when access is already granted', async () => {
    let requested = false;
    const allowed = await resolveHostAccess(
      async () => true,
      async () => {
        requested = true;
        return false;
      },
    );
    expect(allowed).toBe(true);
    expect(requested).toBe(false);
  });

  it('returns false when the prompt is dismissed or throws', async () => {
    expect(
      await resolveHostAccess(
        async () => false,
        async () => false,
      ),
    ).toBe(false);
    expect(
      await resolveHostAccess(
        async () => false,
        async () => {
          throw new Error('no gesture');
        },
      ),
    ).toBe(false);
    expect(HOST_PERMISSION_MESSAGE.length).toBeGreaterThan(20);
  });
});
