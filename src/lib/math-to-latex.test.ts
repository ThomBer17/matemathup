import { describe, it, expect } from "vitest";
import { mathToLatex } from "./math-to-latex";

describe("mathToLatex", () => {
  it("string vacío → vacío", () => {
    expect(mathToLatex("")).toBe("");
    expect(mathToLatex("   ")).toBe("");
  });

  it("sqrt(x) → \\sqrt{x}", () => {
    expect(mathToLatex("sqrt(2)")).toBe("\\sqrt{2}");
  });

  it("sqrt anidado", () => {
    expect(mathToLatex("sqrt(sqrt(2))")).toBe("\\sqrt{\\sqrt{2}}");
  });

  it("pi → \\pi (con word boundary, no rompe 'pinguino')", () => {
    expect(mathToLatex("pi/2")).toContain("\\pi");
    expect(mathToLatex("pinguino")).not.toContain("\\pi");
  });

  it("auto-braces en exponentes simples", () => {
    expect(mathToLatex("x^2")).toBe("x^{2}");
    expect(mathToLatex("x^23")).toBe("x^{23}");
    expect(mathToLatex("x^y")).toBe("x^{y}");
  });

  it("auto-braces en exponentes con paréntesis", () => {
    expect(mathToLatex("x^(a+b)")).toBe("x^{(a+b)}");
  });

  it("funciones trig llevan backslash", () => {
    expect(mathToLatex("sin(x)")).toContain("\\sin(");
    expect(mathToLatex("cos(x)")).toContain("\\cos(");
    expect(mathToLatex("tan(x)")).toContain("\\tan(");
    expect(mathToLatex("log(10)")).toContain("\\log(");
    expect(mathToLatex("ln(e)")).toContain("\\ln(");
  });

  it("símbolos unicode → comandos LaTeX", () => {
    expect(mathToLatex("x ≤ 5")).toContain("\\leq");
    expect(mathToLatex("x ≥ 5")).toContain("\\geq");
    expect(mathToLatex("a ≠ b")).toContain("\\neq");
    expect(mathToLatex("∞")).toContain("\\infty");
  });

  it("composición: sqrt(pi/2) con todos los transforms", () => {
    const result = mathToLatex("sqrt(pi/2)");
    expect(result).toContain("\\sqrt");
    expect(result).toContain("\\pi");
  });
});
