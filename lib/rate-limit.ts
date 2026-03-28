/**
 * Prosty in-memory rate limiter na podstawie IP.
 * Działa w ramach jednej instancji funkcji (Fluid Compute współdzieli instancje).
 * Dla pełnej ochrony multi-instance użyj Upstash Rate Limit.
 */

const WINDOW_MS = 60 * 1000; // 1 minuta
const MAX_REQUESTS = 5; // max 5 rezerwacji na minutę per IP

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

// Okresowe czyszczenie wygasłych wpisów (co 5 minut)
let lastCleanup = Date.now();
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 5 * 60 * 1000) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}

export function checkRateLimit(
  ip: string,
  maxRequests: number = MAX_REQUESTS,
  windowMs: number = WINDOW_MS
): { allowed: boolean; retryAfterMs: number } {
  cleanup();

  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || entry.resetAt < now) {
    store.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  entry.count++;

  if (entry.count >= maxRequests) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  return { allowed: true, retryAfterMs: 0 };
}
