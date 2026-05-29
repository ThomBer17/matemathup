/**
 * Rate limiter en memoria, por user-id, ventana deslizante simple.
 * Vive en el proceso del runtime (Cloudflare Workers / Node).
 *
 * No es persistente — un reinicio del worker resetea las cuentas.
 * Para escala real conviene Durable Objects o Redis, pero para MVP basta.
 */

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  retryInSec?: number;
  remaining?: number;
}

export function rateLimit(
  userId: string,
  bucket: string,
  limit: number,
  windowMs: number = 60_000,
): RateLimitResult {
  const key = `${bucket}:${userId}`;
  const now = Date.now();
  const b = buckets.get(key);

  if (!b || now - b.windowStart > windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { ok: true, remaining: limit - 1 };
  }

  if (b.count >= limit) {
    const retryInSec = Math.ceil((b.windowStart + windowMs - now) / 1000);
    return { ok: false, retryInSec };
  }

  b.count++;
  return { ok: true, remaining: limit - b.count };
}

/**
 * Limpia buckets expirados para evitar fuga de memoria a largo plazo.
 * Llamala cada tanto si el proceso vive mucho tiempo.
 */
export function pruneExpired(windowMs: number = 60_000) {
  const now = Date.now();
  for (const [key, b] of buckets) {
    if (now - b.windowStart > windowMs) buckets.delete(key);
  }
}

/** Solo para tests — vacía todo el estado. */
export function _resetForTests() {
  buckets.clear();
}
