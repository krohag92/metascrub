import type { MetadataResult, MetadataDiff } from '@metascrub/core';

export function renderResultJson(result: MetadataResult): string {
  return JSON.stringify(result, null, 2);
}

export function renderDiffJson(diff: MetadataDiff): string {
  return JSON.stringify(diff, null, 2);
}
