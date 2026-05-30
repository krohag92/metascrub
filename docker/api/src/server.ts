/**
 * MetaScrub HTTP API Server
 *
 * Self-hosted metadata viewer/scrubber. No auth by default — run behind a
 * reverse proxy (Caddy, nginx, Traefik) to add authentication.
 *
 * See https://metadatafinder.com for the online version.
 */

import { Hono } from 'hono';
import { parseRoute } from './routes/parse.js';
import { scrubRoute } from './routes/scrub.js';
import { compareRoute } from './routes/compare.js';
import { formatsRoute } from './routes/formats.js';
import { rateLimiter } from './middleware/rateLimit.js';

const PORT = Number(process.env['PORT'] ?? 8080);
const MAX_FILE_SIZE_RAW = process.env['MAX_FILE_SIZE'] ?? '100mb';
const RATE_LIMIT_RAW = process.env['RATE_LIMIT'] ?? '60/min';

export function parseMaxFileSize(raw: string): number {
  const m = /^(\d+(?:\.\d+)?)\s*(kb|mb|gb|b)?$/i.exec(raw.trim());
  if (!m) return 100 * 1024 * 1024;
  const n = parseFloat(m[1] ?? '100');
  const unit = (m[2] ?? 'b').toLowerCase();
  const multipliers: Record<string, number> = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 };
  return Math.round(n * (multipliers[unit] ?? 1));
}

export function parseRateLimit(raw: string): { requests: number; windowMs: number } {
  const m = /^(\d+)\s*\/\s*(min|sec|hour)$/i.exec(raw.trim());
  if (!m) return { requests: 60, windowMs: 60_000 };
  const requests = parseInt(m[1] ?? '60', 10);
  const unit = (m[2] ?? 'min').toLowerCase();
  const windows: Record<string, number> = { sec: 1_000, min: 60_000, hour: 3_600_000 };
  return { requests, windowMs: windows[unit] ?? 60_000 };
}

const MAX_FILE_BYTES = parseMaxFileSize(MAX_FILE_SIZE_RAW);
const { requests: RATE_LIMIT_REQUESTS, windowMs: RATE_LIMIT_WINDOW_MS } =
  parseRateLimit(RATE_LIMIT_RAW);

const app = new Hono();

// Rate limiting middleware (per client IP, in-memory).
app.use('*', rateLimiter(RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_MS));

// ------------------------------------------------------------------ routes --

app.get('/health', (c) => c.json({ ok: true }));

app.get('/formats', formatsRoute);

app.post('/parse', (c) => parseRoute(c, MAX_FILE_BYTES));

app.post('/scrub', (c) => scrubRoute(c, MAX_FILE_BYTES));

app.post('/compare', (c) => compareRoute(c, MAX_FILE_BYTES));

// ------------------------------------------ export for tests & server start --

export { app };

// Only start the HTTP listener when run directly (not when imported by tests).
if (process.env['NODE_ENV'] !== 'test') {
  const { serve } = await import('@hono/node-server');
  serve({ fetch: app.fetch, port: PORT }, (info) => {
    process.stdout.write(`MetaScrub API running on http://localhost:${info.port.toString()}\n`);
  });
}
