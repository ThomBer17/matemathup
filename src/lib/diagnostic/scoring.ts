/**
 * Scoring del Test Diagnóstico. Lógica pura: dada la respuesta a cada pregunta,
 * calcula el punto de partida por tema (dificultad inicial + dominio estimado).
 *
 * Una respuesta puede ser: correcta, incorrecta, o "no sé" (saltada).
 */

export type DiagnosticOutcome = "correct" | "incorrect" | "skipped";

export interface DiagnosticResult {
  topicSlug: string;
  difficulty: number; // 1-5: dificultad inicial sugerida
  masteryPct: number; // 0-100: dominio estimado de arranque
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Calcula el resultado de UNA pregunta:
 * - correcta  → arranca en la dificultad de la pregunta, dominio medio-alto.
 * - incorrecta → un escalón abajo, dominio bajo.
 * - no sé      → nivel 1, dominio muy bajo (mejor empezar desde abajo).
 */
export function scoreQuestion(
  topicSlug: string,
  questionDifficulty: number,
  outcome: DiagnosticOutcome,
): DiagnosticResult {
  if (outcome === "skipped") {
    return { topicSlug, difficulty: 1, masteryPct: 10 };
  }
  if (outcome === "correct") {
    return {
      topicSlug,
      difficulty: clamp(questionDifficulty, 1, 5),
      masteryPct: clamp(45 + questionDifficulty * 8, 0, 100),
    };
  }
  // incorrecta
  return {
    topicSlug,
    difficulty: clamp(questionDifficulty - 1, 1, 5),
    masteryPct: clamp(15 + questionDifficulty * 3, 0, 100),
  };
}

/** Etiqueta legible del nivel de partida, para mostrar en el resultado. */
export function levelLabel(difficulty: number): string {
  return (
    ["Desde lo básico", "Inicial", "Intermedio", "Avanzado", "Muy avanzado"][difficulty - 1] ??
    "Intermedio"
  );
}

/** Cuenta de aciertos sobre el total respondido (para el resumen). */
export function summarize(results: { outcome: DiagnosticOutcome }[]): {
  correct: number;
  total: number;
} {
  return {
    correct: results.filter((r) => r.outcome === "correct").length,
    total: results.length,
  };
}
