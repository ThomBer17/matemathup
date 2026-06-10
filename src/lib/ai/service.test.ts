import { describe, it, expect } from "vitest";
import { extractJson, repairJson, fixJsonBackslashes } from "./service";

describe("fixJsonBackslashes", () => {
  it("escapa LaTeX con \\s (inválido) → parseable", () => {
    // contenido real del modelo: {"s":"$\sqrt{2}$"} (un solo backslash, JSON inválido)
    const raw = '{"s":"$\\sqrt{2}$"}';
    expect(() => JSON.parse(raw)).toThrow();
    expect(JSON.parse(fixJsonBackslashes(raw))).toEqual({ s: "$\\sqrt{2}$" });
  });

  it("corrige \\frac (que sin escapar corrompe a form-feed)", () => {
    // {"s":"$\frac{1}{2}$"} → con \f sin escapar, JSON.parse mete un form-feed.
    const raw = '{"s":"$\\frac{1}{2}$"}';
    expect(JSON.parse(fixJsonBackslashes(raw))).toEqual({ s: "$\\frac{1}{2}$" });
  });

  it("conserva escapes JSON válidos (\\\\, \\\", \\uXXXX)", () => {
    expect(JSON.parse(fixJsonBackslashes('{"s":"a\\\\b"}'))).toEqual({ s: "a\\b" });
    expect(JSON.parse(fixJsonBackslashes('{"s":"a\\"b"}'))).toEqual({ s: 'a"b' });
    expect(JSON.parse(fixJsonBackslashes('{"s":"\\u00e9"}'))).toEqual({ s: "é" });
  });

  it("JSON sin backslashes queda intacto", () => {
    expect(JSON.parse(fixJsonBackslashes('{"a":1,"b":"hola"}'))).toEqual({ a: 1, b: "hola" });
  });

  it("escapa saltos de línea crudos dentro de strings", () => {
    // {"s":"linea1<LF>linea2"} con un salto de línea REAL → JSON.parse lo rechaza.
    const raw = '{"s":"linea1\nlinea2"}';
    expect(() => JSON.parse(raw)).toThrow();
    expect(JSON.parse(fixJsonBackslashes(raw))).toEqual({ s: "linea1\nlinea2" });
  });

  it("no toca llaves/saltos fuera de strings", () => {
    const raw = '{\n  "a": 1,\n  "b": "$\\theta$"\n}';
    expect(JSON.parse(fixJsonBackslashes(raw))).toEqual({ a: 1, b: "$\\theta$" });
  });
});

describe("extractJson", () => {
  it("saca fences markdown", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });
  it("recorta preámbulo y epílogo", () => {
    expect(extractJson('Acá está: {"a":1} listo')).toBe('{"a":1}');
  });
});

describe("repairJson", () => {
  it("quita comas colgantes", () => {
    expect(JSON.parse(repairJson('{"a":1,"b":2,}'))).toEqual({ a: 1, b: 2 });
    expect(JSON.parse(repairJson('{"l":[1,2,3,]}'))).toEqual({ l: [1, 2, 3] });
  });

  it("cierra objeto truncado", () => {
    const truncated = '{"statement":"Resolvé 2x=4","type":"open"';
    expect(JSON.parse(repairJson(truncated))).toEqual({
      statement: "Resolvé 2x=4",
      type: "open",
    });
  });

  it("cierra string y contenedores truncados", () => {
    const truncated = '{"statement":"Calculá el seno de un áng';
    const repaired = JSON.parse(repairJson(truncated));
    expect(repaired.statement).toBe("Calculá el seno de un áng");
  });

  it("cierra arrays anidados truncados", () => {
    const truncated = '{"options":["a","b","c"';
    expect(JSON.parse(repairJson(truncated))).toEqual({ options: ["a", "b", "c"] });
  });

  it("JSON ya válido queda igual", () => {
    expect(JSON.parse(repairJson('{"a":1}'))).toEqual({ a: 1 });
  });

  it("no rompe comas dentro de strings", () => {
    expect(JSON.parse(repairJson('{"a":"x, y, z"}'))).toEqual({ a: "x, y, z" });
  });
});
