/**
 * Minimal hash-based router for MetaScrub mobile.
 * No external router dependency — Capacitor apps work well with simple hash routing.
 */

export type Route =
  | { name: 'home' }
  | { name: 'file'; path: string; fromShare?: boolean }
  | { name: 'scrub'; path: string }
  | { name: 'settings' };

export type Tab = 'home' | 'scrub' | 'settings';

/** Parse a metascrub:// deep-link URL into a Route */
export function parseDeepLink(url: string): Route | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'metascrub:') return null;

    const host = parsed.hostname; // e.g. "share"
    if (host === 'share') {
      const path = parsed.searchParams.get('path');
      if (!path) return null;
      return { name: 'file', path, fromShare: true };
    }

    return null;
  } catch {
    return null;
  }
}

/** Parse a hash fragment like "#/file?path=..." into a Route */
export function parseHash(hash: string): Route {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const [pathname, search] = raw.split('?');
  const params = new URLSearchParams(search ?? '');

  if (pathname === '/file') {
    const path = params.get('path') ?? '';
    return { name: 'file', path };
  }

  if (pathname === '/scrub') {
    const path = params.get('path') ?? '';
    return { name: 'scrub', path };
  }

  if (pathname === '/settings') {
    return { name: 'settings' };
  }

  return { name: 'home' };
}

/** Encode a Route to a hash fragment */
export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/';
    case 'file': {
      const params = new URLSearchParams({ path: route.path });
      if (route.fromShare) params.set('fromShare', '1');
      return `#/file?${params.toString()}`;
    }
    case 'scrub': {
      const params = new URLSearchParams({ path: route.path });
      return `#/scrub?${params.toString()}`;
    }
    case 'settings':
      return '#/settings';
  }
}

/** Navigate by setting window.location.hash */
export function navigate(route: Route): void {
  window.location.hash = routeToHash(route);
}

/** Read current Route from window.location.hash */
export function currentRoute(): Route {
  return parseHash(window.location.hash);
}

/** Map active tab from a Route */
export function routeToTab(route: Route): Tab {
  if (route.name === 'settings') return 'settings';
  if (route.name === 'scrub') return 'scrub';
  return 'home';
}
