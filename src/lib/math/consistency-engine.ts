import { parseNumericValue } from "@/lib/ai/consistency";
import { normalizeAnswerText } from "./format";
import type { CanonicalAnswer, CanonicalConsistencyResult, CanonicalExercise } from "./types";

function sameCanonical(a: string, answer: CanonicalAnswer): boolean {
  const value = normalizeAnswerText(a);
  return (
    value === normalizeAnswerText(answer.canonical) ||
    value === normalizeAnswerText(answer.typable) ||
    value === normalizeAnswerText(answer.display)
  );
}

function sameNumericValue(a: string, answer: CanonicalAnswer): boolean {
  if (answer.numeric == null || !Number.isFinite(answer.numeric)) return false;
  const value = parseNumericValue(a);
  if (value === null) return false;
  return Math.abs(value - answer.numeric) <= 1e-9 * Math.max(Math.abs(answer.numeric), 1);
}

export function checkCanonicalConsistency(
  exercise: CanonicalExercise,
  answer: CanonicalAnswer,
): CanonicalConsistencyResult {
  const issues: CanonicalConsistencyResult["issues"] = [];

  if (exercise.correct_answer && !sameCanonical(exercise.correct_answer, answer)) {
    issues.push({
      code: "correct_answer_mismatch",
      message: `correct_answer="${exercise.correct_answer}" no coincide con canonical="${answer.canonical}"`,
    });
  }

  if (
    exercise.options &&
    exercise.options.length > 0 &&
    !exercise.options.some((o) => sameCanonical(o, answer))
  ) {
    issues.push({
      code: "options_missing_answer",
      message: `ninguna opción coincide con canonical="${answer.canonical}"`,
    });
  }

  if (exercise.type === "multiple_choice" && exercise.options && answer.numeric != null) {
    const equivalentDistractor = exercise.options.find(
      (o) => !sameCanonical(o, answer) && sameNumericValue(o, answer),
    );
    if (equivalentDistractor) {
      issues.push({
        code: "equivalent_option_duplicate",
        message: `la opción "${equivalentDistractor}" equivale a canonical="${answer.canonical}" pero no está en forma canónica`,
      });
    }
  }

  if (exercise.explanation) {
    const normalizedExplanation = normalizeAnswerText(exercise.explanation);
    const hasCanonical =
      normalizedExplanation.includes(normalizeAnswerText(answer.canonical)) ||
      normalizedExplanation.includes(normalizeAnswerText(answer.typable)) ||
      normalizedExplanation.includes(normalizeAnswerText(answer.display));
    if (!hasCanonical) {
      issues.push({
        code: "explanation_mismatch",
        message: `la explicación no contiene canonical="${answer.canonical}"`,
      });
    }
  }

  return { ok: issues.length === 0, issues };
}
