import { describe, it, expect, vi } from 'vitest';
import { scanVault, SUPPORTED_EXTENSIONS } from '../src/scanner';
import type { VaultFile, VaultReader } from '../src/scanner';

// ─── Minimal synthetic bytes per format ───────────────────────────────────────
// These are invalid files, so parse() will throw or return no warnings.
// We use a mock of parse() instead to keep the test hermetic.

vi.mock('@metascrub/core', () => {
  const parse = vi.fn(async (_input: { kind: string; data: Uint8Array; filename: string }) => {
    // Files with "gps" in the name get a warning; others don't.
    const filename = _input.filename ?? '';
    return {
      format: 'jpeg' as const,
      filename,
      sizeBytes: _input.data.length,
      groups: {},
      highlights: {},
      warnings: filename.includes('gps') ? ['GPS coordinates found'] : [],
    };
  });

  return { parse, scrub: vi.fn() };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeFile(path: string): VaultFile {
  const ext = path.split('.').pop() ?? '';
  return { path, extension: ext };
}

function makeReader(files: VaultFile[]): VaultReader {
  return {
    readBinary: async (f) => {
      if (!files.some((vf) => vf.path === f.path)) {
        throw new Error(`File not found: ${f.path}`);
      }
      return new Uint8Array(4).buffer;
    },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SUPPORTED_EXTENSIONS', () => {
  it('includes common image and document formats', () => {
    for (const ext of ['jpg', 'jpeg', 'png', 'pdf', 'docx', 'svg', 'mp4']) {
      expect(SUPPORTED_EXTENSIONS.has(ext)).toBe(true);
    }
  });

  it('excludes non-media extensions', () => {
    for (const ext of ['md', 'txt', 'json', 'ts', 'css']) {
      expect(SUPPORTED_EXTENSIONS.has(ext)).toBe(false);
    }
  });
});

describe('scanVault', () => {
  it('returns only files with warnings', async () => {
    const files = [
      makeFile('photos/gps-photo.jpg'),
      makeFile('docs/clean-report.pdf'),
      makeFile('photos/gps-holiday.png'),
      makeFile('notes.md'),          // not an attachment
      makeFile('data.txt'),          // not supported
    ];
    const reader = makeReader(files);
    const results = await scanVault(files, reader);

    expect(results).toHaveLength(2);
    expect(results.map((r) => r.path)).toEqual([
      'photos/gps-photo.jpg',
      'photos/gps-holiday.png',
    ]);
  });

  it('returns empty array when no files have warnings', async () => {
    const files = [
      makeFile('photos/clean.jpg'),
      makeFile('docs/report.pdf'),
    ];
    const reader = makeReader(files);
    const results = await scanVault(files, reader);
    expect(results).toHaveLength(0);
  });

  it('skips unsupported file extensions silently', async () => {
    const files = [
      makeFile('note.md'),
      makeFile('script.js'),
      makeFile('photo.jpg'),  // supported; no "gps" in name → no warning
    ];
    const reader = makeReader(files);
    const results = await scanVault(files, reader);
    expect(results).toHaveLength(0);
  });

  it('skips files that throw during read', async () => {
    const files = [makeFile('broken.jpg')];
    const reader: VaultReader = {
      readBinary: async () => {
        throw new Error('vault read failed');
      },
    };
    const results = await scanVault(files, reader);
    expect(results).toHaveLength(0);
  });

  it('reports progress via callback', async () => {
    const files = [
      makeFile('gps-a.jpg'),
      makeFile('gps-b.jpg'),
    ];
    const reader = makeReader(files);
    const progress: Array<{ total: number; done: number }> = [];

    await scanVault(files, reader, (p) => progress.push({ total: p.total, done: p.done }));

    expect(progress[0]).toMatchObject({ total: 2, done: 0 });
    const last = progress[progress.length - 1];
    expect(last).toMatchObject({ total: 2, done: 2 });
  });

  it('handles an empty vault', async () => {
    const results = await scanVault([], makeReader([]), undefined);
    expect(results).toHaveLength(0);
  });

  it('case-insensitive extension matching', async () => {
    const files = [
      makeFile('gps-PHOTO.JPG'),
      makeFile('gps-doc.PDF'),
    ];
    const reader = makeReader(files);
    const results = await scanVault(files, reader);
    expect(results).toHaveLength(2);
  });
});
