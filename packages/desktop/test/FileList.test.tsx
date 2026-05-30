import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileList, type QueuedFile } from '../src/components/FileList.js';
import type { RecentFile } from '../src/lib/store.js';

const EMPTY_HANDLERS = {
  onSelectFile: vi.fn(),
  onDropFiles: vi.fn(),
  onPickFiles: vi.fn(),
  onSelectRecent: vi.fn(),
};

const SAMPLE_FILES: QueuedFile[] = [
  { path: '/tmp/photo.jpg', name: 'photo.jpg', sizeBytes: 2048 },
  { path: '/tmp/report.pdf', name: 'report.pdf', sizeBytes: 1_048_576 },
];

const SAMPLE_RECENT: RecentFile[] = [
  {
    path: '/tmp/old.png',
    name: 'old.png',
    format: 'png',
    sizeBytes: 512,
    openedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('FileList', () => {
  it('renders the drop zone', () => {
    render(
      <FileList
        files={[]}
        selectedPath={null}
        recentFiles={[]}
        {...EMPTY_HANDLERS}
      />,
    );
    expect(screen.getByRole('region', { name: /file drop zone/i })).toBeInTheDocument();
  });

  it('shows "no files" empty state when queue and recent are empty', () => {
    render(
      <FileList
        files={[]}
        selectedPath={null}
        recentFiles={[]}
        {...EMPTY_HANDLERS}
      />,
    );
    expect(screen.getByText(/No files yet/i)).toBeInTheDocument();
  });

  it('renders queued files', () => {
    render(
      <FileList
        files={SAMPLE_FILES}
        selectedPath={null}
        recentFiles={[]}
        {...EMPTY_HANDLERS}
      />,
    );
    expect(screen.getByText('photo.jpg')).toBeInTheDocument();
    expect(screen.getByText('report.pdf')).toBeInTheDocument();
  });

  it('calls onSelectFile when a file is clicked', () => {
    const onSelectFile = vi.fn();
    render(
      <FileList
        files={SAMPLE_FILES}
        selectedPath={null}
        recentFiles={[]}
        {...EMPTY_HANDLERS}
        onSelectFile={onSelectFile}
      />,
    );
    fireEvent.click(screen.getByText('photo.jpg'));
    expect(onSelectFile).toHaveBeenCalledWith(SAMPLE_FILES[0]);
  });

  it('highlights the selected file', () => {
    render(
      <FileList
        files={SAMPLE_FILES}
        selectedPath="/tmp/photo.jpg"
        recentFiles={[]}
        {...EMPTY_HANDLERS}
      />,
    );
    // The selected button should have blue styling class
    const btn = screen.getByTitle('/tmp/photo.jpg');
    expect(btn.className).toMatch(/blue/);
  });

  it('renders recent files section', () => {
    render(
      <FileList
        files={[]}
        selectedPath={null}
        recentFiles={SAMPLE_RECENT}
        {...EMPTY_HANDLERS}
      />,
    );
    expect(screen.getByText('old.png')).toBeInTheDocument();
    expect(screen.getByText(/recent/i)).toBeInTheDocument();
  });

  it('calls onSelectRecent when a recent file is clicked', () => {
    const onSelectRecent = vi.fn();
    render(
      <FileList
        files={[]}
        selectedPath={null}
        recentFiles={SAMPLE_RECENT}
        {...EMPTY_HANDLERS}
        onSelectRecent={onSelectRecent}
      />,
    );
    fireEvent.click(screen.getByText('old.png'));
    expect(onSelectRecent).toHaveBeenCalledWith(SAMPLE_RECENT[0]);
  });

  it('calls onPickFiles when the drop zone is clicked', () => {
    const onPickFiles = vi.fn();
    render(
      <FileList
        files={[]}
        selectedPath={null}
        recentFiles={[]}
        {...EMPTY_HANDLERS}
        onPickFiles={onPickFiles}
      />,
    );
    fireEvent.click(screen.getByRole('region', { name: /file drop zone/i }));
    expect(onPickFiles).toHaveBeenCalledTimes(1);
  });

  it('shows drag feedback text when dragging over', () => {
    render(
      <FileList
        files={[]}
        selectedPath={null}
        recentFiles={[]}
        {...EMPTY_HANDLERS}
      />,
    );
    const zone = screen.getByRole('region', { name: /file drop zone/i });
    fireEvent.dragOver(zone, { dataTransfer: { items: [] } });
    expect(screen.getByText('Drop here')).toBeInTheDocument();
  });
});
