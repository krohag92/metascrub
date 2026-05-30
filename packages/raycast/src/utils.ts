import path from 'node:path';
import type { MetadataResult, MetadataField, ScrubPreset } from '@metascrub/core';

/**
 * Derives the output filename for a scrubbed file.
 * e.g. "photo.jpg" -> "photo.clean.jpg"
 */
export function cleanFilename(filePath: string): string {
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);
  const dir = path.dirname(filePath);
  return path.join(dir, `${base}.clean${ext}`);
}

/**
 * Parses a preset string from the command argument. Defaults to 'all' if
 * the value is absent or unrecognised.
 */
export function resolvePreset(raw: string | undefined): ScrubPreset {
  const valid: ScrubPreset[] = ['all', 'gps-only', 'personal-only', 'keep-technical'];
  if (raw && (valid as string[]).includes(raw)) {
    return raw as ScrubPreset;
  }
  return 'all';
}

/**
 * Returns a human-readable label for a preset.
 */
export function presetLabel(preset: ScrubPreset): string {
  const labels: Record<ScrubPreset, string> = {
    all: 'Remove All',
    'gps-only': 'GPS Only',
    'personal-only': 'Personal Only',
    'keep-technical': 'Keep Technical',
    custom: 'Custom',
  };
  return labels[preset] ?? preset;
}

/**
 * Computes which fields were removed when comparing an original parse result
 * to a post-scrub parse result. Returns a flat array of MetadataField values
 * that appear in `original` but not (or with a different value) in `cleaned`.
 */
export function computeRemovedFields(
  original: MetadataResult,
  cleaned: MetadataResult,
): MetadataField[] {
  const removed: MetadataField[] = [];

  for (const [group, fields] of Object.entries(original.groups)) {
    const cleanedFields = cleaned.groups[group] ?? [];
    const cleanedMap = new Map(cleanedFields.map((f) => [f.key, f]));

    for (const field of fields) {
      const cf = cleanedMap.get(field.key);
      if (!cf || cf.value !== field.value) {
        removed.push(field);
      }
    }
  }

  return removed;
}

/**
 * Counts total fields across all groups.
 */
export function countFields(result: MetadataResult): number {
  return Object.values(result.groups).reduce((acc, fields) => acc + fields.length, 0);
}

/**
 * Groups MetadataField[] by group name for display in a List.
 * Returns entries sorted so groups with warnings come first.
 */
export function orderedGroups(
  result: MetadataResult,
): Array<{ group: string; fields: MetadataField[] }> {
  const sensitiveGroups = new Set<string>();
  for (const [group, fields] of Object.entries(result.groups)) {
    if (fields.some((f) => f.sensitive)) {
      sensitiveGroups.add(group);
    }
  }

  const entries = Object.entries(result.groups).map(([group, fields]) => ({ group, fields }));
  entries.sort((a, b) => {
    const aS = sensitiveGroups.has(a.group) ? 0 : 1;
    const bS = sensitiveGroups.has(b.group) ? 0 : 1;
    return aS - bS || a.group.localeCompare(b.group);
  });
  return entries;
}

/**
 * Returns a short summary string describing what was found in a parse result,
 * suitable for the List subtitle.
 */
export function parseSummary(result: MetadataResult): string {
  const total = countFields(result);
  const warnings = result.warnings.length;
  const parts: string[] = [`${total} field${total !== 1 ? 's' : ''}`];
  if (warnings > 0) parts.push(`${warnings} warning${warnings !== 1 ? 's' : ''}`);
  return parts.join(' · ');
}

/**
 * Formats a MetadataValue for display.
 */
export function formatValue(value: string | number | boolean | null): string {
  if (value === null) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}
