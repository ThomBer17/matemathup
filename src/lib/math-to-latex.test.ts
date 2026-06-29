import { describe, it, expect } from "vitest";
import { mathToLatex, plainMathToLatex, isRenderableMath } from "./math-to-latex";

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

describe("plainMathToLatex — notación plana/unicode → LaTeX", () => {
  it("raíces unicode", () => {
    expect(plainMathToLatex("√(15² - 9²)")).toBe("\\sqrt{15^{2} - 9^{2}}");
    expect(plainMathToLatex("√144")).toBe("\\sqrt{144}");
  });

  it("griegas, funciones y fracciones", () => {
    const r = plainMathToLatex("cos(θ)=4/5");
    expect(r).toContain("\\cos");
    expect(r).toContain("\\theta");
    expect(r).toContain("\\frac{4}{5}");
  });

  it("símbolos y grados", () => {
    expect(plainMathToLatex("x ≤ 3")).toContain("\\leq");
    expect(plainMathToLatex("30°")).toBe("30^{\\circ}");
  });

  it("respuesta tipeable 3*sqrt(3) → 3·√3", () => {
    const r = plainMathToLatex("3*sqrt(3)");
    expect(r).toContain("\\cdot");
    expect(r).toContain("\\sqrt{3}");
    expect(r).not.toContain("sqrt(");
  });

  it("convierte raíces ascii pegadas a coeficientes", () => {
    expect(plainMathToLatex("sqrt(5) + 3sqrt(2)")).toBe("\\sqrt{5} + 3\\sqrt{2}");
  });
});

describe("isRenderableMath", () => {
  it("acepta expresiones compactas", () => {
    expect(isRenderableMath("√(15² - 9²)")).toBe(true);
    expect(isRenderableMath("cos(θ)=4/5")).toBe(true);
    expect(isRenderableMath("sqrt(5) + 3sqrt(2)")).toBe(true);
  });

  it("rechaza prosa con palabras largas", () => {
    expect(isRenderableMath("cateto_adyacente / hipotenusa = 0.8")).toBe(false);
    expect(isRenderableMath("cos(ángulo)=12/15")).toBe(false);
  });
});
