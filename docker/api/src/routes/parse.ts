import type { Context } from 'hono';
import { parse, MetaScrubError } from '@metascrub/core';
import { readMultipartFile } from '../utils/multipart.js';

export async function parseRoute(c: Context, maxBytes: number): Promise<Response> {
  const result = await readMultipartFile(c, 'file', maxBytes);
  if ('error' in result) {
    return c.json({ error: result.error }, result.status) as unknown as Response;
  }

  try {
    const metadata = await parse({
      kind: 'bytes',
      data: result.data,
      filename: result.filename,
    });
    return c.json(metadata) as unknown as Response;
  } catch (err) {
    if (err instanceof MetaScrubError && err.code === 'UNSUPPORTED_FORMAT') {
      return c.json({ error: err.message }, 415) as unknown as Response;
    }
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: msg }, 500) as unknown as Response;
  }
}
