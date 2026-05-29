import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadBytes } from '../src/lib/download.js';

describe('downloadBytes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chrome runtime error state
    (globalThis.chrome.runtime as { lastError: null | { message: string } }).lastError = null;
    // Ensure URL.createObjectURL returns a consistent value
    vi.mocked(globalThis.URL.createObjectURL).mockReturnValue('blob:mock-url');
    // Ensure chrome.downloads.download calls the callback with a valid download ID
    vi.mocked(globalThis.chrome.downloads.download).mockImplementation(
      (_opts: unknown, callback?: (id: number) => void) => {
        if (callback) callback(42);
      },
    );
  });

  it('calls chrome.downloads.download with blob URL and filename', async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    await downloadBytes(bytes, 'test-cleaned.jpg');

    expect(chrome.downloads.download).toHaveBeenCalledWith(
      {
        url: 'blob:mock-url',
        filename: 'test-cleaned.jpg',
        saveAs: false,
      },
      expect.any(Function),
    );
  });

  it('revokes the blob URL after download', async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    await downloadBytes(bytes, 'test.jpg');

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('rejects when chrome.runtime.lastError is set', async () => {
    vi.mocked(globalThis.chrome.downloads.download).mockImplementationOnce(
      (_opts: unknown, callback?: (id: number | undefined) => void) => {
        (globalThis.chrome.runtime as { lastError: { message: string } | null }).lastError = {
          message: 'Download failed: insufficient permissions',
        };
        if (callback) callback(undefined);
        (globalThis.chrome.runtime as { lastError: null }).lastError = null;
      },
    );

    await expect(downloadBytes(new Uint8Array([1]), 'file.jpg')).rejects.toThrow(
      'Download failed: insufficient permissions',
    );
  });

  it('creates a Blob from the provided Uint8Array', async () => {
    const createObjectURLSpy = vi.mocked(URL.createObjectURL);
    const bytes = new Uint8Array([0xff, 0xd8, 0xff]);

    await downloadBytes(bytes, 'photo.jpg');

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    const blob = createObjectURLSpy.mock.calls[0]?.[0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
  });
});
