import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AttemptStatus = "correct" | "partial" | "incorrect";
export type AttemptSource = "adaptive" | "tanda";

interface RecordTutorAttemptInput {
  topicId: string | null; // null para ejercicios de material propio (sin topic de curriculum)
  status: AttemptStatus;
  userAnswer: string;
  difficulty?: number;
  hintUsed?: boolean;
}

/**
 * Registra un intento del flujo Tanda IA (sin exercise persistido).
 * El flujo de práctica adaptativa sigue persistiendo directamente en topics.$slug.tsx
 * porque ya tiene exercise_id válido — pero ese código ahora también setea topic_id + source.
 */
export const recordTutorAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: RecordTutorAttemptInput) => input)
  .handler(async ({ data, context }) => {
    const { topicId, status, userAnswer, difficulty, hintUsed } = data;
    const { supabase, userId } = context;

    const { error } = await supabase.from("exercise_attempts").insert({
      user_id: userId,
      exercise_id: null,
      topic_id: topicId ?? null,
      user_answer: userAnswer,
      is_correct: status === "correct",
      status,
      source: "tanda",
      difficulty: difficulty ?? null,
      hint_used: hintUsed ?? false,
    });

    if (error) {
      console.error("[recordTutorAttempt] insert failed", error);
      throw new Error("No se pudo registrar el intento.");
    }
  });
