import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Warning } from '../src/components/Warning.js';
import { MetadataGroup } from '../src/components/MetadataGroup.js';
import { PresetPicker } from '../src/components/PresetPicker.js';
import { TabBar } from '../src/components/TabBar.js';
import { RecentFilesList } from '../src/components/RecentFilesList.js';
import type { MetadataField } from '@metascrub/core';

// ---- Warning ---------------------------------------------------------------

describe('Warning', () => {
  it('renders nothing when there are no warnings', () => {
    const { container } = render(<Warning warnings={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a single warning with correct text', () => {
    render(<Warning warnings={['GPS coordinates found']} />);
    expect(screen.getByText('1 warning')).toBeInTheDocument();
    expect(screen.getByText('GPS coordinates found')).toBeInTheDocument();
  });

  it('renders multiple warnings with plural label', () => {
    render(<Warning warnings={['GPS found', 'Author field set', 'Serial number present']} />);
    expect(screen.getByText('3 warnings')).toBeInTheDocument();
  });

  it('has role="alert" for accessibility', () => {
    render(<Warning warnings={['Test warning']} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

// ---- MetadataGroup ---------------------------------------------------------

const SAMPLE_FIELDS: MetadataField[] = [
  { key: 'Make', label: 'Camera Make', value: 'Apple', sensitive: false },
  { key: 'GPSLatitude', label: 'GPS Latitude', value: '37.7749', sensitive: true },
  { key: 'Model', label: 'Camera Model', value: 'iPhone 15', sensitive: false },
];

describe('MetadataGroup', () => {
  it('renders the namespace name', () => {
    render(<MetadataGroup namespace="EXIF" fields={SAMPLE_FIELDS} />);
    expect(screen.getByText('EXIF')).toBeInTheDocument();
  });

  it('shows field count', () => {
    render(<MetadataGroup namespace="EXIF" fields={SAMPLE_FIELDS} />);
    expect(screen.getByText('(3)')).toBeInTheDocument();
  });

  it('shows sensitive count badge', () => {
    render(<MetadataGroup namespace="EXIF" fields={SAMPLE_FIELDS} />);
    expect(screen.getByText('1 sensitive')).toBeInTheDocument();
  });

  it('is collapsed by default', () => {
    render(<MetadataGroup namespace="EXIF" fields={SAMPLE_FIELDS} />);
    expect(screen.queryByText('Camera Make')).not.toBeInTheDocument();
  });

  it('expands when defaultOpen is true', () => {
    render(<MetadataGroup namespace="EXIF" fields={SAMPLE_FIELDS} defaultOpen />);
    expect(screen.getByText('Camera Make')).toBeInTheDocument();
    expect(screen.getByText('Apple')).toBeInTheDocument();
  });

  it('expands and collapses on header click', () => {
    render(<MetadataGroup namespace="EXIF" fields={SAMPLE_FIELDS} />);
    const button = screen.getByRole('button', { expanded: false });
    fireEvent.click(button);
    expect(screen.getByText('Camera Make')).toBeInTheDocument();
    fireEvent.click(button);
    expect(screen.queryByText('Camera Make')).not.toBeInTheDocument();
  });

  it('highlights sensitive fields when expanded', () => {
    render(<MetadataGroup namespace="EXIF" fields={SAMPLE_FIELDS} defaultOpen />);
    // The GPS Latitude field should have "sensitive" class on its row
    const sensitiveRows = document.querySelectorAll('.metadata-field-sensitive');
    expect(sensitiveRows.length).toBe(1);
  });
});

// ---- PresetPicker ----------------------------------------------------------

describe('PresetPicker', () => {
  it('renders all four preset options', () => {
    const onChange = vi.fn();
    render(<PresetPicker selected="all" onChange={onChange} />);
    expect(screen.getByText('Remove all')).toBeInTheDocument();
    expect(screen.getByText('GPS only')).toBeInTheDocument();
    expect(screen.getByText('Personal info')).toBeInTheDocument();
    expect(screen.getByText('Keep technical')).toBeInTheDocument();
  });

  it('marks the selected preset as checked', () => {
    render(<PresetPicker selected="gps-only" onChange={vi.fn()} />);
    const radios = screen.getAllByRole('radio');
    const gpsRadio = radios.find((r) => (r as HTMLInputElement).value === 'gps-only');
    expect(gpsRadio).toBeChecked();
  });

  it('calls onChange when a preset is clicked', () => {
    const onChange = vi.fn();
    render(<PresetPicker selected="all" onChange={onChange} />);
    const personalRadio = screen.getAllByRole('radio').find(
      (r) => (r as HTMLInputElement).value === 'personal-only'
    );
    fireEvent.click(personalRadio!);
    expect(onChange).toHaveBeenCalledWith('personal-only');
  });

  it('shows "removes" preview for the selected preset', () => {
    render(<PresetPicker selected="gps-only" onChange={vi.fn()} />);
    // The "removes" div text contains "GPS coordinates" and is inside ".preset-removes"
    const removesEl = document.querySelector('.preset-removes');
    expect(removesEl).not.toBeNull();
    expect(removesEl?.textContent).toMatch(/GPS coordinates/);
  });

  it('has a radiogroup role for accessibility', () => {
    render(<PresetPicker selected="all" onChange={vi.fn()} />);
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });
});

// ---- TabBar ----------------------------------------------------------------

describe('TabBar', () => {
  it('renders three tabs', () => {
    render(<TabBar active="home" />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBe(3);
  });

  it('marks the active tab as selected', () => {
    render(<TabBar active="settings" />);
    const settingsTab = screen.getByRole('tab', { name: 'Settings' });
    expect(settingsTab).toHaveAttribute('aria-selected', 'true');
  });

  it('does not mark inactive tabs as selected', () => {
    render(<TabBar active="home" />);
    const scrubTab = screen.getByRole('tab', { name: 'Scrub' });
    const settingsTab = screen.getByRole('tab', { name: 'Settings' });
    expect(scrubTab).toHaveAttribute('aria-selected', 'false');
    expect(settingsTab).toHaveAttribute('aria-selected', 'false');
  });

  it('renders Home, Scrub, and Settings labels', () => {
    render(<TabBar active="scrub" />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Scrub')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('applies active CSS class to the active tab only', () => {
    render(<TabBar active="scrub" />);
    const scrubTab = screen.getByRole('tab', { name: 'Scrub' });
    expect(scrubTab).toHaveClass('tab-button-active');
    const homeTab = screen.getByRole('tab', { name: 'Home' });
    expect(homeTab).not.toHaveClass('tab-button-active');
  });
});

// ---- RecentFilesList -------------------------------------------------------

describe('RecentFilesList', () => {
  it('renders empty state when no files', () => {
    render(<RecentFilesList files={[]} />);
    expect(screen.getByText('No files yet')).toBeInTheDocument();
    expect(screen.getByText(/Pick a file/)).toBeInTheDocument();
  });

  it('renders a list of files', () => {
    const files = [
      {
        name: 'photo.jpg',
        path: '/Documents/photo.jpg',
        format: 'jpeg',
        sizeBytes: 204800,
        processedAt: new Date().toISOString(),
        scrubbed: false,
      },
      {
        name: 'report.pdf',
        path: '/Documents/report.pdf',
        format: 'pdf',
        sizeBytes: 512000,
        processedAt: new Date().toISOString(),
        scrubbed: true,
      },
    ];
    render(<RecentFilesList files={files} />);
    expect(screen.getByText('photo.jpg')).toBeInTheDocument();
    expect(screen.getByText('report.pdf')).toBeInTheDocument();
  });

  it('shows "Scrubbed" indicator for scrubbed files', () => {
    const files = [
      {
        name: 'clean.jpg',
        path: '/Documents/clean.jpg',
        format: 'jpeg',
        sizeBytes: 100000,
        processedAt: new Date().toISOString(),
        scrubbed: true,
      },
    ];
    render(<RecentFilesList files={files} />);
    // The scrubbed badge text includes a leading separator: "· Scrubbed"
    expect(screen.getByText(/Scrubbed/)).toBeInTheDocument();
  });

  it('does not show scrubbed indicator for unprocessed files', () => {
    const files = [
      {
        name: 'original.jpg',
        path: '/Documents/original.jpg',
        format: 'jpeg',
        sizeBytes: 100000,
        processedAt: new Date().toISOString(),
        scrubbed: false,
      },
    ];
    render(<RecentFilesList files={files} />);
    expect(screen.queryByText('Scrubbed')).not.toBeInTheDocument();
  });

  it('has an accessible list label', () => {
    const files = [
      {
        name: 'test.jpg',
        path: '/test.jpg',
        format: 'jpeg',
        sizeBytes: 1024,
        processedAt: new Date().toISOString(),
        scrubbed: false,
      },
    ];
    render(<RecentFilesList files={files} />);
    expect(screen.getByRole('list', { name: /recently processed/i })).toBeInTheDocument();
  });
});
