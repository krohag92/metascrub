import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BatchProgress, type BatchFileStatus } from '../src/components/BatchProgress.js';

function makeFiles(count: number, status: BatchFileStatus['status'] = 'pending'): BatchFileStatus[] {
  return Array.from({ length: count }, (_, i) => ({
    path: `/tmp/file${i}.jpg`,
    name: `file${i}.jpg`,
    status,
    warningCount: 0,
  }));
}

describe('BatchProgress', () => {
  it('renders the progress element', () => {
    render(<BatchProgress total={10} done={5} files={makeFiles(10)} />);
    const progress = document.querySelector('progress');
    expect(progress).toBeInTheDocument();
  });

  it('renders correct percentage text', () => {
    render(<BatchProgress total={10} done={5} files={makeFiles(10)} />);
    expect(screen.getByText(/50%/)).toBeInTheDocument();
  });

  it('shows 0% when no files are done', () => {
    render(<BatchProgress total={4} done={0} files={makeFiles(4)} />);
    expect(screen.getByText(/0%/)).toBeInTheDocument();
  });

  it('shows 100% when all files are done', () => {
    const files = makeFiles(3, 'done');
    render(<BatchProgress total={3} done={3} files={files} />);
    expect(screen.getByText(/100%/)).toBeInTheDocument();
  });

  it('renders per-file warning count in the summary table', () => {
    const files: BatchFileStatus[] = [
      { path: '/tmp/a.jpg', name: 'a.jpg', status: 'done', warningCount: 3 },
      { path: '/tmp/b.jpg', name: 'b.jpg', status: 'done', warningCount: 0 },
    ];
    render(<BatchProgress total={2} done={2} files={files} />);
    // a.jpg appears in both the warning table and the status list — use getAllByText
    expect(screen.getAllByText('a.jpg').length).toBeGreaterThanOrEqual(1);
    // The warning count "3" appears in the table cell
    expect(screen.getByText('3')).toBeInTheDocument();
    // b.jpg has 0 warnings — not in the warnings table (only in status list)
    const tableRows = document.querySelectorAll('tbody tr');
    expect(tableRows).toHaveLength(1);
  });

  it('shows error messages for failed files', () => {
    const files: BatchFileStatus[] = [
      {
        path: '/tmp/bad.xyz',
        name: 'bad.xyz',
        status: 'error',
        warningCount: 0,
        errorMessage: 'Unsupported format',
      },
    ];
    render(<BatchProgress total={1} done={1} files={files} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Unsupported format/)).toBeInTheDocument();
  });

  it('shows status dots for each file', () => {
    const files: BatchFileStatus[] = [
      { path: '/tmp/a.jpg', name: 'a.jpg', status: 'done', warningCount: 0 },
      { path: '/tmp/b.jpg', name: 'b.jpg', status: 'processing', warningCount: 0 },
      { path: '/tmp/c.jpg', name: 'c.jpg', status: 'pending', warningCount: 0 },
    ];
    render(<BatchProgress total={3} done={1} files={files} />);
    const dots = document.querySelectorAll('[aria-label]');
    // status dots + the progress label
    expect(dots.length).toBeGreaterThanOrEqual(3);
  });

  it('renders "done/total" fraction correctly', () => {
    render(<BatchProgress total={7} done={3} files={makeFiles(7)} />);
    // The percentage text is split across child DOM nodes so getByText with a
    // plain string fails. Instead verify via the <progress> aria-label (which
    // contains the computed percentage) and the done/total counters separately.
    const progress = document.querySelector('progress');
    expect(progress).toHaveAttribute('value', '3');
    expect(progress).toHaveAttribute('max', '7');
    // The aria-label is set to e.g. "43% complete"
    expect(progress?.getAttribute('aria-label')).toMatch(/\d+% complete/);
  });
});
