import { describe, it, expect } from "vitest";
import { evaluateExpression, formatResult } from "./calculator";

const PI = String.fromCharCode(0x03c0);
const TIMES = String.fromCharCode(0x00d7);
const MINUS = String.fromCharCode(0x2212);

describe("evaluateExpression — aritmética", () => {
  it("respeta precedencia y paréntesis", () => {
    expect(evaluateExpression("2 + 3 * 4")).toEqual({ ok: true, value: 14 });
    expect(evaluateExpression("(2 + 3) * 4")).toEqual({ ok: true, value: 20 });
  });

  it("potencia con ^", () => {
    expect(evaluateExpression("2^10")).toEqual({ ok: true, value: 1024 });
  });

  it("acepta coma decimal y símbolos unicode (× −)", () => {
    expect(evaluateExpression(`1,5 ${TIMES} 2`)).toEqual({ ok: true, value: 3 });
    expect(evaluateExpression(`5 ${MINUS} 8`)).toEqual({ ok: true, value: -3 });
  });
});

describe("evaluateExpression — funciones y constantes", () => {
  it("sqrt y abs", () => {
    expect(evaluateExpression("sqrt(16)")).toEqual({ ok: true, value: 4 });
    expect(evaluateExpression("abs(-7)")).toEqual({ ok: true, value: 7 });
  });

  it("constante pi (texto y símbolo)", () => {
    const a = evaluateExpression("pi");
    const b = evaluateExpression(PI);
    expect(a.ok && Math.abs(a.value - Math.PI) < 1e-9).toBe(true);
    expect(b.ok && Math.abs(b.value - Math.PI) < 1e-9).toBe(true);
  });

  it("trig en radianes por defecto", () => {
    const r = evaluateExpression("sin(0)");
    expect(r).toEqual({ ok: true, value: 0 });
  });

  it("trig en grados con modo deg", () => {
    const r = evaluateExpression("sin(30)", "deg");
    expect(r.ok && Math.abs(r.value - 0.5) < 1e-9).toBe(true);
  });

  it("ln y log distinguen base", () => {
    const ln = evaluateExpression("ln(e)");
    const log = evaluateExpression("log(1000)");
    expect(ln.ok && Math.abs(ln.value - 1) < 1e-9).toBe(true);
    expect(log.ok && Math.abs(log.value - 3) < 1e-9).toBe(true);
  });
});

describe("evaluateExpression — seguridad y errores", () => {
  it("rechaza identificadores desconocidos", () => {
    expect(evaluateExpression("window").ok).toBe(false);
    expect(evaluateExpression("(2).constructor").ok).toBe(false);
    expect(evaluateExpression("foo(2)").ok).toBe(false);
  });

  it("rechaza expresión vacía", () => {
    expect(evaluateExpression("   ").ok).toBe(false);
  });

  it("rechaza resultado no finito (división por cero)", () => {
    expect(evaluateExpression("1/0").ok).toBe(false);
  });

  it("rechaza sintaxis rota", () => {
    expect(evaluateExpression("2 +* 3").ok).toBe(false);
    expect(evaluateExpression("(2 + 3").ok).toBe(false);
  });
});

describe("formatResult", () => {
  it("enteros sin decimales", () => {
    expect(formatResult(4)).toBe("4");
  });
  it("recorta ruido de punto flotante", () => {
    expect(formatResult(0.1 + 0.2)).toBe("0.3");
  });
});
