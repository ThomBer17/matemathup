import { describe, it, expect } from "vitest";
import { getTopicScope, validateInScope } from "./curriculum";

describe("getTopicScope", () => {
  it("matchea por slug exacto", () => {
    const scope = getTopicScope("numeros-reales");
    expect(scope.concepts.length).toBeGreaterThan(3);
    expect(scope.outOfScopeKeywords).toContain("taylor");
  });

  it("matchea por nombre humano con acentos", () => {
    const a = getTopicScope("Números Reales");
    const b = getTopicScope("numeros-reales");
    expect(a.description).toBe(b.description);
  });

  it("resuelve aliases", () => {
    const real = getTopicScope("numeros-reales");
    expect(getTopicScope("reales").description).toBe(real.description);
    expect(getTopicScope("Trigo").description).toBe(getTopicScope("trigonometria").description);
  });

  it("devuelve fallback para temas no mapeados, con keywords genéricas", () => {
    const fb = getTopicScope("Topología algebraica");
    expect(fb.outOfScopeKeywords).toContain("taylor");
    expect(fb.outOfScopeKeywords).toContain("ecuaciones diferenciales");
  });
});

describe("validateInScope", () => {
  it("detecta Taylor en un texto de Números Reales", () => {
    const scope = getTopicScope("numeros-reales");
    const res = validateInScope("Calcular la serie de Taylor de sin(x)", scope);
    expect(res.inScope).toBe(false);
    if (!res.inScope) expect(res.matched).toBe("taylor");
  });

  it("permite vocabulario propio del tema", () => {
    const scope = getTopicScope("numeros-reales");
    const res = validateInScope("Clasificá los siguientes números como racionales o irracionales", scope);
    expect(res.inScope).toBe(true);
  });

  it("es accent-insensitive", () => {
    const scope = getTopicScope("derivadas");
    // 'integral' está en out-of-scope de derivadas
    const res = validateInScope("Calcula la integrál de la función", scope);
    expect(res.inScope).toBe(false);
  });

  it("usa word boundaries — no falsea positivos por substrings", () => {
    const scope = getTopicScope("numeros-reales");
    // "matriz" está en out-of-scope, pero "matrícula" no debería matchear
    const res = validateInScope("Calculá la matrícula del alumno", scope);
    expect(res.inScope).toBe(true);
  });
});
