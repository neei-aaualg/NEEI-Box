export type RateLimitResult = {
  allowed: boolean;
  retryAfterMs?: number;
};

type WindowEntry = {
  count: number;
  resetAt: number;
};

// In-memory fixed-window counters keyed by identifier (IP, email, ...).
//
// The app is deployed as a single Next.js standalone container, where the
// middleware and handlers run in one process, so a process-local store is
// sufficient. If the app is ever scaled to multiple instances/workers, back
// this with a shared store (e.g. Redis/Upstash) instead.
const buckets = new Map<string, WindowEntry>();

const SWEEP_INTERVAL_MS = 60_000;
let lastSweep = Date.now();

function sweepExpired(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  if (limit <= 0) return { allowed: false };
  const now = Date.now();
  sweepExpired(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (existing.count >= limit) {
    return { allowed: false, retryAfterMs: existing.resetAt - now };
  }

  existing.count += 1;
  return { allowed: true };
}

export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}
