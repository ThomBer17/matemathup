import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { log } from "@/lib/observability/log";

interface RecordAdaptiveAttemptInput {
  exerciseId: string;
  userAnswer: string;
  hintUsed?: boolean;
}

export interface RecordAdaptiveAttemptResult {
  correct: boolean;
  xpGain: number;
  newDifficulty: number;
  masteryPct: number;
  leveledUp: boolean;
  newLevel: number;
}

export const recordAdaptiveAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: RecordAdaptiveAttemptInput) => input)
  .handler(async ({ data, context }): Promise<RecordAdaptiveAttemptResult> => {
    const { exerciseId, userAnswer, hintUsed = false } = data;
    const { supabase } = context;

    const { data: result, error } = await supabase.rpc("answer_adaptive_exercise", {
      p_exercise_id: exerciseId,
      p_user_answer: userAnswer,
      p_hint_used: hintUsed,
    });

    if (error) {
      log.error("adaptive_attempt_rpc_failed", { error: error.message, exerciseId });
      throw new Error("No se pudo guardar el intento.");
    }

    const row = Array.isArray(result) ? result[0] : null;
    if (!row) {
      throw new Error("No se pudo guardar el intento.");
    }

    return {
      correct: row.correct,
      xpGain: row.xp_gain,
      newDifficulty: row.new_difficulty,
      masteryPct: row.mastery_pct,
      leveledUp: row.leveled_up,
      newLevel: row.new_level,
    };
  });
