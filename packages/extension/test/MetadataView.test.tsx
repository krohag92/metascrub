import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MetadataView } from '../src/popup/components/MetadataView.js';
import type { MetadataResult } from '@metascrub/core';

function makeResult(overrides: Partial<MetadataResult> = {}): MetadataResult {
  return {
    format: 'jpeg',
    filename: 'test.jpg',
    sizeBytes: 12345,
    groups: {},
    highlights: {},
    warnings: [],
    ...overrides,
  };
}

describe('MetadataView', () => {
  it('renders file name and format', () => {
    const result = makeResult();
    render(<MetadataView result={result} filename="test.jpg" />);
    expect(screen.getByText('test.jpg')).toBeDefined();
    expect(screen.getByText(/JPEG/)).toBeDefined();
  });

  it('shows "No metadata found" when groups is empty', () => {
    const result = makeResult({ groups: {} });
    render(<MetadataView result={result} filename="test.jpg" />);
    expect(screen.getByText('No metadata found')).toBeDefined();
  });

  it('renders namespace groups', () => {
    const result = makeResult({
      groups: {
        EXIF: [
          { key: 'Make', label: 'Camera Make', value: 'Canon', sensitive: false },
          { key: 'Model', label: 'Camera Model', value: 'EOS R5', sensitive: false },
        ],
        GPS: [{ key: 'GPSLatitude', label: 'Latitude', value: '51.5074', sensitive: true }],
      },
    });
    render(<MetadataView result={result} filename="photo.jpg" />);
    // Namespace headings should be present
    expect(screen.getByText(/EXIF/)).toBeDefined();
    expect(screen.getByText(/GPS/)).toBeDefined();
  });

  it('expands first namespace by default', async () => {
    const result = makeResult({
      groups: {
        EXIF: [{ key: 'Make', label: 'Camera Make', value: 'Nikon', sensitive: false }],
      },
    });
    render(<MetadataView result={result} filename="photo.jpg" />);
    // First group is open by default — field value should be visible
    expect(screen.getByText('Nikon')).toBeDefined();
  });

  it('shows warnings via WarningBadge', () => {
    const result = makeResult({
      warnings: ['GPS coordinates found', 'Personal info found: Artist'],
    });
    render(<MetadataView result={result} filename="test.jpg" />);
    expect(screen.getByText('GPS coordinates found')).toBeDefined();
    expect(screen.getByText('Personal info found: Artist')).toBeDefined();
    expect(screen.getByText(/2 warnings/)).toBeDefined();
  });

  it('does not show warning section when there are no warnings', () => {
    const result = makeResult({ warnings: [] });
    render(<MetadataView result={result} filename="test.jpg" />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('marks sensitive fields with warning indicator', async () => {
    const result = makeResult({
      groups: {
        EXIF: [{ key: 'GPSLatitude', label: 'Latitude', value: '51.5', sensitive: true }],
      },
    });
    render(<MetadataView result={result} filename="photo.jpg" />);
    // Sensitive label in expanded group
    expect(screen.getByText(/1 sensitive/)).toBeDefined();
  });

  it('shows file size in human-readable format', () => {
    const result = makeResult({ sizeBytes: 1024 * 50 }); // 50 KB
    render(<MetadataView result={result} filename="test.jpg" />);
    expect(screen.getByText(/50\.0 KB/)).toBeDefined();
  });

  it('toggles namespace group open/closed on click', async () => {
    const user = userEvent.setup();
    const result = makeResult({
      groups: {
        EXIF: [{ key: 'Software', label: 'Software', value: 'Lightroom', sensitive: false }],
      },
    });
    render(<MetadataView result={result} filename="test.jpg" />);

    // First group is open; value is visible
    expect(screen.getByText('Lightroom')).toBeDefined();

    // Click the EXIF header to collapse
    const exifButton = screen.getByRole('button', { name: /EXIF/ });
    await user.click(exifButton);

    // Value should be hidden
    expect(screen.queryByText('Lightroom')).toBeNull();

    // Click again to expand
    await user.click(exifButton);
    expect(screen.getByText('Lightroom')).toBeDefined();
  });
});
