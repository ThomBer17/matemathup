import { extractIntervalLiteral } from "../extract";
import type { CanonicalAnswer, CanonicalExercise, CanonicalSolver } from "../types";

export class IntervalSolver implements CanonicalSolver {
  readonly name = "IntervalSolver";

  supports(exercise: CanonicalExercise): boolean {
    return (
      /intervalo|notaci[oó]n/i.test(exercise.statement) &&
      extractIntervalLiteral(exercise.statement) !== null
    );
  }

  solve(exercise: CanonicalExercise): CanonicalAnswer {
    const interval = extractIntervalLiteral(exercise.statement);
    if (!interval) throw new Error("unsupported_interval");
    return {
      kind: "interval",
      canonical: interval,
      display: interval,
      typable: interval,
    };
  }
}
