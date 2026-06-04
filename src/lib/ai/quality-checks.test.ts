import { describe, it, expect } from "vitest";
import { checkArtificialPatterns, checkStatementMutation, checkClosestOptionFraud } from "./quality-checks";

describe("checkClosestOptionFraud — DETECTA 'opción más cercana'", () => {
  const malos = [
    "El rango es [-10, 17]. Ninguna opción coincide, la opción más cercana es [-7,35].",
    "Como ninguna de las opciones es correcta, elegimos la más cercana.",
    "La respuesta más parecida es 18.",
    "Aunque no coincide exactamente, marcamos esa opción.",
    "Es la opción esperada según las alternativas.",
    "Tomamos la opción que más se aproxima al resultado.",
    "Aproximadamente coincide con la tercera opción.",
  ];
  for (const t of malos) {
    it(`detecta: "${t}"`, () => {
      expect(checkClosestOptionFraud(t).ok).toBe(false);
    });
  }
});

describe("checkClosestOptionFraud — NO marca legítimo", () => {
  const buenos = [
    "Hallá el punto más cercano al origen.", // geometría, no opciones
    "La opción correcta es la B porque x = 2.",
    "Evaluamos cada opción y la verdadera es 17.",
    "El número más cercano a pi entre los enteros es 3.",
  ];
  for (const t of buenos) {
    it(`acepta: "${t}"`, () => {
      expect(checkClosestOptionFraud(t).ok).toBe(true);
    });
  }
});

describe("checkStatementMutation — DETECTA mutación de consigna", () => {
  const malos = [
    "Como p(2)=0, corrijamos el divisor a (x+2).",
    "La respuesta esperada era 4, así que ajustamos.",
    "El resultado esperado era 6 según la guía.",
    "Según lo esperado, el resto debería ser 4.",
    "Para que coincida con la opción, usamos (x+2).",
    "Usar (x+2) en vez de (x-2) para obtener 4.",
    "En vez de (x-2) tomamos el divisor (x+2).",
    "Redefinimos la consigna para que dé entero.",
  ];
  for (const t of malos) {
    it(`detecta: "${t}"`, () => {
      const r = checkStatementMutation(t);
      expect(r.ok).toBe(false);
    });
  }
});

describe("checkStatementMutation — NO marca explicaciones legítimas", () => {
  const buenos = [
    "Aplicamos el teorema del resto: evaluamos p(2) = 0, el resto es 0.",
    "Resolvemos 2x + 3 = 7, despejamos x = 2.",
    "Factorizamos x^2 - 4 = (x+2)(x-2).",
    "El divisor es (x-2), entonces evaluamos en x=2.",
    "Calculamos el área multiplicando base por altura.",
  ];
  for (const t of buenos) {
    it(`acepta: "${t}"`, () => {
      expect(checkStatementMutation(t).ok).toBe(true);
    });
  }
});

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
