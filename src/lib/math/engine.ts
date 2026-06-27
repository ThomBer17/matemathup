import {
  DecimalSolver,
  FractionSolver,
  IntegerSolver,
  RadicalSolver,
} from "./solvers/arithmetic-solvers";
import { IntervalSolver } from "./solvers/interval-solver";
import type { CanonicalExercise, CanonicalSolver, SolveResult } from "./types";

export const canonicalSolvers: CanonicalSolver[] = [
  new IntegerSolver(),
  new FractionSolver(),
  new DecimalSolver(),
  new RadicalSolver(),
  new IntervalSolver(),
];

export class CanonicalMathEngine {
  constructor(private readonly solvers: CanonicalSolver[] = canonicalSolvers) {}

  solve(exercise: CanonicalExercise): SolveResult {
    for (const solver of this.solvers) {
      if (!solver.supports(exercise)) continue;
      try {
        return { ok: true, solver: solver.name, answer: solver.solve(exercise) };
      } catch {
        continue;
      }
    }
    return { ok: false, reason: "no_solver" };
  }
}

export const canonicalMathEngine = new CanonicalMathEngine();

export function solveCanonical(exercise: CanonicalExercise): SolveResult {
  return canonicalMathEngine.solve(exercise);
}
