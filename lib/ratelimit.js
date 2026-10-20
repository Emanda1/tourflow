// Simple in-memory fixed-window rate limiter. Good for a single server process.
const buckets = globalThis.__tfRate ?? (globalThis.__tfRate = new Map());

/** Returns true if allowed, false if the limit for this key is exceeded. */
export function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    if (buckets.size > 10000) for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k);
    return true;
  }
  b.count++;
  return b.count <= limit;
}

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
