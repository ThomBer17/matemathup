/**
 * Chequeos deterministas de coherencia entre la consigna y la respuesta.
 *
 * No es un CAS — no resuelve matemática arbitraria. Cubre clases de
 * inconsistencia detectables sin resolver el problema completo:
 *  - "expresá el resultado en el intervalo (a, b)" pero la answer key no ∈ (a, b)
 *
 * Diseñado conservador: si no puede parsear con certeza, NO rechaza
 * (devuelve ok) para evitar falsos positivos que bloqueen ejercicios válidos.
 *
 * Nota: los símbolos no-ASCII en los regex usan escapes \u porque los literales
 * crudos pueden romperse al pasar por transpiladores (esbuild/vitest).
 */

export interface ConsistencyResult {
  ok: boolean;
  reason?: string;
}

interface Interval {
  lo: number;
  hi: number;
  loOpen: boolean;
  hiOpen: boolean;
}

/**
 * Convierte un literal numérico simple a number.
 * Soporta: enteros, decimales (con , o .), fracciones a/b, signo, raíz simple.
 * Devuelve null si no es un valor numérico simple e inequívoco.
 */
// Símbolos no-ASCII construidos por codepoint para evitar literales crudos
// en el source (que algunos transpiladores manejan mal dentro de regex).
const CHAR = {
  minus: String.fromCharCode(0x2212), // −
  middot: String.fromCharCode(0x00b7), // ·
  times: String.fromCharCode(0x00d7), // ×
  divide: String.fromCharCode(0x00f7), // ÷
  sqrt: String.fromCharCode(0x221a), // √
};
const SQRT_RE = new RegExp(
  `${CHAR.sqrt}\\s*\\(?\\s*(\\d+(?:[.,]\\d+)?)\\s*\\)?`,
  "g",
);

export function parseNumericValue(raw: string): number | null {
  let s = raw.trim().toLowerCase();
  if (!s) return null;

  s = s
    .split(CHAR.minus).join("-")
    .split(CHAR.middot).join("*")
    .split(CHAR.times).join("*")
    .split(CHAR.divide).join("/")
    // OJO con el orden: primero el sqrt() textual, después el √ unicode.
    // Si fuera al revés, el √ produce "Math.sqrt(n)" y el regex textual
    // re-matchearía ese "sqrt(n)" generando "Math.Math.sqrt(n)".
    .replace(/sqrt\s*\(\s*(\d+(?:[.,]\d+)?)\s*\)/g, "Math.sqrt($1)")
    .replace(SQRT_RE, "Math.sqrt($1)")
    .replace(/(\d),(\d)/g, "$1.$2"); // coma decimal -> punto

  // Solo permitimos un set seguro de caracteres tras normalizar
  const safe = s.replace(/math\.sqrt/gi, "").replace(/[\d+\-*/.()\s]/g, "");
  if (safe.length > 0) return null;

  try {
    // eslint-disable-next-line no-new-func
    const val = new Function(`"use strict"; return (${s});`)();
    if (typeof val === "number" && isFinite(val)) return val;
    return null;
  } catch {
    return null;
  }
}

/**
 * Detecta un intervalo en la consigna SOLO si aparece la palabra "intervalo"
 * (evita confundir pares ordenados / args de función con intervalos).
 */
export function parseIntervalFromStatement(statement: string): Interval | null {
  if (!/intervalo/i.test(statement)) return null;

  // Busca patrones tipo (a, b)  [a, b]  (a, b]  [a, b)
  const m = statement.match(
    /([[(])\s*(-?\d+(?:[.,]\d+)?(?:\/\d+)?)\s*[;,]\s*(-?\d+(?:[.,]\d+)?(?:\/\d+)?)\s*([\])])/,
  );
  if (!m) return null;

  const lo = parseNumericValue(m[2]);
  const hi = parseNumericValue(m[3]);
  if (lo === null || hi === null) return null;

  return {
    lo: Math.min(lo, hi),
    hi: Math.max(lo, hi),
    loOpen: m[1] === "(",
    hiOpen: m[4] === ")",
  };
}

function inInterval(value: number, iv: Interval): boolean {
  const aboveLo = iv.loOpen ? value > iv.lo : value >= iv.lo;
  const belowHi = iv.hiOpen ? value < iv.hi : value <= iv.hi;
  return aboveLo && belowHi;
}

/**
 * Verifica que, si la consigna pide que el resultado esté en un intervalo,
 * la answer key numérica efectivamente pertenezca a ese intervalo.
 */
export function checkIntervalConsistency(
  statement: string,
  correctAnswer: string,
): ConsistencyResult {
  const iv = parseIntervalFromStatement(statement);
  if (!iv) return { ok: true };

  const value = parseNumericValue(correctAnswer);
  if (value === null) return { ok: true }; // no podemos verificar → no bloqueamos

  if (!inInterval(value, iv)) {
    const loB = iv.loOpen ? "(" : "[";
    const hiB = iv.hiOpen ? ")" : "]";
    return {
      ok: false,
      reason: `la respuesta ${value} no pertenece al intervalo pedido ${loB}${iv.lo}, ${iv.hi}${hiB}`,
    };
  }
  return { ok: true };
}

/** Punto de entrada agregador para futuros chequeos de coherencia. */
export function checkConsistency(
  statement: string,
  correctAnswer: string,
): ConsistencyResult {
  return checkIntervalConsistency(statement, correctAnswer);
}
