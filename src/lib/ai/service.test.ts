import { describe, it, expect } from "vitest";
import { extractJson, repairJson } from "./service";

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
