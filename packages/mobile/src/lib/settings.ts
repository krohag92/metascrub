import { Preferences } from '@capacitor/preferences';
import type { ScrubPreset } from '@metascrub/core';

export interface AppSettings {
  defaultPreset: ScrubPreset;
  scrubCount: number; // tracks scrubs for in-app review prompt
}

const PREFS_KEY = 'metascrub.settings';

const DEFAULT_SETTINGS: AppSettings = {
  defaultPreset: 'all',
  scrubCount: 0,
};

export async function getSettings(): Promise<AppSettings> {
  const { value } = await Preferences.get({ key: PREFS_KEY });
  if (!value) return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(value) as Partial<AppSettings>) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<void> {
  const current = await getSettings();
  const updated = { ...current, ...settings };
  await Preferences.set({ key: PREFS_KEY, value: JSON.stringify(updated) });
}

export async function incrementScrubCount(): Promise<number> {
  const settings = await getSettings();
  const newCount = settings.scrubCount + 1;
  await saveSettings({ scrubCount: newCount });
  return newCount;
}
