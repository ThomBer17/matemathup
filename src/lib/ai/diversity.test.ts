import { describe, it, expect } from "vitest";
import { tokenize, jaccard, mostSimilar, validateDiversity } from "./diversity";

describe("tokenize", () => {
  it("strip de stopwords y palabras cortas", () => {
    const tokens = tokenize("El gato y la rana en la casa");
    expect(tokens.has("el")).toBe(false);
    expect(tokens.has("la")).toBe(false);
    expect(tokens.has("y")).toBe(false);
    expect(tokens.has("en")).toBe(false);
    expect(tokens.has("gato")).toBe(true);
    expect(tokens.has("rana")).toBe(true);
    expect(tokens.has("casa")).toBe(true);
  });

  it("normaliza acentos y mayúsculas", () => {
    const a = tokenize("Cálculo de área");
    const b = tokenize("calculo de area");
    expect(a).toEqual(b);
  });
});

describe("jaccard", () => {
  it("conjuntos idénticos → 1", () => {
    const s = new Set(["a", "b", "c"]);
    expect(jaccard(s, s)).toBe(1);
  });

  it("conjuntos disjuntos → 0", () => {
    expect(jaccard(new Set(["a"]), new Set(["b"]))).toBe(0);
  });

  it("solapamiento parcial", () => {
    const a = new Set(["a", "b", "c"]);
    const b = new Set(["b", "c", "d"]);
    expect(jaccard(a, b)).toBeCloseTo(2 / 4); // 2 intersección, 4 unión
  });
});

describe("mostSimilar", () => {
  it("devuelve null si pool vacío", () => {
    expect(mostSimilar("hola mundo", [])).toBeNull();
  });

  it("encuentra el más parecido y devuelve score", () => {
    const result = mostSimilar("Calculá el seno de 30 grados", [
      "Hallá el área de un círculo",
      "Calculá el seno de 60 grados",
      "Resolvé la ecuación cuadrática",
    ]);
    expect(result).not.toBeNull();
    expect(result!.text).toContain("seno de 60");
    expect(result!.score).toBeGreaterThan(0.3);
  });
});

describe("validateDiversity", () => {
  it("acepta tanda con enunciados realmente distintos", () => {
    const res = validateDiversity([
      { titulo: "Ej 1", enunciado: "Clasificá si pi es racional o irracional" },
      { titulo: "Ej 2", enunciado: "Resolvé la inecuación 2x + 3 > 7" },
      { titulo: "Ej 3", enunciado: "Calculá el área de un triángulo de base 5 y altura 4" },
    ]);
    expect(res.ok).toBe(true);
  });

  it("rechaza duplicados literales de enunciado", () => {
    const res = validateDiversity([
      { titulo: "A", enunciado: "Calculá el seno de 30" },
      { titulo: "B", enunciado: "Calculá el seno de 30" },
      { titulo: "C", enunciado: "Calculá el coseno de 60" },
    ]);
    expect(res.ok).toBe(false);
  });

  it("rechaza near-duplicates con alto Jaccard", () => {
    const res = validateDiversity([
      { titulo: "Ej 1", enunciado: "Resolvé la ecuación 2x + 5 = 13 hallando el valor de x" },
      { titulo: "Ej 2", enunciado: "Resolvé la ecuación 3x + 7 = 16 hallando el valor de x" },
      { titulo: "Ej 3", enunciado: "Calculá el área del círculo de radio 10" },
    ]);
    expect(res.ok).toBe(false);
  });
});
