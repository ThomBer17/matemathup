import { describe, it, expect } from "vitest";
import { checkArtificialPatterns } from "./quality-checks";

describe("checkArtificialPatterns — debe DETECTAR (label específico)", () => {
  // Casos donde un patrón único debería matchear con su label exacto.
  const exactos: Array<[string, string]> = [
    ["error intencional", "error intencional"],
    ["después de restar 6 (error intencional)", "error intencional"],
    ["intencionalmente incorrecto", "intencionalmente incorrecto"],
    ["a propósito incorrecto", "a propósito incorrecto"],
    ["deliberadamente erróneo", "deliberadamente incorrecto"],
    ["modificamos la consigna", "cambio de consigna"],
    ["cambio el enunciado", "cambio de consigna"],
    ["reinterpreto la pregunta", "reinterpretación de consigna"],
    ["supongamos que en realidad es otra cosa", "supongamos en realidad"],
    ["la respuesta es 4/3 según la redacción", "post-hoc 'según la redacción'"],
    ["según el enunciado, la respuesta es B", "post-hoc 'según el enunciado'"],
    ["reinterpretando el problema", "reinterpretando"],
    ["interpretando que la respuesta sería", "interpretando que la respuesta"],
    ["la respuesta sería 3", "respuesta condicional 'sería'"],
    ["la respuesta buscada es 7", "respuesta buscada (post-hoc)"],
    ["invirtiendo el cociente", "inversión arbitraria del resultado"],
  ];

  for (const [texto, label] of exactos) {
    it(`detecta "${texto}" con label "${label}"`, () => {
      const res = checkArtificialPatterns(texto);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.matched).toBe(label);
    });
  }
});

describe("checkArtificialPatterns — debe DETECTAR (label ambiguo)", () => {
  // Casos que matchean varios patrones; basta con confirmar detección.
  const ambiguos = [
    "en realidad la respuesta era 5",
    "pero en realidad la respuesta es 3",
  ];

  for (const texto of ambiguos) {
    it(`detecta "${texto}"`, () => {
      const res = checkArtificialPatterns(texto);
      expect(res.ok).toBe(false);
    });
  }
});

describe("checkArtificialPatterns — NO debe falsear positivos", () => {
  const buenos = [
    "Calculá el seno de 30 grados",
    "La derivada de x^2 es 2x",
    "Si sin α = 3/5 entonces cos α = 4/5 y tan α = 3/4",
    "La afirmación es verdadera porque 2+2=4",
    "Resolvé la ecuación y verificá el resultado",
    "El área del triángulo es base por altura dividido 2",
    "Sustituyendo en la fórmula original obtenemos x = 5",
  ];

  for (const texto of buenos) {
    it(`acepta "${texto}"`, () => {
      const res = checkArtificialPatterns(texto);
      expect(res.ok).toBe(true);
    });
  }
});
