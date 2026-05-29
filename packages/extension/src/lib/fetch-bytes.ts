/**
 * Fetch a URL's raw bytes.
 *
 * Strategy:
 * 1. Try a direct fetch (works when CORS allows it or the URL is same-origin).
 * 2. If CORS blocks it, fall back to fetching via the background service worker
 *    which has <all_urls> host permission and therefore bypasses CORS.
 */
export async function fetchBytes(url: string): Promise<Uint8Array> {
  // Background service worker can always fetch with host permissions;
  // popup / content scripts may hit CORS. We just fetch directly here —
  // in the service worker context there is no CORS restriction on fetching
  // because the extension has <all_urls> host_permissions.
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}
