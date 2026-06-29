import { describe, it, expect } from "vitest";
import { checkNumericSanity } from "./numeric-sanity";

describe("checkNumericSanity — debe DETECTAR errores", () => {
  it("cálculo de multiplicación incorrecto", () => {
    // 1.732 × 3.646 ≈ 6.315, no 4.587
    const r = checkNumericSanity("Entonces 1.732 × 3.646 ≈ 4.587 y listo.");
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("numeric_sanity_failed");
  });

  it("aproximación con signo invertido (0.207 ≈ -2.144)", () => {
    const r = checkNumericSanity("Da 0.207 ≈ -2.144 según el desarrollo.");
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("signo invertido");
  });

  it("suma incorrecta con =", () => {
    const r = checkNumericSanity("Sabemos que 2 + 3 = 6.");
    expect(r.ok).toBe(false);
  });

  it("detecta suma/resta incorrecta con signo menos unicode", () => {
    const r = checkNumericSanity("Sumando: 2.25 + (−2) − 2 = 2.25 − 4 − 2 = 0.25.");
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("numeric_sanity_failed");
  });
});

describe("checkNumericSanity — NO debe marcar lo correcto", () => {
  const buenos = [
    "Como 1.732 × 3.646 ≈ 6.315 obtenemos el resultado.",
    "Sabemos que 2 + 3 = 5.",
    "Redondeando, 1.732 × 3.646 ≈ 6.31.",
    "sqrt(3) ≈ 1.732 es la raíz.", // no debe truncar y marcar (3)≈1.732
    "El valor 1/2 = 0.5 es correcto.",
    "Resolvemos 2x + 3 = 7, entonces x = 2.", // álgebra: no debe marcar "3 = 7"
    "La ecuación 3x = 9 da x = 3.", // no marcar "3 = 9"
    "pi ≈ 3.14 aproximadamente.",
    "El área es 5 × 4 = 20.",
  ];
  for (const txt of buenos) {
    it(`acepta: "${txt}"`, () => {
      expect(checkNumericSanity(txt).ok).toBe(true);
    });
  }
});
