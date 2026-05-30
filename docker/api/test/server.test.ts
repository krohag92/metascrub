/**
 * Integration tests for the MetaScrub HTTP API server.
 *
 * Tests use Hono's `app.fetch()` directly (no TCP port needed), which means
 * they run without a running server and without any Node-specific server code.
 */

import { describe, it, expect } from 'vitest';

// We import the app with NODE_ENV=test so the server listener is not started.
process.env['NODE_ENV'] = 'test';

import { app } from '../src/server.js';

// ---------------------------------------------------------------------------
// Fixture builders — reuse the helpers from the core package.
// We import them via relative path because the API package is a sibling in
// the monorepo and the helpers are not part of the published core bundle.
// ---------------------------------------------------------------------------

// Build-time path: ../../packages/core/test/helpers/build-jpeg.ts
// At runtime the test runner resolves from the worktree root.
import { makeJpeg } from '../../packages/core/test/helpers/build-jpeg.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFormData(
  field: string,
  bytes: Uint8Array,
  filename: string,
  extra?: Record<string, string>,
): FormData {
  const form = new FormData();
  form.append(field, new Blob([bytes]), filename);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) form.append(k, v);
  }
  return form;
}

async function postForm(path: string, form: FormData): Promise<Response> {
  return app.fetch(new Request(`http://localhost${path}`, { method: 'POST', body: form }));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /health', () => {
  it('returns 200 with { ok: true }', async () => {
    const res = await app.fetch(new Request('http://localhost/health'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });
});

describe('GET /formats', () => {
  it('returns a formats list with at least 25 entries', async () => {
    const res = await app.fetch(new Request('http://localhost/formats'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { formats: string[]; count: number };
    expect(Array.isArray(body.formats)).toBe(true);
    expect(body.count).toBeGreaterThanOrEqual(25);
    expect(body.formats.length).toBe(body.count);
  });

  it('formats list includes jpeg, png, pdf, docx', async () => {
    const res = await app.fetch(new Request('http://localhost/formats'));
    const body = (await res.json()) as { formats: string[] };
    for (const fmt of ['jpeg', 'png', 'pdf', 'docx']) {
      expect(body.formats).toContain(fmt);
    }
  });
});

describe('POST /parse', () => {
  it('parses a synthetic JPEG and returns MetadataResult', async () => {
    const jpeg = makeJpeg({ make: 'TestCam', model: 'Model-X', orientation: 1 });
    const form = makeFormData('file', jpeg, 'test.jpg');
    const res = await postForm('/parse', form);

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      format: string;
      groups: Record<string, unknown[]>;
      warnings: string[];
    };
    expect(body.format).toBe('jpeg');
    expect(body.groups).toBeDefined();
    expect(typeof body.warnings).toBe('object');
    // Make/Model should be in EXIF group
    const exif = body.groups['EXIF'] as Array<{ key: string; value: unknown }> | undefined;
    expect(exif).toBeDefined();
    const makeField = exif?.find((f) => f.key === 'Make');
    expect(makeField?.value).toBe('TestCam');
  });

  it('parses GPS coordinates from a JPEG and includes warnings', async () => {
    const jpeg = makeJpeg({ gps: { lat: 51.5074, lon: -0.1278 } });
    const form = makeFormData('file', jpeg, 'gps.jpg');
    const res = await postForm('/parse', form);

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      highlights: { gps?: { lat: number; lon: number } };
      warnings: string[];
    };
    expect(body.highlights.gps).toBeDefined();
    expect(body.highlights.gps?.lat).toBeCloseTo(51.5074, 1);
    expect(body.warnings.some((w) => w.toLowerCase().includes('gps'))).toBe(true);
  });

  it('returns 400 when no file field is provided', async () => {
    const form = new FormData();
    const res = await postForm('/parse', form);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(typeof body.error).toBe('string');
  });

  it('returns 415 for an unsupported format', async () => {
    // Submit a file with no recognisable format (random bytes).
    const random = new Uint8Array(64).fill(0xaa);
    const form = makeFormData('file', random, 'unknown.xyz');
    const res = await postForm('/parse', form);
    expect(res.status).toBe(415);
    const body = (await res.json()) as { error: string };
    expect(typeof body.error).toBe('string');
  });

  it('returns 413 when the file exceeds the configured size limit', async () => {
    // Build a blob larger than the current limit (default 100 MB).
    // We set a tiny env limit for this test by using the internal helper.
    const { parseMaxFileSize } = await import('../src/server.js');
    const tiny = parseMaxFileSize('1b'); // 1 byte limit
    // Use a fresh app import scoped to 1 byte — instead, test the multipart
    // helper directly via a fake context.
    // Since we can't easily override MAX_FILE_BYTES at runtime, we test the
    // parseMaxFileSize helper and then simulate the 413 path via a request
    // that would exceed the actual configured limit.
    // The default limit is 100 MB; generating >100 MB in a unit test is
    // impractical, so we verify the parser and rely on the route-level unit
    // path exercised in a separate integration.
    expect(tiny).toBe(1);

    // For the actual 413 integration path, spin up the route with a 10-byte limit.
    const { scrubRoute } = await import('../src/routes/scrub.js');
    const jpeg = makeJpeg({ make: 'X' }); // > 10 bytes
    const form = makeFormData('file', jpeg, 'big.jpg');

    // Build a minimal fake Hono context to pass maxBytes=10.
    const req = new Request('http://localhost/scrub', { method: 'POST', body: form });
    const { Hono: HonoClass } = await import('hono');
    const tiny2 = new HonoClass();
    tiny2.post('/scrub', (c) => scrubRoute(c, 10));
    const res2 = await tiny2.fetch(req);
    expect(res2.status).toBe(413);
  });
});

describe('POST /scrub', () => {
  it('scrubs a JPEG and returns a valid JPEG binary', async () => {
    const jpeg = makeJpeg({ make: 'Sony', gps: { lat: 48.8566, lon: 2.3522 }, artist: 'Bob' });
    const form = makeFormData('file', jpeg, 'photo.jpg', { preset: 'all' });
    const res = await postForm('/scrub', form);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('image/jpeg');

    const buf = new Uint8Array(await res.arrayBuffer());
    // Starts with SOI and ends with EOI
    expect(buf[0]).toBe(0xff);
    expect(buf[1]).toBe(0xd8);
    expect(buf[buf.length - 2]).toBe(0xff);
    expect(buf[buf.length - 1]).toBe(0xd9);
  });

  it('round-trip: scrubbed JPEG has no GPS when parsed again', async () => {
    const jpeg = makeJpeg({ gps: { lat: 40.7128, lon: -74.006 } });
    const form = makeFormData('file', jpeg, 'nogps.jpg', { preset: 'all' });
    const scrubRes = await postForm('/scrub', form);
    expect(scrubRes.status).toBe(200);

    const scrubbed = new Uint8Array(await scrubRes.arrayBuffer());
    const parseForm = makeFormData('file', scrubbed, 'nogps.jpg');
    const parseRes = await postForm('/parse', parseForm);
    expect(parseRes.status).toBe(200);

    const parsed = (await parseRes.json()) as { highlights: { gps?: unknown } };
    expect(parsed.highlights.gps).toBeUndefined();
  });

  it('returns 415 for an unsupported format in scrub', async () => {
    const random = new Uint8Array(64).fill(0xbb);
    const form = makeFormData('file', random, 'data.bin');
    const res = await postForm('/scrub', form);
    expect(res.status).toBe(415);
  });
});

describe('POST /compare', () => {
  it('returns a MetadataDiff between two different JPEGs', async () => {
    const a = makeJpeg({ make: 'Canon', model: 'R5' });
    const b = makeJpeg({ make: 'Nikon', model: 'Z9' });
    const form = new FormData();
    form.append('a', new Blob([a]), 'a.jpg');
    form.append('b', new Blob([b]), 'b.jpg');
    const res = await postForm('/compare', form);

    expect(res.status).toBe(200);
    const diff = (await res.json()) as {
      onlyInA: unknown[];
      onlyInB: unknown[];
      changed: unknown[];
    };
    expect(Array.isArray(diff.onlyInA)).toBe(true);
    expect(Array.isArray(diff.onlyInB)).toBe(true);
    expect(Array.isArray(diff.changed)).toBe(true);
    // Make/Model changed between a and b.
    const changedKeys = (diff.changed as Array<{ a: { key: string } }>).map((c) => c.a.key);
    expect(changedKeys).toContain('Make');
  });

  it('returns 400 when field "a" is missing', async () => {
    const b = makeJpeg({ make: 'Nikon' });
    const form = new FormData();
    form.append('b', new Blob([b]), 'b.jpg');
    const res = await postForm('/compare', form);
    expect(res.status).toBe(400);
  });
});

describe('parseMaxFileSize helper', () => {
  it('parses "100mb" correctly', async () => {
    const { parseMaxFileSize } = await import('../src/server.js');
    expect(parseMaxFileSize('100mb')).toBe(100 * 1024 * 1024);
  });
  it('parses "1gb" correctly', async () => {
    const { parseMaxFileSize } = await import('../src/server.js');
    expect(parseMaxFileSize('1gb')).toBe(1024 ** 3);
  });
  it('falls back to 100 MB on garbage input', async () => {
    const { parseMaxFileSize } = await import('../src/server.js');
    expect(parseMaxFileSize('notanumber')).toBe(100 * 1024 * 1024);
  });
});
