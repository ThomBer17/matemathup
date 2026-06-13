import { describe, it, expect } from "vitest";
import { getFormula, FORMULAS, formulasByTopic } from "./index";

function run(slug: string, inputs: Record<string, number | number[]>, opts = {}) {
  const f = getFormula(slug)!;
  return f.compute(inputs, opts);
}

describe("catálogo", () => {
  it("todas las fórmulas tienen slug único, vars y compute", () => {
    const slugs = new Set<string>();
    for (const f of FORMULAS) {
      expect(slugs.has(f.slug)).toBe(false);
      slugs.add(f.slug);
      expect(f.vars.length).toBeGreaterThan(0);
      expect(typeof f.compute).toBe("function");
    }
  });
  it("agrupa por tema", () => {
    const groups = formulasByTopic();
    expect(groups.map((g) => g.topic)).toContain("Álgebra");
    expect(groups.every((g) => g.formulas.length > 0)).toBe(true);
  });
});

describe("cuadrática", () => {
  it("dos raíces reales", () => {
    const r = run("cuadratica", { a: 1, b: -1, c: -6 }); // (x-3)(x+2)
    expect(r.copyText).toContain("x₁ = 3");
    expect(r.copyText).toContain("x₂ = -2");
  });
  it("discriminante negativo → sin solución real", () => {
    const r = run("cuadratica", { a: 1, b: 0, c: 1 });
    expect(r.note).toMatch(/no tiene soluciones reales/);
  });
  it("raíz doble", () => {
    const r = run("cuadratica", { a: 1, b: -4, c: 4 }); // (x-2)^2
    expect(r.copyText).toBe("x = 2");
  });
});

describe("pitágoras (variantes)", () => {
  it("hipotenusa 3,4 → 5", () => {
    const r = run("pitagoras", { a: 3, b: 4 }, { variant: "hipotenusa" });
    expect(r.decimal).toBe("5");
  });
  it("cateto desde hipotenusa", () => {
    const r = run("pitagoras", { c: 5, a: 3 }, { variant: "cateto" });
    expect(r.decimal).toBe("4");
  });
});

describe("geometría con π exacto", () => {
  it("área círculo r=2 → 4π exacto", () => {
    const r = run("area-circulo", { r: 2 }, { exact: true });
    expect(r.exactLatex).toBe("4\\pi");
  });
});

describe("funciones", () => {
  it("pendiente exacta como fracción", () => {
    const r = run("pendiente", { x1: 0, y1: 0, x2: 4, y2: 2 }, { exact: true });
    expect(r.exactLatex).toBe("\\frac{1}{2}");
  });
  it("pendiente vertical indefinida", () => {
    const r = run("pendiente", { x1: 1, y1: 0, x2: 1, y2: 5 });
    expect(r.note).toMatch(/vertical/);
  });
  it("punto medio", () => {
    const r = run("punto-medio", { x1: 0, y1: 0, x2: 4, y2: 6 });
    expect(r.decimal).toBe("(2, 3)");
  });
});

describe("estadística (listas)", () => {
  it("media", () => {
    expect(run("media", { values: [2, 4, 6] }).decimal).toBe("4");
  });
  it("mediana impar y par", () => {
    expect(run("mediana", { values: [3, 1, 2] }).decimal).toBe("2");
    expect(run("mediana", { values: [1, 2, 3, 4] }).decimal).toBe("2.5");
  });
  it("desvío poblacional vs muestral", () => {
    const pob = run("desvio-estandar", { values: [2, 4, 6] }, { variant: "poblacional" });
    const mue = run("desvio-estandar", { values: [2, 4, 6] }, { variant: "muestral" });
    expect(Number(pob.decimal)).toBeCloseTo(1.632993, 4);
    expect(Number(mue.decimal)).toBeCloseTo(2, 6);
  });
});

describe("conversión de ángulos", () => {
  it("180° → π exacto", () => {
    const r = run("conversion-angulos", { deg: 180 }, { variant: "aRad", exact: true });
    expect(r.exactLatex).toBe("\\pi");
  });
  it("90° → π/2 exacto", () => {
    const r = run("conversion-angulos", { deg: 90 }, { variant: "aRad", exact: true });
    expect(r.exactLatex).toBe("\\frac{1}{2}\\pi");
  });
});
