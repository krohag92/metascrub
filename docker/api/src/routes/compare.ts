import type { Context } from 'hono';
import { compare, MetaScrubError } from '@metascrub/core';
import { readMultipartFile } from '../utils/multipart.js';

export async function compareRoute(c: Context, maxBytes: number): Promise<Response> {
  const [resultA, resultB] = await Promise.all([
    readMultipartFile(c, 'a', maxBytes),
    readMultipartFile(c, 'b', maxBytes),
  ]);

  if ('error' in resultA) {
    return c.json({ error: `Field "a": ${resultA.error}` }, resultA.status) as unknown as Response;
  }
  if ('error' in resultB) {
    return c.json({ error: `Field "b": ${resultB.error}` }, resultB.status) as unknown as Response;
  }

  try {
    const diff = await compare(
      { kind: 'bytes', data: resultA.data, filename: resultA.filename },
      { kind: 'bytes', data: resultB.data, filename: resultB.filename },
    );
    return c.json(diff) as unknown as Response;
  } catch (err) {
    if (err instanceof MetaScrubError && err.code === 'UNSUPPORTED_FORMAT') {
      return c.json({ error: err.message }, 415) as unknown as Response;
    }
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: msg }, 500) as unknown as Response;
  }
}
