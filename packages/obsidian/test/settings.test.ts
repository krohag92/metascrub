import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/settings';
import type { MetaScrubSettings } from '../src/settings';

describe('MetaScrubSettings serialization', () => {
  it('DEFAULT_SETTINGS has correct shape', () => {
    expect(DEFAULT_SETTINGS).toMatchObject<MetaScrubSettings>({
      scrubPreset: 'all',
      includeSubfolders: true,
    });
  });

  it('merging stored partial settings preserves defaults for missing keys', () => {
    const stored: Partial<MetaScrubSettings> = { scrubPreset: 'gps-only' };
    const merged: MetaScrubSettings = { ...DEFAULT_SETTINGS, ...stored };
    expect(merged.scrubPreset).toBe('gps-only');
    expect(merged.includeSubfolders).toBe(true);
  });

  it('null stored data falls back to defaults', () => {
    const stored: Partial<MetaScrubSettings> | null = null;
    const merged: MetaScrubSettings = { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
    expect(merged).toEqual(DEFAULT_SETTINGS);
  });

  it('all preset values are valid ScrubPreset strings', () => {
    const validPresets = ['all', 'gps-only', 'personal-only', 'keep-technical', 'custom'];
    expect(validPresets).toContain(DEFAULT_SETTINGS.scrubPreset);
  });

  it('includeSubfolders is a boolean', () => {
    expect(typeof DEFAULT_SETTINGS.includeSubfolders).toBe('boolean');
  });

  it('round-trip through JSON preserves settings', () => {
    const settings: MetaScrubSettings = {
      scrubPreset: 'personal-only',
      includeSubfolders: false,
    };
    const json = JSON.stringify(settings);
    const parsed = JSON.parse(json) as MetaScrubSettings;
    expect(parsed).toEqual(settings);
  });
});
