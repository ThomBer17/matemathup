/**
 * Evaluador de expresiones para la Calculadora (/tools/calculator).
 *
 * No es un CAS: evalúa una expresión numérica a un número. Seguro por diseño —
 * las funciones y constantes se inyectan como argumentos de `new Function` y
 * TODO identificador del input debe estar en la whitelist; cualquier otro
 * (window, constructor, una variable suelta…) hace fallar la evaluación.
 *
 * Soporta: + - * / ^ ( ) , decimales (con . o ,), funciones trig (con modo
 * grados/radianes), sqrt/cbrt/abs/exp/ln/log/log2, y constantes pi y e.
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

// Identificadores permitidos: funciones + constantes. Todo lo demás se rechaza.
const FN_NAMES = [
  "sin",
  "cos",
  "tan",
  "asin",
  "acos",
  "atan",
  "sqrt",
  "cbrt",
  "abs",
  "exp",
  "ln",
  "log",
  "log2",
  "min",
  "max",
  "pow",
] as const;
const CONST_NAMES = ["pi", "e"] as const;
const ALLOWED = new Set<string>([...FN_NAMES, ...CONST_NAMES]);

function buildScope(mode: AngleMode) {
  const toRad = (x: number) => (mode === "deg" ? (x * Math.PI) / 180 : x);
  const fromRad = (x: number) => (mode === "deg" ? (x * 180) / Math.PI : x);
  return {
    sin: (x: number) => Math.sin(toRad(x)),
    cos: (x: number) => Math.cos(toRad(x)),
    tan: (x: number) => Math.tan(toRad(x)),
    asin: (x: number) => fromRad(Math.asin(x)),
    acos: (x: number) => fromRad(Math.acos(x)),
    atan: (x: number) => fromRad(Math.atan(x)),
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
  } as Record<string, unknown>;
}

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
    .replace(/√\s*/g, "sqrt") // √ → sqrt (espera paréntesis: √(2) → sqrt(2))
    .replace(/(\d),(\d)/g, "$1.$2") // coma decimal → punto
    .replace(/\^/g, "**"); // potencia
}

export function evaluateExpression(raw: string, mode: AngleMode = "rad"): EvalResult {
  if (!raw || !raw.trim()) return { ok: false, error: "Escribí una expresión." };

  const expr = normalize(raw);

  // Validación: todo identificador (secuencia de letras) debe estar permitido.
  const idents = expr.match(/[a-z]+/g) ?? [];
  const unknown = idents.find((id) => !ALLOWED.has(id));
  if (unknown) return { ok: false, error: `No reconozco "${unknown}".` };

  // Caracteres permitidos tras quitar identificadores: dígitos, operadores, etc.
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

/** Formatea el resultado: hasta 10 cifras significativas, sin ceros colgando. */
export function formatResult(value: number): string {
  if (Number.isInteger(value)) return String(value);
  const r = Number(value.toPrecision(10));
  return String(r);
}
