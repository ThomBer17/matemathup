/**
 * Conteo de uso server-side, defensivo.
 *
 * NO usamos contadores separados (se desincronizan): contamos filas reales
 * ya persistidas, así solo cuenta el "uso real":
 *  - adaptativa → exercise_attempts (source='adaptive') → 1 fila por ejercicio respondido
 *  - tanda IA   → ai_generation_log (topic_id null, status='success') → 1 fila por tanda generada OK
 *
 * Generaciones sin responder, fallos de IA y requests rotas NO crean estas filas,
 * por lo tanto no cuentan.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  type Plan,
  type UsageKind,
  FREEMIUM_LIMIT_ERROR,
  limitFor,
  normalizePlan,
  startOfArgentinaDay,
  withinLimit,
} from "./plans";

type DBClient = SupabaseClient<Database>;

export async function getPlan(supabase: DBClient, userId: string): Promise<Plan> {
  const { data } = await supabase.from("profiles").select("plan").eq("id", userId).maybeSingle();
  return normalizePlan(data?.plan ?? null);
}

export async function countUsageToday(
  supabase: DBClient,
  userId: string,
  kind: UsageKind,
): Promise<number> {
  const since = startOfArgentinaDay();

  if (kind === "adaptive") {
    const { count } = await supabase
      .from("exercise_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("source", "adaptive")
      .gte("created_at", since);
    return count ?? 0;
  }

  // tanda: ai_generation_log con topic_id null (las tandas se loguean sin topic_id)
  const { count } = await supabase
    .from("ai_generation_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("topic_id", null)
    .eq("status", "success")
    .gte("created_at", since);
  return count ?? 0;
}

export interface UsageSnapshot {
  plan: Plan;
  kind: UsageKind;
  used: number;
  limit: number | null;
  allowed: boolean;
}

export async function getUsageSnapshot(
  supabase: DBClient,
  userId: string,
  kind: UsageKind,
): Promise<UsageSnapshot> {
  const [plan, used] = await Promise.all([
    getPlan(supabase, userId),
    countUsageToday(supabase, userId, kind),
  ]);
  return { plan, kind, used, limit: limitFor(plan, kind), allowed: withinLimit(plan, kind, used) };
}

/**
 * Lanza el error de límite (código estable) si el usuario free agotó su cuota.
 * Llamar ANTES de la operación cara (generar). Premium nunca lanza.
 */
export async function assertWithinFreemiumLimit(
  supabase: DBClient,
  userId: string,
  kind: UsageKind,
): Promise<void> {
  const snap = await getUsageSnapshot(supabase, userId, kind);
  console.log(
    `[freemium] user=${userId} kind=${kind} plan=${snap.plan} used=${snap.used}/${snap.limit ?? "∞"} allowed=${snap.allowed}`,
  );
  if (!snap.allowed) {
    console.log(`[freemium] LÍMITE ALCANZADO user=${userId} kind=${kind} (plan ${snap.plan})`);
    throw new Error(FREEMIUM_LIMIT_ERROR[kind]);
  }
}
