/**
 * Prosty in-memory rate limiter na podstawie IP.
 * Działa w ramach jednej instancji funkcji (Fluid Compute współdzieli instancje).
 * Dla pełnej ochrony multi-instance użyj Upstash Rate Limit.
 */

const WINDOW_MS = 60 * 1000; // 1 minuta
const MAX_REQUESTS = 5; // max 5 rezerwacji na minutę per IP
const MAX_STORE_SIZE = 10000;

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

// Okresowe czyszczenie wygasłych wpisów (co 5 minut) + limit rozmiaru
let lastCleanup = Date.now();
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 5 * 60 * 1000 && store.size < MAX_STORE_SIZE) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
  // Jeśli nadal za dużo — usuń najstarsze wpisy
  if (store.size >= MAX_STORE_SIZE) {
    const entries = [...store.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
    const toRemove = entries.slice(0, store.size - MAX_STORE_SIZE + 1000);
    for (const [key] of toRemove) store.delete(key);
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
