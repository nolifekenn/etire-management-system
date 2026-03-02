/**
 * rateLimit.ts — In-memory sliding-window rate limiter.
 *
 * Suitable for single-instance deployments (e.g. a single Node.js process).
 * For multi-instance / serverless deployments, replace the Map with Redis.
 *
 * Usage:
 *   const limiter = createRateLimiter({ maxAttempts: 5, windowMs: 15 * 60 * 1000 });
 *   const result = limiter.check(ip);
 *   if (!result.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 */

interface RateLimitEntry {
  /** Timestamps (ms) of each request within the current window */
  timestamps: number[];
}

interface RateLimiterOptions {
  /** Maximum requests allowed within the window. */
  maxAttempts: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

interface CheckResult {
  allowed: boolean;
  /** How many attempts remain within this window. */
  remaining: number;
  /** Epoch ms when the oldest entry expires and frees a slot. */
  resetAt: number;
}

export function createRateLimiter(options: RateLimiterOptions) {
  const { maxAttempts, windowMs } = options;
  const store = new Map<string, RateLimitEntry>();

  // Periodically sweep expired entries to prevent unbounded memory growth
  const sweepInterval = setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [key, entry] of store.entries()) {
      entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
      if (entry.timestamps.length === 0) store.delete(key);
    }
  }, windowMs);

  // Allow the process to exit even if this timer is still running
  if (sweepInterval.unref) sweepInterval.unref();

  return {
    /**
     * Check and record a request for the given key (typically an IP address).
     * Call this ONLY when you want to consume a slot (e.g. on a failed login attempt).
     */
    check(key: string): CheckResult {
      const now = Date.now();
      const cutoff = now - windowMs;

      const entry = store.get(key) ?? { timestamps: [] };
      // Drop timestamps outside the current window
      entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

      const remaining = Math.max(0, maxAttempts - entry.timestamps.length - 1);
      const resetAt =
        entry.timestamps.length > 0 ? entry.timestamps[0] + windowMs : now + windowMs;

      if (entry.timestamps.length >= maxAttempts) {
        store.set(key, entry);
        return { allowed: false, remaining: 0, resetAt };
      }

      entry.timestamps.push(now);
      store.set(key, entry);
      return { allowed: true, remaining, resetAt };
    },

    /** Peek at the current state without consuming a slot. */
    peek(key: string): CheckResult {
      const now = Date.now();
      const cutoff = now - windowMs;
      const entry = store.get(key) ?? { timestamps: [] };
      const active = entry.timestamps.filter((t) => t > cutoff);

      const remaining = Math.max(0, maxAttempts - active.length);
      const resetAt =
        active.length > 0 ? active[0] + windowMs : now + windowMs;

      return {
        allowed: active.length < maxAttempts,
        remaining,
        resetAt,
      };
    },

    /** Manually clear the record for a key (e.g. after a successful login). */
    reset(key: string): void {
      store.delete(key);
    },
  };
}

// Singleton login rate limiter:
// 5 failed attempts per IP per 15 minutes
export const loginRateLimiter = createRateLimiter({
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
});
