import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { log } from "@/lib/observability/log";
import { newItem } from "@/lib/review/srs";

export type AttemptStatus = "correct" | "partial" | "incorrect";
export type AttemptSource = "adaptive" | "tanda" | "exam";

interface RecordTutorAttemptInput {
  topicId: string | null; // null para ejercicios de material propio (sin topic de curriculum)
  status: AttemptStatus;
  userAnswer: string;
  difficulty?: number;
  hintUsed?: boolean;
}

interface RecordExamResultsInput {
  answers: Array<{
    exerciseId: string;
    topicId: string | null;
    userAnswer: string;
    correct: boolean;
  }>;
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
      log.error("tutor_attempt_insert_failed", { error: error.message, topicId });
      throw new Error("No se pudo registrar el intento.");
    }
  });

export const recordExamResults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: RecordExamResultsInput) => input)
  .handler(async ({ data, context }) => {
    const { answers } = data;
    const { supabase, userId } = context;
    if (answers.length === 0) return { recorded: 0, queuedForReview: 0 };

    const { error: attemptsError } = await supabase.from("exercise_attempts").insert(
      answers.map((answer) => ({
        user_id: userId,
        exercise_id: answer.exerciseId,
        topic_id: answer.topicId,
        user_answer: answer.userAnswer,
        is_correct: answer.correct,
        status: answer.correct ? "correct" : "incorrect",
        source: "exam",
      })),
    );

    if (attemptsError) {
      log.error("exam_attempts_insert_failed", {
        error: attemptsError.message,
        count: answers.length,
      });
      throw new Error("No se pudo registrar el simulacro.");
    }

    const wrong = answers.filter((answer) => !answer.correct);
    if (wrong.length === 0) return { recorded: answers.length, queuedForReview: 0 };

    const now = new Date().toISOString();
    const init = newItem();
    const { error: srsError } = await supabase.from("srs_items").upsert(
      wrong.map((answer) => ({
        user_id: userId,
        exercise_id: answer.exerciseId,
        topic_id: answer.topicId,
        box: init.box,
        due_at: init.dueAt,
        updated_at: now,
      })),
      { onConflict: "user_id,exercise_id" },
    );

    if (srsError) {
      log.error("exam_srs_upsert_failed", { error: srsError.message, count: wrong.length });
      throw new Error("No se pudo encolar el repaso del simulacro.");
    }

    return { recorded: answers.length, queuedForReview: wrong.length };
  });
