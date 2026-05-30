import type { Context } from 'hono';
import { supportedFormats } from '@metascrub/core';

export function formatsRoute(c: Context): Response {
  const formats = supportedFormats();
  return c.json({ formats, count: formats.length }) as unknown as Response;
}
