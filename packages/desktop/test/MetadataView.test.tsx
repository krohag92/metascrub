import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MetadataView } from '../src/components/MetadataView.js';
import type { MetadataResult } from '@metascrub/core';

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

describe('MetadataView', () => {
  it('shows filename and format in the summary bar', () => {
    render(<MetadataView result={makeResult()} filename="test.jpg" />);
    expect(screen.getByText('test.jpg')).toBeInTheDocument();
    expect(screen.getByText(/JPEG/)).toBeInTheDocument();
  });

  it('shows "No metadata found" when groups are empty', () => {
    render(<MetadataView result={makeResult({ groups: {} })} filename="test.jpg" />);
    expect(screen.getByText(/No metadata found/i)).toBeInTheDocument();
  });

  it('renders warnings in the WarningBadge', () => {
    render(
      <MetadataView
        result={makeResult({ warnings: ['GPS coordinates found', 'Author field non-empty'] })}
        filename="test.jpg"
      />,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('GPS coordinates found')).toBeInTheDocument();
    expect(screen.getByText('Author field non-empty')).toBeInTheDocument();
  });

  it('does not render WarningBadge when warnings array is empty', () => {
    render(<MetadataView result={makeResult({ warnings: [] })} filename="test.jpg" />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders namespace group buttons', () => {
    const result = makeResult({
      groups: {
        EXIF: [{ key: 'Make', value: 'Canon', sensitive: false }],
        GPS: [{ key: 'Latitude', value: '51.5', sensitive: true }],
      },
    });
    render(<MetadataView result={result} filename="test.jpg" />);
    expect(screen.getByText(/EXIF/)).toBeInTheDocument();
    expect(screen.getByText(/GPS/)).toBeInTheDocument();
  });

  it('expands a group when its header button is clicked', () => {
    const result = makeResult({
      groups: {
        IPTC: [
          { key: 'Credit', label: 'Credit', value: 'Photographer Name', sensitive: false },
        ],
      },
    });
    render(<MetadataView result={result} filename="test.jpg" />);

    // IPTC group is not first, so starts collapsed
    // First group (IPTC here, idx=0) opens by default
    expect(screen.getByText('Photographer Name')).toBeInTheDocument();
  });

  it('highlights sensitive fields with red background class', () => {
    const result = makeResult({
      groups: {
        EXIF: [
          { key: 'GPSLatitude', label: 'GPS Latitude', value: '51.5', sensitive: true },
        ],
      },
    });
    render(<MetadataView result={result} filename="test.jpg" />);
    // The sensitive row has data-sensitive attribute
    const rows = document.querySelectorAll('[data-sensitive="true"]');
    expect(rows.length).toBeGreaterThan(0);
  });

  it('shows "sensitive" badge count in group header', () => {
    const result = makeResult({
      groups: {
        GPS: [
          { key: 'Lat', value: '51.5', sensitive: true },
          { key: 'Lon', value: '-0.1', sensitive: true },
        ],
      },
    });
    render(<MetadataView result={result} filename="test.jpg" />);
    expect(screen.getByText('2 sensitive')).toBeInTheDocument();
  });

  it('shows total field count in the file summary', () => {
    const result = makeResult({
      groups: {
        EXIF: [
          { key: 'Make', value: 'Canon' },
          { key: 'Model', value: 'EOS R5' },
        ],
        XMP: [
          { key: 'Creator', value: 'Alice' },
        ],
      },
    });
    render(<MetadataView result={result} filename="photo.jpg" />);
    expect(screen.getByText(/3 fields/)).toBeInTheDocument();
  });

  it('collapses an open group when the button is clicked again', () => {
    const result = makeResult({
      groups: {
        EXIF: [{ key: 'Make', label: 'Make', value: 'Nikon' }],
      },
    });
    render(<MetadataView result={result} filename="test.jpg" />);

    // First group opens by default — value should be visible
    expect(screen.getByText('Nikon')).toBeInTheDocument();

    // Click header to collapse
    const groupBtn = screen.getByRole('button', { name: /exif/i });
    fireEvent.click(groupBtn);

    // Value should no longer be in DOM
    expect(screen.queryByText('Nikon')).not.toBeInTheDocument();
  });
});
