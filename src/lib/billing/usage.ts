/**
 * Conteo de uso server-side.
 *
 * adaptive: ejercicios respondidos.
 * adaptive_generation: llamadas IA adaptativas que consumen costo.
 * tanda: tandas IA generadas.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { errorFields, log } from "@/lib/observability/log";
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

  const query = supabase
    .from("ai_generation_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("status", ["pending", "success", "error"])
    .gte("created_at", since);

  if (kind === "adaptive_generation") {
    const { count } = await query.not("topic_id", "is", null);
    return count ?? 0;
  }

  const { count } = await query.is("topic_id", null);
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

export async function assertWithinFreemiumLimit(
  supabase: DBClient,
  userId: string,
  kind: UsageKind,
): Promise<void> {
  const snap = await getUsageSnapshot(supabase, userId, kind);
  log.info("freemium_check", {
    userId,
    kind,
    plan: snap.plan,
    used: snap.used,
    limit: snap.limit,
    allowed: snap.allowed,
  });
  if (!snap.allowed) {
    log.info("freemium_limit_reached", { userId, kind, plan: snap.plan });
    throw new Error(FREEMIUM_LIMIT_ERROR[kind]);
  }
}

export async function reserveAIGeneration(
  supabase: DBClient,
  input: {
    userId: string;
    topicId: string | null;
    difficulty: number | null;
    model: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<string | null> {
  const { data, error } = await supabase
    .from("ai_generation_log")
    .insert({
      user_id: input.userId,
      topic_id: input.topicId,
      difficulty: input.difficulty,
      model: input.model,
      status: "pending",
      generated_exercise: JSON.parse(JSON.stringify(input.metadata ?? {})),
    })
    .select("id")
    .single();

  if (error) {
    log.warn("ai_generation_reserve_failed", {
      userId: input.userId,
      topicId: input.topicId,
      ...errorFields(error),
    });
    return null;
  }
  return data.id;
}

export async function finishAIGeneration(
  supabase: DBClient,
  id: string | null,
  input: {
    status: "success" | "error";
    generatedExercise?: unknown;
    errorMessage?: string;
  },
): Promise<void> {
  if (!id) return;

  const update: Database["public"]["Tables"]["ai_generation_log"]["Update"] = {
    status: input.status,
    error_message: input.errorMessage?.slice(0, 500) ?? null,
  };
  if (input.generatedExercise !== undefined) {
    update.generated_exercise = JSON.parse(JSON.stringify(input.generatedExercise));
  }

  const { error } = await supabase.from("ai_generation_log").update(update).eq("id", id);
  if (error) {
    log.warn("ai_generation_finish_failed", { id, ...errorFields(error) });
  }
}
