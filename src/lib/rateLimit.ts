type Bucket = {
  count: number;
  resetAt: number;
};

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 5;

const buckets = new Map<string, Bucket>();

function pruneExpired(now: number) {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * Simple in-memory IP rate limiter.
 * Fine for MVP / single-instance; swap for Redis on multi-instance Vercel.
 */
export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  pruneExpired(now);

  const existing = buckets.get(ip);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + WINDOW_MS;
    buckets.set(ip, { count: 1, resetAt });
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetAt };
  }

  if (existing.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  buckets.set(ip, existing);
  return {
    allowed: true,
    remaining: MAX_REQUESTS - existing.count,
    resetAt: existing.resetAt,
  };
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return headers.get("x-real-ip") || "unknown";
}
