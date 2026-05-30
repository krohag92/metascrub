import { Preferences } from '@capacitor/preferences';

export interface RecentFile {
  name: string;
  path: string;
  format: string;
  sizeBytes: number;
  processedAt: string; // ISO 8601
  scrubbed: boolean;
}

const PREFS_KEY = 'metascrub.recentFiles';
const MAX_RECENT = 20;

export async function getRecentFiles(): Promise<RecentFile[]> {
  const { value } = await Preferences.get({ key: PREFS_KEY });
  if (!value) return [];
  try {
    return JSON.parse(value) as RecentFile[];
  } catch {
    return [];
  }
}

export async function addRecentFile(file: RecentFile): Promise<void> {
  const current = await getRecentFiles();
  // Remove duplicate path if exists
  const filtered = current.filter((f) => f.path !== file.path);
  const updated = [file, ...filtered].slice(0, MAX_RECENT);
  await Preferences.set({ key: PREFS_KEY, value: JSON.stringify(updated) });
}

export async function clearRecentFiles(): Promise<void> {
  await Preferences.remove({ key: PREFS_KEY });
}
