import { App } from '@capacitor/app';
import { parseDeepLink } from './route.js';
import type { Route } from './route.js';

type RouteHandler = (route: Route) => void;

let handler: RouteHandler | null = null;

/**
 * Register a handler invoked when the app is opened via the Share Extension
 * or Android Share Intent. On iOS this comes via the metascrub:// URL scheme
 * forwarded from the Share Extension through the App Group container.
 * On Android it comes via the SEND intent captured by the Capacitor bridge.
 *
 * Call this once at app startup (in App.tsx).
 */
export function registerShareHandler(onRoute: RouteHandler): void {
  handler = onRoute;

  // Handle app already launched via deep link (initial URL)
  void App.getLaunchUrl().then((result) => {
    if (result?.url) {
      dispatchUrl(result.url);
    }
  });

  // Handle URLs while app is already running (background → foreground)
  void App.addListener('appUrlOpen', (event) => {
    dispatchUrl(event.url);
  });
}

function dispatchUrl(url: string): void {
  // iOS Share Extension route: metascrub://share?path=<app-group-path>
  const route = parseDeepLink(url);
  if (route && handler) {
    handler(route);
  }

  // Android Share Intent: Capacitor wraps the content:// URI as an appUrlOpen
  // event with url = "content://..." or "file://..."
  if (!route && handler && (url.startsWith('content://') || url.startsWith('file://'))) {
    handler({ name: 'file', path: url, fromShare: true });
  }
}

/** Remove the share handler (call on cleanup) */
export async function removeShareHandler(): Promise<void> {
  handler = null;
  await App.removeAllListeners();
}
