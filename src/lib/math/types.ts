export type CanonicalAnswerKind = "integer" | "decimal" | "fraction" | "radical" | "interval";

export interface CanonicalAnswer {
  kind: CanonicalAnswerKind;
  canonical: string;
  display: string;
  typable: string;
  numeric?: number;
}

export interface CanonicalExercise {
  statement: string;
  type?: "multiple_choice" | "true_false" | "open";
  options?: string[] | null;
  correct_answer?: string;
  explanation?: string;
}

export interface CanonicalSolver {
  readonly name: string;
  supports(exercise: CanonicalExercise): boolean;
  solve(exercise: CanonicalExercise): CanonicalAnswer;
}

export type SolveResult =
  | { ok: true; solver: string; answer: CanonicalAnswer }
  | { ok: false; reason: string };

export interface CanonicalConsistencyIssue {
  code:
    | "explanation_mismatch"
    | "correct_answer_mismatch"
    | "options_missing_answer"
    | "equivalent_option_duplicate";
  message: string;
}

export interface CanonicalConsistencyResult {
  ok: boolean;
  issues: CanonicalConsistencyIssue[];
}
