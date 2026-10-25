import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatBytes, formatExif } from '../src/exif-format';
import { inspectImageBytes } from '../src/inspect';

describe('formatExif', () => {
  it('joins make and model and keeps script-looking values as plain text', () => {
    const rows = formatExif({
      Make: { description: 'Canon' },
      Model: { description: 'EOS R5' },
      FNumber: { description: '2.8' },
      ExposureTime: { description: '1/200' },
      FocalLength: { description: '85 mm' },
      ISOSpeedRatings: { description: '100' },
      Software: { description: '<script>alert(1)</script>' },
      GPSLatitude: { description: '37.0' },
      GPSLongitude: { description: ' -122.0 ' },
    });
    const value = (label: string) => rows.find((row) => row.label === label)?.value;
    expect(value('Camera')).toBe('Canon EOS R5');
    expect(value('F-Number')).toBe('f/2.8');
    expect(value('Exposure Time')).toBe('1/200s');
    expect(value('Focal Length')).toBe('85 mm');
    expect(value('ISO')).toBe('100');
    expect(value('Software')).toBe('<script>alert(1)</script>');
    expect(value('GPS Longitude')).toBe('-122.0');
  });

  it('does not duplicate a model that already starts with the make', () => {
    const rows = formatExif({
      Make: { description: 'Canon' },
      Model: { description: 'Canon EOS R5' },
    });
    expect(rows[0]?.value).toBe('Canon EOS R5');
  });
});

describe('formatBytes', () => {
  it('scales bytes, kilobytes, and megabytes', () => {
    expect(formatBytes(12)).toBe('12 B');
    expect(formatBytes(2048)).toBe('2.00 KB');
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.00 MB');
  });
});

describe('inspectImageBytes', () => {
  it('reads Make and Model from a JPEG with no CORS headers required', () => {
    const jpeg = readFileSync(resolve(import.meta.dirname, 'fixtures/sample.jpg'));
    const facts = inspectImageBytes(jpeg, 'image/jpeg');
    expect(facts.byteLength).toBe(jpeg.byteLength);
    expect(facts.mimeType).toBe('image/jpeg');
    expect(facts.exif.find((row) => row.label === 'Camera')?.value).toBe('Canon EOS R5');
  });
});
