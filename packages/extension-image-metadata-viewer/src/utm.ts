export const HOMEPAGE = 'https://metadatafinder.com/jpg-metadata-viewer';

export const UTM_SOURCES = [
  'chrome_extension',
  'firefox_extension',
  'edge_extension',
  'opera_extension',
] as const;

export type UtmSource = (typeof UTM_SOURCES)[number];

const CAMPAIGN = 'metadatafinder_extension_launch';

/** Edge and Opera include "Chrome" in the UA, so those checks come first. */
export function detectUtmSource(userAgent: string): UtmSource {
  if (userAgent.includes('Firefox/')) return 'firefox_extension';
  if (userAgent.includes('Edg/')) return 'edge_extension';
  if (userAgent.includes('OPR/') || userAgent.includes('Opera/')) return 'opera_extension';
  return 'chrome_extension';
}

export function poweredByUrl(source: UtmSource): string {
  const url = new URL(HOMEPAGE);
  url.searchParams.set('utm_source', source);
  url.searchParams.set('utm_medium', 'extension');
  url.searchParams.set('utm_campaign', CAMPAIGN);
  return url.toString();
}

export function isHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.toString();
  } catch {
    return null;
  }
  return null;
}
