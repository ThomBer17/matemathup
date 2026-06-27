import { solveCanonical } from "./engine";
import type { CanonicalExercise } from "./types";

export interface CanonicalCoverage {
  total: number;
  solved: number;
  percent: number;
  bySolver: Record<string, number>;
}

export function computeCanonicalCoverage(exercises: CanonicalExercise[]): CanonicalCoverage {
  const bySolver: Record<string, number> = {};
  let solved = 0;
  for (const exercise of exercises) {
    const result = solveCanonical(exercise);
    if (!result.ok) continue;
    solved++;
    bySolver[result.solver] = (bySolver[result.solver] ?? 0) + 1;
  }
  return {
    total: exercises.length,
    solved,
    percent: exercises.length === 0 ? 0 : Math.round((solved / exercises.length) * 100),
    bySolver,
  };
}
