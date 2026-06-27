import type { DifficultyLevel } from "@/lib/ai/types";

export type AdaptiveExerciseView = {
  statement?: string | null;
  correct_answer?: string | null;
  type?: "multiple_choice" | "true_false" | "open" | null;
  options?: string[] | null;
  graph_expressions?: string[] | null;
};

export type GraphDetection = {
  latex: string;
  label?: string;
};

export type GraphExpressionView = {
  id: string;
  latex: string;
  color: string;
  label?: string;
};

export function isRenderableAdaptiveExercise(exercise: AdaptiveExerciseView | null | undefined) {
  if (!exercise?.statement || exercise.statement.trim().length < 10) return false;
  if (!exercise.correct_answer) return false;
  if (exercise.type === "multiple_choice" && (!exercise.options || exercise.options.length < 2)) {
    return false;
  }
  return true;
}

export function adaptiveDifficultyToLevel(difficulty: number): DifficultyLevel {
  if (difficulty <= 2) return "básico";
  if (difficulty >= 4) return "alto";
  return "intermedio";
}

export function buildAdaptiveGraphExpressions(
  aiExpressions: string[] | null | undefined,
  detected: GraphDetection[],
): GraphExpressionView[] {
  if (aiExpressions?.length) {
    return aiExpressions.map((latex, index) => ({
      id: `ai${index}`,
      latex,
      color: index === 0 ? "#0EA5E9" : "#8B5CF6",
    }));
  }

  return detected.map((item, index) => ({
    id: `d${index}`,
    latex: item.latex,
    color: "#0EA5E9",
    label: item.label,
  }));
}
