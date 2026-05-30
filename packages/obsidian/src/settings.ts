import type { ScrubPreset } from '@metascrub/core';

export interface MetaScrubSettings {
  scrubPreset: ScrubPreset;
  includeSubfolders: boolean;
}

export const DEFAULT_SETTINGS: MetaScrubSettings = {
  scrubPreset: 'all',
  includeSubfolders: true,
};
