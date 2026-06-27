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
