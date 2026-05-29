import { describe, it, expect } from "vitest";
import {
  parseNumericValue,
  parseIntervalFromStatement,
  checkIntervalConsistency,
} from "./consistency";

describe("parseNumericValue", () => {
  it("enteros y decimales", () => {
    expect(parseNumericValue("3")).toBe(3);
    expect(parseNumericValue("-1.5")).toBe(-1.5);
    expect(parseNumericValue("1,5")).toBe(1.5); // coma decimal
  });

  it("fracciones", () => {
    expect(parseNumericValue("3/2")).toBe(1.5);
    expect(parseNumericValue("-3/4")).toBe(-0.75);
  });

  it("expresiones aritméticas simples", () => {
    expect(parseNumericValue("2*(-3/4) + 3")).toBe(1.5);
    expect(parseNumericValue("-1.5 + 3")).toBe(1.5);
  });

  it("raíz cuadrada", () => {
    const sqrt = String.fromCharCode(0x221a); // √ — vía codepoint para evitar mangling del transpiler
    expect(parseNumericValue(`${sqrt}9`)).toBe(3);
    expect(parseNumericValue("sqrt(16)")).toBe(4);
  });

  it("rechaza texto no numérico", () => {
    expect(parseNumericValue("verdadero")).toBeNull();
    expect(parseNumericValue("x = 2")).toBeNull();
    expect(parseNumericValue("opción A")).toBeNull();
    expect(parseNumericValue("")).toBeNull();
  });

  it("rechaza intentos de inyección de código", () => {
    expect(parseNumericValue("process.exit(1)")).toBeNull();
    expect(parseNumericValue("alert(1)")).toBeNull();
  });
});

describe("parseIntervalFromStatement", () => {
  it("requiere la palabra 'intervalo'", () => {
    expect(parseIntervalFromStatement("el par (2, 3)")).toBeNull();
    expect(parseIntervalFromStatement("en el intervalo (2, 3)")).not.toBeNull();
  });

  it("parsea intervalo abierto", () => {
    const iv = parseIntervalFromStatement("expresá el resultado en el intervalo (-2, -1)");
    expect(iv).toEqual({ lo: -2, hi: -1, loOpen: true, hiOpen: true });
  });

  it("parsea intervalo cerrado y semiabierto", () => {
    expect(parseIntervalFromStatement("intervalo [0, 5]")).toMatchObject({ loOpen: false, hiOpen: false });
    expect(parseIntervalFromStatement("intervalo (0, 5]")).toMatchObject({ loOpen: true, hiOpen: false });
  });

  it("no confunde (-3/4) sin coma con un intervalo", () => {
    expect(parseIntervalFromStatement("calculá 2·(-3/4) en el intervalo")).toBeNull();
  });
});

describe("checkIntervalConsistency", () => {
  it("DETECTA el bug reportado: 1.5 no ∈ (-2,-1)", () => {
    const res = checkIntervalConsistency(
      "Calcule 2·(-3/4) + √9 y exprese el resultado en el intervalo (-2,-1).",
      "1.5",
    );
    expect(res.ok).toBe(false);
    expect(res.reason).toContain("no pertenece");
  });

  it("acepta cuando el resultado SÍ pertenece", () => {
    const res = checkIntervalConsistency(
      "Resolvé y verificá que el resultado esté en el intervalo (1, 2).",
      "1.5",
    );
    expect(res.ok).toBe(true);
  });

  it("respeta apertura/cierre: 2 no ∈ (1,2) pero sí ∈ (1,2]", () => {
    expect(checkIntervalConsistency("en el intervalo (1, 2)", "2").ok).toBe(false);
    expect(checkIntervalConsistency("en el intervalo (1, 2]", "2").ok).toBe(true);
  });

  it("no bloquea si no hay intervalo en la consigna", () => {
    expect(checkIntervalConsistency("Calculá 2 + 2", "4").ok).toBe(true);
  });

  it("no bloquea si la answer key no es numérica (no verificable)", () => {
    expect(checkIntervalConsistency("en el intervalo (1, 2)", "x = 3").ok).toBe(true);
  });
});
