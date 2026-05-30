/**
 * Persistent store for recent files, backed by @tauri-apps/plugin-store.
 * Falls back to an in-memory array when running outside Tauri (dev / tests).
 */

const STORE_PATH = 'metascrub.dat';
const RECENT_KEY = 'recentFiles';
const MAX_RECENT = 20;

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_IPC__' in window;
}

export interface RecentFile {
  path: string;
  name: string;
  format: string;
  sizeBytes: number;
  openedAt: string; // ISO 8601
}

// In-memory fallback used in tests and browser-only environments
const memStore: RecentFile[] = [];

async function getStore() {
  const { load } = await import('@tauri-apps/plugin-store');
  return load(STORE_PATH, { defaults: {}, autoSave: true });
}

export async function getRecentFiles(): Promise<RecentFile[]> {
  if (!isTauri()) return [...memStore];
  try {
    const store = await getStore();
    const raw = await store.get<RecentFile[]>(RECENT_KEY);
    return raw ?? [];
  } catch {
    return [];
  }
}

export async function addRecentFile(entry: RecentFile): Promise<void> {
  if (!isTauri()) {
    const idx = memStore.findIndex((r) => r.path === entry.path);
    if (idx !== -1) memStore.splice(idx, 1);
    memStore.unshift(entry);
    if (memStore.length > MAX_RECENT) memStore.length = MAX_RECENT;
    return;
  }
  try {
    const store = await getStore();
    const existing = (await store.get<RecentFile[]>(RECENT_KEY)) ?? [];
    const filtered = existing.filter((r) => r.path !== entry.path);
    const updated = [entry, ...filtered].slice(0, MAX_RECENT);
    await store.set(RECENT_KEY, updated);
  } catch {
    // non-fatal
  }
}

export async function clearRecentFiles(): Promise<void> {
  if (!isTauri()) {
    memStore.length = 0;
    return;
  }
  try {
    const store = await getStore();
    await store.set(RECENT_KEY, []);
  } catch {
    // non-fatal
  }
}
