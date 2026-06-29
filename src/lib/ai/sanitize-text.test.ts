import { describe, it, expect } from "vitest";
import { sanitizeMathText } from "./sanitize-text";

describe("sanitizeMathText", () => {
  it("convierte letras griegas y saca el math mode", () => {
    expect(sanitizeMathText("El ángulo $\\alpha$ mide 30°")).toBe("El ángulo α mide 30°");
    expect(sanitizeMathText("$\\theta$ y $\\beta$")).toBe("θ y β");
  });

  it("fracciones y raíces", () => {
    expect(sanitizeMathText("\\frac{1}{2}")).toBe("(1)/(2)");
    expect(sanitizeMathText("\\sqrt{2}")).toBe("√(2)");
    expect(sanitizeMathText("\\sqrt{x+1}")).toBe("√(x+1)");
    expect(sanitizeMathText("\\frac{7\\sqrt{5}+5\\sqrt{2}}{5}")).toBe(
      "(7√(5)+5√(2))/(5)",
    );
  });

  it("símbolos comunes", () => {
    expect(sanitizeMathText("$x \\leq 3$")).toBe("x ≤ 3");
    expect(sanitizeMathText("a \\cdot b \\neq c")).toBe("a · b ≠ c");
    expect(sanitizeMathText("\\pi \\approx 3.14")).toBe("π ≈ 3.14");
  });

  it("funciones quedan sin la barra", () => {
    expect(sanitizeMathText("$\\sin(\\alpha) + \\cos(\\beta)$")).toBe("sin(α) + cos(β)");
  });

  it("exponentes", () => {
    expect(sanitizeMathText("x^{2} + y^2")).toBe("x² + y²");
    expect(sanitizeMathText("x^{n+1}")).toBe("x^(n+1)");
  });

  it("texto normal sin LaTeX no se rompe", () => {
    expect(sanitizeMathText("Calculá el seno de 30 grados.")).toBe("Calculá el seno de 30 grados.");
    expect(sanitizeMathText("Resolvé 2x + 3 = 7")).toBe("Resolvé 2x + 3 = 7");
  });

  it("\\text y \\left \\right", () => {
    expect(sanitizeMathText("\\left( \\frac{a}{b} \\right)")).toBe("( (a)/(b) )");
    expect(sanitizeMathText("\\text{donde } x > 0")).toBe("donde x > 0");
  });

  it("string vacío", () => {
    expect(sanitizeMathText("")).toBe("");
  });
});
