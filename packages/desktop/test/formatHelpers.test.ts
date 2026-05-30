import { describe, it, expect } from 'vitest';
import {
  formatBytes,
  formatIcon,
  buildRemovedDiff,
  extToMime,
} from '../src/lib/formatHelpers.js';
import type { MetadataField } from '@metascrub/core';

describe('formatBytes', () => {
  it('formats bytes correctly', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('formats KB correctly', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('formats MB correctly', () => {
    expect(formatBytes(1_048_576)).toBe('1.00 MB');
    expect(formatBytes(2_621_440)).toBe('2.50 MB');
  });

  it('formats GB correctly', () => {
    expect(formatBytes(1_073_741_824)).toBe('1.00 GB');
  });
});

describe('formatIcon', () => {
  it('returns the correct badge string for known formats', () => {
    expect(formatIcon('jpeg')).toBe('JPG');
    expect(formatIcon('png')).toBe('PNG');
    expect(formatIcon('pdf')).toBe('PDF');
    expect(formatIcon('docx')).toBe('DOCX');
    expect(formatIcon('mp4')).toBe('MP4');
    expect(formatIcon('mp3')).toBe('MP3');
    expect(formatIcon('svg')).toBe('SVG');
    expect(formatIcon('epub')).toBe('EPUB');
  });

  it('returns ??? for unknown format', () => {
    // @ts-expect-error — testing unknown format path
    expect(formatIcon('xyz')).toBe('???');
  });
});

describe('buildRemovedDiff', () => {
  const makeFields = (keys: string[]): MetadataField[] =>
    keys.map((key) => ({ key, label: `Label:${key}`, value: 'v' }));

  it('returns empty diff when before and after are identical', () => {
    const groups = { EXIF: makeFields(['Make', 'Model']) };
    const result = buildRemovedDiff(groups, groups);
    expect(result.removedCount).toBe(0);
    expect(result.removedLabels).toHaveLength(0);
  });

  it('detects removed fields', () => {
    const before = { EXIF: makeFields(['Make', 'Model', 'GPS']) };
    const after = { EXIF: makeFields(['Make', 'Model']) };
    const result = buildRemovedDiff(before, after);
    expect(result.removedCount).toBe(1);
    expect(result.removedLabels).toContain('Label:GPS');
  });

  it('returns all removed when after is empty', () => {
    const before = { EXIF: makeFields(['Make', 'Model']), XMP: makeFields(['Creator']) };
    const result = buildRemovedDiff(before, {});
    expect(result.removedCount).toBe(3);
  });

  it('returns zero when before is empty', () => {
    const after = { EXIF: makeFields(['Make']) };
    const result = buildRemovedDiff({}, after);
    expect(result.removedCount).toBe(0);
  });
});

describe('extToMime', () => {
  it('returns correct MIME for image extensions', () => {
    expect(extToMime('jpg')).toBe('image/jpeg');
    expect(extToMime('jpeg')).toBe('image/jpeg');
    expect(extToMime('png')).toBe('image/png');
    expect(extToMime('webp')).toBe('image/webp');
  });

  it('returns correct MIME for document extensions', () => {
    expect(extToMime('pdf')).toBe('application/pdf');
    expect(extToMime('docx')).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    expect(extToMime('epub')).toBe('application/epub+zip');
  });

  it('is case-insensitive', () => {
    expect(extToMime('PDF')).toBe('application/pdf');
    expect(extToMime('JPG')).toBe('image/jpeg');
  });

  it('falls back to octet-stream for unknown extensions', () => {
    expect(extToMime('xyz')).toBe('application/octet-stream');
    expect(extToMime('')).toBe('application/octet-stream');
  });
});
