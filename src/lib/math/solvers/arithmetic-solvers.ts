import { extractArithmeticExpression } from "../extract";
import { arithmeticProfile, evaluateExactExpression } from "../exact-expression";
import type { CanonicalAnswer, CanonicalExercise, CanonicalSolver } from "../types";

abstract class ArithmeticSolver implements CanonicalSolver {
  abstract readonly name: string;
  protected abstract readonly preferred: "integer" | "decimal" | "fraction" | "radical";

  supports(exercise: CanonicalExercise): boolean {
    const expr = extractArithmeticExpression(exercise.statement);
    if (!expr) return false;
    try {
      const profile = arithmeticProfile(expr);
      const value = evaluateExactExpression(expr);
      return this.matches(profile, value.toCanonicalAnswer(this.preferred));
    } catch {
      return false;
    }
  }

  solve(exercise: CanonicalExercise): CanonicalAnswer {
    const expr = extractArithmeticExpression(exercise.statement);
    if (!expr) throw new Error("unsupported_exercise");
    return evaluateExactExpression(expr).toCanonicalAnswer(this.preferred);
  }

  protected abstract matches(
    profile: ReturnType<typeof arithmeticProfile>,
    answer: CanonicalAnswer,
  ): boolean;
}

export class IntegerSolver extends ArithmeticSolver {
  readonly name = "IntegerSolver";
  protected readonly preferred = "integer";

  protected matches(
    profile: ReturnType<typeof arithmeticProfile>,
    answer: CanonicalAnswer,
  ): boolean {
    return (
      !profile.hasDecimal &&
      !profile.hasFraction &&
      !profile.hasRadical &&
      answer.kind === "integer"
    );
  }
}

export class DecimalSolver extends ArithmeticSolver {
  readonly name = "DecimalSolver";
  protected readonly preferred = "decimal";

  protected matches(
    profile: ReturnType<typeof arithmeticProfile>,
    answer: CanonicalAnswer,
  ): boolean {
    return (
      profile.hasDecimal &&
      !profile.hasRadical &&
      (answer.kind === "decimal" || answer.kind === "integer")
    );
  }
}

export class FractionSolver extends ArithmeticSolver {
  readonly name = "FractionSolver";
  protected readonly preferred = "fraction";

  protected matches(
    profile: ReturnType<typeof arithmeticProfile>,
    answer: CanonicalAnswer,
  ): boolean {
    return (
      profile.hasFraction &&
      !profile.hasRadical &&
      (answer.kind === "fraction" || answer.kind === "integer")
    );
  }
}

export class RadicalSolver extends ArithmeticSolver {
  readonly name = "RadicalSolver";
  protected readonly preferred = "radical";

  protected matches(
    profile: ReturnType<typeof arithmeticProfile>,
    answer: CanonicalAnswer,
  ): boolean {
    return (
      profile.hasRadical && ["radical", "fraction", "integer", "decimal"].includes(answer.kind)
    );
  }
}
