/**
 * Thin wrappers around Tauri IPC commands defined in src-tauri/src/lib.rs.
 *
 * In test environments (vitest / jsdom) window.__TAURI_IPC__ is not present.
 * Each function gracefully falls back so unit tests can run in a browser-like
 * environment.
 */

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_IPC__' in window;
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) {
    throw new Error(`Tauri not available (cmd=${cmd})`);
  }
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
  return tauriInvoke<T>(cmd, args);
}

export async function readFileBytes(path: string): Promise<Uint8Array> {
  const bytes = await invoke<number[]>('read_file_bytes', { path });
  return new Uint8Array(bytes);
}

export async function writeFileBytes(path: string, bytes: Uint8Array): Promise<void> {
  await invoke<void>('write_file_bytes', { path, bytes: Array.from(bytes) });
}

export interface DirEntry {
  path: string;
  name: string;
  is_dir: boolean;
  size: number;
}

export async function listDir(path: string): Promise<DirEntry[]> {
  return invoke<DirEntry[]>('list_dir', { path });
}

export async function pickFiles(): Promise<string[]> {
  return invoke<string[]>('pick_files');
}

export async function openUrl(url: string): Promise<void> {
  return invoke<void>('open_url', { url });
}
