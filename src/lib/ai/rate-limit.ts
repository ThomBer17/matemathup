/**
 * Rate limiter.
 * - rateLimit: fallback en memoria y API sincrona usada por tests.
 * - persistentRateLimit: usa Supabase/Postgres via RPC para serverless/escala.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { errorFields, log } from "@/lib/observability/log";

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

export async function persistentRateLimit(
  supabase: SupabaseClient<Database>,
  userId: string,
  bucket: string,
  limit: number,
  windowMs: number = 60_000,
): Promise<RateLimitResult> {
  const { data, error } = await supabase.rpc("check_ai_rate_limit", {
    p_bucket: bucket,
    p_limit: limit,
    p_window_seconds: Math.ceil(windowMs / 1000),
  });

  if (error) {
    log.warn("rate_limit_persistent_failed", {
      bucket,
      limit,
      windowMs,
      ...errorFields(error),
    });
    return rateLimit(userId, bucket, limit, windowMs);
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return rateLimit(userId, bucket, limit, windowMs);

  return {
    ok: row.ok,
    retryInSec: row.retry_in_sec ?? undefined,
    remaining: row.remaining ?? undefined,
  };
}

export function pruneExpired(windowMs: number = 60_000) {
  const now = Date.now();
  for (const [key, b] of buckets) {
    if (now - b.windowStart > windowMs) buckets.delete(key);
  }
}

export function _resetForTests() {
  buckets.clear();
}
