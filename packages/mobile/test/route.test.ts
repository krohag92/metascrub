import { describe, it, expect } from 'vitest';
import { parseDeepLink, parseHash, routeToHash, routeToTab } from '../src/lib/route.js';

describe('parseDeepLink', () => {
  it('parses a valid metascrub://share URL', () => {
    const route = parseDeepLink('metascrub://share?path=%2FDocuments%2Ftest.jpg');
    expect(route).not.toBeNull();
    expect(route?.name).toBe('file');
    if (route?.name === 'file') {
      expect(route.path).toBe('/Documents/test.jpg');
      expect(route.fromShare).toBe(true);
    }
  });

  it('returns null for non-metascrub scheme', () => {
    expect(parseDeepLink('https://example.com/file')).toBeNull();
    expect(parseDeepLink('file:///tmp/photo.jpg')).toBeNull();
  });

  it('returns null for metascrub:// without recognized host', () => {
    expect(parseDeepLink('metascrub://unknown?path=test')).toBeNull();
  });

  it('returns null when path param is missing', () => {
    expect(parseDeepLink('metascrub://share')).toBeNull();
  });

  it('handles a path with spaces encoded as %20', () => {
    const route = parseDeepLink('metascrub://share?path=%2FDocuments%2FMy%20Photo.jpg');
    expect(route?.name).toBe('file');
    if (route?.name === 'file') {
      expect(route.path).toBe('/Documents/My Photo.jpg');
    }
  });
});

describe('parseHash', () => {
  it('parses #/ as home route', () => {
    expect(parseHash('#/')).toEqual({ name: 'home' });
    expect(parseHash('#')).toEqual({ name: 'home' });
    expect(parseHash('')).toEqual({ name: 'home' });
  });

  it('parses #/settings as settings route', () => {
    expect(parseHash('#/settings')).toEqual({ name: 'settings' });
  });

  it('parses #/file?path=... as file route', () => {
    const route = parseHash('#/file?path=%2Ftmp%2Fphoto.jpg');
    expect(route).toEqual({ name: 'file', path: '/tmp/photo.jpg' });
  });

  it('parses #/scrub?path=... as scrub route', () => {
    const route = parseHash('#/scrub?path=%2Fphoto.jpg');
    expect(route).toEqual({ name: 'scrub', path: '/photo.jpg' });
  });

  it('defaults unknown hash to home', () => {
    expect(parseHash('#/unknown')).toEqual({ name: 'home' });
  });
});

describe('routeToHash', () => {
  it('encodes home route', () => {
    expect(routeToHash({ name: 'home' })).toBe('#/');
  });

  it('encodes settings route', () => {
    expect(routeToHash({ name: 'settings' })).toBe('#/settings');
  });

  it('encodes file route with path', () => {
    const hash = routeToHash({ name: 'file', path: '/tmp/photo.jpg' });
    expect(hash).toContain('#/file');
    expect(hash).toContain('path=');
    expect(decodeURIComponent(hash)).toContain('/tmp/photo.jpg');
  });

  it('encodes fromShare flag in file route', () => {
    const hash = routeToHash({ name: 'file', path: '/tmp/photo.jpg', fromShare: true });
    expect(hash).toContain('fromShare=1');
  });

  it('round-trips: routeToHash → parseHash', () => {
    const routes = [
      { name: 'home' as const },
      { name: 'settings' as const },
      { name: 'file' as const, path: '/docs/test.pdf' },
      { name: 'scrub' as const, path: '/docs/test.pdf' },
    ];
    for (const route of routes) {
      const hash = routeToHash(route);
      const parsed = parseHash(hash);
      expect(parsed.name).toBe(route.name);
    }
  });
});

describe('routeToTab', () => {
  it('maps home/file routes to home tab', () => {
    expect(routeToTab({ name: 'home' })).toBe('home');
    expect(routeToTab({ name: 'file', path: '' })).toBe('home');
  });

  it('maps scrub route to scrub tab', () => {
    expect(routeToTab({ name: 'scrub', path: '' })).toBe('scrub');
  });

  it('maps settings route to settings tab', () => {
    expect(routeToTab({ name: 'settings' })).toBe('settings');
  });
});
