import { describe, expect, it } from "vitest";
import { buildCanonicalOptions } from "./distractors";
import { solveCanonical } from "./engine";
import { evaluateExactExpression } from "./exact-expression";
import { checkCanonicalConsistency } from "./consistency-engine";
import { computeCanonicalCoverage } from "./coverage";
import {
  DecimalSolver,
  FractionSolver,
  IntegerSolver,
  IntervalSolver,
  RadicalSolver,
} from "./index";

describe("CanonicalMathEngine exact arithmetic", () => {
  it("evalua enteros con precedencia", () => {
    const answer = evaluateExactExpression("2+3*4").toCanonicalAnswer("integer");
    expect(answer).toMatchObject({ kind: "integer", canonical: "14", typable: "14", numeric: 14 });
  });

  it("evalua fracciones exactamente", () => {
    const answer = evaluateExactExpression("(2-1/3)^2+sqrt(0.25)-|-5/6|").toCanonicalAnswer(
      "fraction",
    );
    expect(answer).toMatchObject({ kind: "fraction", canonical: "22/9", typable: "22/9" });
  });

  it("simplifica radicales simples", () => {
    const answer = evaluateExactExpression("sqrt(12)").toCanonicalAnswer("radical");
    expect(answer).toMatchObject({ kind: "radical", canonical: "2*sqrt(3)", typable: "2*sqrt(3)" });
  });

  it("multiplica radicales compatibles", () => {
    const answer = evaluateExactExpression("sqrt(3)*sqrt(12)").toCanonicalAnswer("radical");
    expect(answer).toMatchObject({ kind: "integer", canonical: "6" });
  });
});

describe("Canonical solvers", () => {
  it("IntegerSolver soporta solo aritmetica entera", () => {
    const solver = new IntegerSolver();
    expect(solver.supports({ statement: "Calculá $2 + 3 * 4$" })).toBe(true);
    expect(solver.solve({ statement: "Calculá $2 + 3 * 4$" }).canonical).toBe("14");
    expect(solver.supports({ statement: "Calculá $1/2 + 1/3$" })).toBe(false);
  });

  it("FractionSolver resuelve fracciones", () => {
    const solver = new FractionSolver();
    const exercise = { statement: "Calculá $\\frac{1}{2} + \\frac{1}{3}$" };
    expect(solver.supports(exercise)).toBe(true);
    expect(solver.solve(exercise).canonical).toBe("5/6");
  });

  it("DecimalSolver resuelve decimales finitos", () => {
    const solver = new DecimalSolver();
    const exercise = { statement: "Calculá $0.25 + 1.5$" };
    expect(solver.supports(exercise)).toBe(true);
    expect(solver.solve(exercise).canonical).toBe("1.75");
  });

  it("RadicalSolver resuelve radicales simples", () => {
    const solver = new RadicalSolver();
    const exercise = { statement: "Simplificá $3\\sqrt{3}$" };
    expect(solver.supports(exercise)).toBe(true);
    expect(solver.solve(exercise).canonical).toBe("3*sqrt(3)");
  });

  it("IntervalSolver canonicaliza intervalos literales simples", () => {
    const solver = new IntervalSolver();
    const exercise = { statement: "Escribí el intervalo $[-2, 4)$ en notación de intervalo." };
    expect(solver.supports(exercise)).toBe(true);
    expect(solver.solve(exercise).canonical).toBe("[-2,4)");
  });
});

describe("Canonical dispatcher and consistency", () => {
  it("dispatcher usa el primer solver compatible", () => {
    const result = solveCanonical({ statement: "Calculá $\\sqrt{12}$" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.solver).toBe("RadicalSolver");
      expect(result.answer.canonical).toBe("2*sqrt(3)");
    }
  });

  it("fallback no toma ejercicios algebraicos fuera de alcance", () => {
    const result = solveCanonical({ statement: "Factorizá $x^2 - 4$" });
    expect(result.ok).toBe(false);
  });

  it("detecta correct_answer inconsistente contra fuente canonica", () => {
    const solved = solveCanonical({ statement: "Calculá $1/2 + 1/3$" });
    expect(solved.ok).toBe(true);
    if (!solved.ok) return;
    const consistency = checkCanonicalConsistency(
      {
        statement: "Calculá $1/2 + 1/3$",
        correct_answer: "2/3",
        options: ["2/3", "1/6", "1"],
        explanation: "$1/2 + 1/3 = 5/6$",
      },
      solved.answer,
    );
    expect(consistency.ok).toBe(false);
    expect(consistency.issues.map((i) => i.code)).toContain("correct_answer_mismatch");
    expect(consistency.issues.map((i) => i.code)).toContain("options_missing_answer");
  });

  it("construye opciones con la respuesta canonica incluida", () => {
    const solved = solveCanonical({ statement: "Calculá $1/2 + 1/3$" });
    expect(solved.ok).toBe(true);
    if (!solved.ok) return;
    const options = buildCanonicalOptions(solved.answer, ["2/3", "1/6", "1"]);
    expect(options[0]).toBe("5/6");
    expect(new Set(options).size).toBe(options.length);
  });

  it("rechaza distractores equivalentes a la respuesta canonica simplificada", () => {
    const solved = solveCanonical({ statement: "Simplificá $\\sqrt{50}$" });
    expect(solved.ok).toBe(true);
    if (!solved.ok) return;
    expect(solved.answer.canonical).toBe("5*sqrt(2)");

    const consistency = checkCanonicalConsistency(
      {
        statement: "Simplificá $\\sqrt{50}$",
        type: "multiple_choice",
        correct_answer: "5*sqrt(2)",
        options: ["5*sqrt(2)", "sqrt(50)", "10*sqrt(5)", "2*sqrt(25)"],
        explanation: "$\\sqrt{50}=5\\sqrt{2}$",
      },
      solved.answer,
    );
    expect(consistency.ok).toBe(false);
    expect(consistency.issues.map((i) => i.code)).toContain("equivalent_option_duplicate");
  });

  it("filtra opciones previas equivalentes al construir distractores canonicos", () => {
    const solved = solveCanonical({ statement: "Simplificá $\\sqrt{50}$" });
    expect(solved.ok).toBe(true);
    if (!solved.ok) return;

    const options = buildCanonicalOptions(solved.answer, ["sqrt(50)", "10*sqrt(5)", "2*sqrt(25)"]);
    expect(options).toContain("5*sqrt(2)");
    expect(options).not.toContain("sqrt(50)");
  });
});

describe("Canonical coverage", () => {
  it("calcula cobertura por solver", () => {
    const coverage = computeCanonicalCoverage([
      { statement: "Calculá $2+2$" },
      { statement: "Calculá $1/2+1/3$" },
      { statement: "Calculá $\\sqrt{12}$" },
      { statement: "Factorizá $x^2-4$" },
    ]);
    expect(coverage.total).toBe(4);
    expect(coverage.solved).toBe(3);
    expect(coverage.percent).toBe(75);
    expect(coverage.bySolver.IntegerSolver).toBe(1);
    expect(coverage.bySolver.FractionSolver).toBe(1);
    expect(coverage.bySolver.RadicalSolver).toBe(1);
  });
});
