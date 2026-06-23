const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 10;

// Defaults preserve the original behavior (10 attempts / 15 min) so existing
// callers are unchanged. A generous cap can be passed for high-frequency,
// low-risk traffic such as wizard autosaves, which must not trip the strict
// login-style limit.
export function checkRateLimit(
  key: string,
  max: number = MAX_ATTEMPTS,
  windowMs: number = WINDOW_MS
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, retryAfterMs: 0 };
  }

  if (entry.count >= max) {
    return { allowed: false, remaining: 0, retryAfterMs: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true, remaining: max - entry.count, retryAfterMs: 0 };
}

// Cleanup stale entries every 30 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap) {
      if (now > entry.resetAt) rateLimitMap.delete(key);
    }
  }, 30 * 60 * 1000);
}
