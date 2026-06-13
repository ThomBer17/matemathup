/**
 * Evaluador de expresiones unificado. Fuente única usada por:
 *  - la página /tools/calculator (vía re-export en calculator.ts),
 *  - la Calculadora flotante (components/calculator/Calculator.tsx),
 *  - el parseo de inputs de la herramienta Fórmulas.
 *
 * Seguro por diseño: funciones y constantes se inyectan como argumentos de
 * `new Function` y TODO identificador del input debe estar en la whitelist;
 * cualquier otro (window, constructor, variable suelta) hace fallar la evaluación.
 *
 * Soporta: + - * / ^ ( ) , decimales (. o ,), fracciones a/b, símbolos unicode
 * (× ÷ − · √ π), trig con modo grados/radianes, inversas (asin/arcsin/…),
 * sqrt/cbrt/abs/exp/ln/log/log2 y constantes pi y e.
 */

export type AngleMode = "rad" | "deg";

export type EvalResult = { ok: true; value: number } | { ok: false; error: string };

const CHAR = {
  minus: String.fromCharCode(0x2212), // −
  middot: String.fromCharCode(0x00b7), // ·
  times: String.fromCharCode(0x00d7), // ×
  divide: String.fromCharCode(0x00f7), // ÷
  sqrt: String.fromCharCode(0x221a), // √
  pi: String.fromCharCode(0x03c0), // π
};

function buildScope(mode: AngleMode): Record<string, unknown> {
  const toRad = (x: number) => (mode === "deg" ? (x * Math.PI) / 180 : x);
  const fromRad = (x: number) => (mode === "deg" ? (x * 180) / Math.PI : x);
  const asin = (x: number) => fromRad(Math.asin(x));
  const acos = (x: number) => fromRad(Math.acos(x));
  const atan = (x: number) => fromRad(Math.atan(x));
  const sin = (x: number) => Math.sin(toRad(x));
  const cos = (x: number) => Math.cos(toRad(x));
  const tan = (x: number) => Math.tan(toRad(x));
  return {
    sin,
    sen: sin,
    cos,
    tan,
    asin,
    arcsin: asin,
    arcsen: asin,
    acos,
    arccos: acos,
    atan,
    arctan: atan,
    sqrt: Math.sqrt,
    cbrt: Math.cbrt,
    abs: Math.abs,
    exp: Math.exp,
    ln: Math.log,
    log: Math.log10,
    log2: Math.log2,
    min: Math.min,
    max: Math.max,
    pow: Math.pow,
    pi: Math.PI,
    e: Math.E,
  };
}

// Whitelist = todas las claves posibles del scope (se arma una vez).
const ALLOWED = new Set<string>(Object.keys(buildScope("rad")));

/** Normaliza símbolos unicode a su forma ASCII evaluable. */
function normalize(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .split(CHAR.minus)
    .join("-")
    .split(CHAR.middot)
    .join("*")
    .split(CHAR.times)
    .join("*")
    .split(CHAR.divide)
    .join("/")
    .split(CHAR.pi)
    .join("pi")
    .replace(/√\s*\(/g, "sqrt(") // √( → sqrt(
    .replace(/√\s*(\d+(?:[.,]\d+)?)/g, "sqrt($1)") // √2 → sqrt(2)
    .replace(/√/g, "sqrt")
    .replace(/(\d),(\d)/g, "$1.$2") // coma decimal → punto
    .replace(/\^/g, "**"); // potencia
}

export function evaluate(raw: string, mode: AngleMode = "rad"): EvalResult {
  if (!raw || !raw.trim()) return { ok: false, error: "Escribí una expresión." };

  const expr = normalize(raw);

  const idents = expr.match(/[a-z]+/g) ?? [];
  const unknown = idents.find((id) => !ALLOWED.has(id));
  if (unknown) return { ok: false, error: `No reconozco "${unknown}".` };

  const stripped = expr.replace(/[a-z]+/g, "");
  if (/[^\d+\-*/.(),\s]/.test(stripped)) {
    return { ok: false, error: "La expresión tiene caracteres no válidos." };
  }

  const scope = buildScope(mode);
  const names = Object.keys(scope);
  try {
    const fn = new Function(...names, `"use strict"; return (${expr});`);
    const value = fn(...names.map((n) => scope[n]));
    if (typeof value !== "number" || !isFinite(value)) {
      return { ok: false, error: "El resultado no es un número válido." };
    }
    return { ok: true, value };
  } catch {
    return { ok: false, error: "No pude evaluar la expresión. Revisá los paréntesis." };
  }
}

/** Parseo de un valor de input suelto ("3/4", "1.5", "√2", "pi/6"). null si inválido. */
export function parseValue(raw: string, mode: AngleMode = "rad"): number | null {
  const r = evaluate(raw, mode);
  return r.ok ? r.value : null;
}
