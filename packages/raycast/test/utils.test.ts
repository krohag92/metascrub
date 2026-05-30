import { describe, it, expect } from 'vitest';
import {
  cleanFilename,
  resolvePreset,
  presetLabel,
  computeRemovedFields,
  countFields,
  parseSummary,
  formatValue,
  orderedGroups,
} from '../src/utils.js';
import type { MetadataResult } from '@metascrub/core';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResult(overrides: Partial<MetadataResult> = {}): MetadataResult {
  return {
    format: 'jpeg',
    filename: 'test.jpg',
    sizeBytes: 1024,
    groups: {},
    highlights: {},
    warnings: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// cleanFilename
// ---------------------------------------------------------------------------

describe('cleanFilename', () => {
  it('inserts .clean before the extension', () => {
    expect(cleanFilename('/Users/alice/photo.jpg')).toBe('/Users/alice/photo.clean.jpg');
  });

  it('works with uppercase extension', () => {
    expect(cleanFilename('/tmp/doc.PDF')).toBe('/tmp/doc.clean.PDF');
  });

  it('works with multi-part filenames', () => {
    expect(cleanFilename('/tmp/my.file.jpeg')).toBe('/tmp/my.file.clean.jpeg');
  });

  it('works with files in current directory (no leading slash)', () => {
    const result = cleanFilename('image.png');
    expect(result).toMatch(/image\.clean\.png$/);
  });
});

// ---------------------------------------------------------------------------
// resolvePreset
// ---------------------------------------------------------------------------

describe('resolvePreset', () => {
  it('returns all by default when undefined', () => {
    expect(resolvePreset(undefined)).toBe('all');
  });

  it('returns all by default for empty string', () => {
    expect(resolvePreset('')).toBe('all');
  });

  it('returns all for "all"', () => {
    expect(resolvePreset('all')).toBe('all');
  });

  it('returns gps-only', () => {
    expect(resolvePreset('gps-only')).toBe('gps-only');
  });

  it('returns personal-only', () => {
    expect(resolvePreset('personal-only')).toBe('personal-only');
  });

  it('returns keep-technical', () => {
    expect(resolvePreset('keep-technical')).toBe('keep-technical');
  });

  it('returns all for unknown preset', () => {
    expect(resolvePreset('banana')).toBe('all');
  });
});

// ---------------------------------------------------------------------------
// presetLabel
// ---------------------------------------------------------------------------

describe('presetLabel', () => {
  it('labels all presets', () => {
    expect(presetLabel('all')).toBe('Remove All');
    expect(presetLabel('gps-only')).toBe('GPS Only');
    expect(presetLabel('personal-only')).toBe('Personal Only');
    expect(presetLabel('keep-technical')).toBe('Keep Technical');
  });
});

// ---------------------------------------------------------------------------
// countFields
// ---------------------------------------------------------------------------

describe('countFields', () => {
  it('returns 0 for empty groups', () => {
    expect(countFields(makeResult())).toBe(0);
  });

  it('counts all fields across groups', () => {
    const result = makeResult({
      groups: {
        EXIF: [
          { key: 'Make', value: 'Canon' },
          { key: 'Model', value: 'EOS R5' },
        ],
        GPS: [{ key: 'Latitude', value: 37.7749 }],
      },
    });
    expect(countFields(result)).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// computeRemovedFields
// ---------------------------------------------------------------------------

describe('computeRemovedFields', () => {
  it('returns empty when nothing changed', () => {
    const r = makeResult({
      groups: {
        EXIF: [{ key: 'Make', value: 'Canon' }],
      },
    });
    expect(computeRemovedFields(r, r)).toHaveLength(0);
  });

  it('detects removed fields', () => {
    const original = makeResult({
      groups: {
        EXIF: [
          { key: 'Make', value: 'Canon' },
          { key: 'GPS', value: '37.7749' },
        ],
      },
    });
    const cleaned = makeResult({
      groups: {
        EXIF: [{ key: 'Make', value: 'Canon' }],
      },
    });
    const removed = computeRemovedFields(original, cleaned);
    expect(removed).toHaveLength(1);
    expect(removed[0].key).toBe('GPS');
  });

  it('detects changed values as removed', () => {
    const original = makeResult({
      groups: {
        EXIF: [{ key: 'Software', value: 'Adobe Photoshop' }],
      },
    });
    const cleaned = makeResult({
      groups: {
        EXIF: [{ key: 'Software', value: '' }],
      },
    });
    const removed = computeRemovedFields(original, cleaned);
    expect(removed).toHaveLength(1);
    expect(removed[0].key).toBe('Software');
  });

  it('handles groups present in original but absent in cleaned', () => {
    const original = makeResult({
      groups: {
        GPS: [
          { key: 'Latitude', value: 37.7749 },
          { key: 'Longitude', value: -122.4194 },
        ],
      },
    });
    const cleaned = makeResult({ groups: {} });
    const removed = computeRemovedFields(original, cleaned);
    expect(removed).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// parseSummary
// ---------------------------------------------------------------------------

describe('parseSummary', () => {
  it('reports field count only when no warnings', () => {
    const result = makeResult({
      groups: {
        EXIF: [{ key: 'Make', value: 'Nikon' }],
      },
    });
    expect(parseSummary(result)).toBe('1 field');
  });

  it('uses plural for multiple fields', () => {
    const result = makeResult({
      groups: {
        EXIF: [
          { key: 'Make', value: 'Nikon' },
          { key: 'Model', value: 'Z9' },
        ],
      },
    });
    expect(parseSummary(result)).toBe('2 fields');
  });

  it('appends warning count', () => {
    const result = makeResult({
      groups: { EXIF: [{ key: 'Make', value: 'Nikon' }] },
      warnings: ['GPS coordinates found'],
    });
    expect(parseSummary(result)).toBe('1 field · 1 warning');
  });

  it('uses plural for multiple warnings', () => {
    const result = makeResult({
      groups: { EXIF: [{ key: 'Make', value: 'Nikon' }] },
      warnings: ['GPS coordinates found', 'Personal info found'],
    });
    expect(parseSummary(result)).toBe('1 field · 2 warnings');
  });

  it('reports 0 fields when groups is empty', () => {
    expect(parseSummary(makeResult())).toBe('0 fields');
  });
});

// ---------------------------------------------------------------------------
// formatValue
// ---------------------------------------------------------------------------

describe('formatValue', () => {
  it('renders null as em dash', () => {
    expect(formatValue(null)).toBe('—');
  });

  it('renders true as Yes', () => {
    expect(formatValue(true)).toBe('Yes');
  });

  it('renders false as No', () => {
    expect(formatValue(false)).toBe('No');
  });

  it('renders numbers as strings', () => {
    expect(formatValue(3.14)).toBe('3.14');
  });

  it('passes strings through', () => {
    expect(formatValue('hello')).toBe('hello');
  });
});

// ---------------------------------------------------------------------------
// orderedGroups
// ---------------------------------------------------------------------------

describe('orderedGroups', () => {
  it('returns empty array for empty groups', () => {
    expect(orderedGroups(makeResult())).toHaveLength(0);
  });

  it('sorts sensitive groups before non-sensitive', () => {
    const result = makeResult({
      groups: {
        EXIF: [{ key: 'Make', value: 'Canon', sensitive: false }],
        GPS: [{ key: 'Latitude', value: 37.77, sensitive: true }],
      },
    });
    const ordered = orderedGroups(result);
    expect(ordered[0].group).toBe('GPS');
    expect(ordered[1].group).toBe('EXIF');
  });

  it('sorts non-sensitive groups alphabetically', () => {
    const result = makeResult({
      groups: {
        XMP: [{ key: 'Creator', value: 'Alice' }],
        EXIF: [{ key: 'Make', value: 'Canon' }],
        IPTC: [{ key: 'City', value: 'NYC' }],
      },
    });
    const ordered = orderedGroups(result);
    const names = ordered.map((g) => g.group);
    expect(names).toEqual(['EXIF', 'IPTC', 'XMP']);
  });
});
