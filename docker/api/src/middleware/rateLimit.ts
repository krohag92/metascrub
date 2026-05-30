import type { Context, Next } from 'hono';

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Simple in-memory per-IP rate limiter.
 *
 * Not suitable for multi-process deployments; for those, put a reverse proxy
 * (e.g. Caddy with rate_limit directive) in front.
 */
export function rateLimiter(
  maxRequests: number,
  windowMs: number,
): (c: Context, next: Next) => Promise<Response | undefined> {
  const buckets = new Map<string, Bucket>();

  // Prune stale buckets periodically to prevent unbounded memory growth.
  const pruneInterval = Math.max(windowMs, 60_000);
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, pruneInterval);
  // Don't block Node from exiting.
  if (typeof timer.unref === 'function') timer.unref();

  return async (c: Context, next: Next) => {
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      c.req.header('x-real-ip') ??
      'unknown';

    const now = Date.now();
    let bucket = buckets.get(ip);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(ip, bucket);
    }

    bucket.count += 1;

    c.header('X-RateLimit-Limit', String(maxRequests));
    c.header('X-RateLimit-Remaining', String(Math.max(0, maxRequests - bucket.count)));
    c.header('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > maxRequests) {
      return c.json({ error: 'Too many requests' }, 429) as unknown as Response;
    }

    await next();
    return undefined;
  };
}
