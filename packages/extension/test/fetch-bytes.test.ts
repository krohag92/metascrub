import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchBytes } from '../src/lib/fetch-bytes.js';

describe('fetchBytes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns Uint8Array from a successful fetch', async () => {
    const mockData = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      arrayBuffer: vi.fn().mockResolvedValue(mockData.buffer),
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    const result = await fetchBytes('https://example.com/photo.jpg');

    expect(result).toBeInstanceOf(Uint8Array);
    expect(Array.from(result)).toEqual([0xff, 0xd8, 0xff, 0xe0]);
    expect(fetch).toHaveBeenCalledWith('https://example.com/photo.jpg');
  });

  it('throws on non-OK response', async () => {
    const mockResponse = {
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    await expect(fetchBytes('https://example.com/private.jpg')).rejects.toThrow('403');
  });

  it('throws on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(fetchBytes('https://example.com/photo.jpg')).rejects.toThrow('Failed to fetch');
  });

  it('handles empty response body', async () => {
    const emptyBuffer = new ArrayBuffer(0);
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      arrayBuffer: vi.fn().mockResolvedValue(emptyBuffer),
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    const result = await fetchBytes('https://example.com/empty.jpg');
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(0);
  });
});
