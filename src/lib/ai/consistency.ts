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

const INTERVAL_TOKEN = /([[(])\s*(-?\d+(?:[.,]\d+)?(?:\/\d+)?)\s*[;,]\s*(-?\d+(?:[.,]\d+)?(?:\/\d+)?)\s*([\])])/g;

/** Todos los intervalos presentes en un texto (sin requerir la palabra "intervalo"). */
export function findIntervals(text: string): Interval[] {
  const out: Interval[] = [];
  const re = new RegExp(INTERVAL_TOKEN);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const lo = parseNumericValue(m[2]);
    const hi = parseNumericValue(m[3]);
    if (lo === null || hi === null) continue;
    out.push({
      lo: Math.min(lo, hi),
      hi: Math.max(lo, hi),
      loOpen: m[1] === "(",
      hiOpen: m[4] === ")",
    });
  }
  return out;
}

function intervalsEqual(a: Interval, b: Interval): boolean {
  const tol = Math.max(1e-6, 1e-4 * Math.max(Math.abs(a.lo), Math.abs(a.hi), Math.abs(b.lo), Math.abs(b.hi), 1));
  return (
    Math.abs(a.lo - b.lo) <= tol &&
    Math.abs(a.hi - b.hi) <= tol &&
    a.loOpen === b.loOpen &&
    a.hiOpen === b.hiOpen // x>3 ≠ x≥3: la apertura importa
  );
}

function fmtInterval(iv: Interval): string {
  return `${iv.loOpen ? "(" : "["}${iv.lo}, ${iv.hi}${iv.hiOpen ? ")" : "]"}`;
}

/**
 * Coherencia de intervalos: si la answer key es un intervalo y la explicación
 * concluye un intervalo distinto, la key es la sospechosa → mismatch.
 * Cubre el caso MC "el resultado es [-10,17] pero marcó [-7,35]".
 */
export function checkIntervalAnswerKey(
  explanation: string,
  correctAnswer: string,
): ConsistencyResult {
  const keyIvs = findIntervals(correctAnswer);
  if (keyIvs.length === 0 || !explanation) return { ok: true };
  const keyIv = keyIvs[0];

  const explIvs = findIntervals(explanation);
  if (explIvs.length === 0) return { ok: true };
  const concluded = explIvs[explIvs.length - 1]; // el último mencionado = la conclusión

  if (!intervalsEqual(concluded, keyIv)) {
    return {
      ok: false,
      reason: `answer_key_mismatch: la explicación concluye ${fmtInterval(concluded)} pero answer_key="${correctAnswer}"`,
    };
  }
  return { ok: true };
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

/**
 * MATH > ANSWER KEY: si la explicación concluye un resultado numérico etiquetado
 * (ej: "el resto es 0", "por lo tanto 5") que NO coincide con la answer key numérica,
 * la key es la sospechosa → marcamos mismatch para regenerar (nunca alterar la cuenta).
 *
 * Conservador: solo aplica cuando la answer key es un número simple y la explicación
 * tiene un resultado claramente etiquetado. Respuestas algebraicas (x=2) se ignoran.
 */
export function checkAnswerKeyConsistency(
  explanation: string,
  correctAnswer: string,
): ConsistencyResult {
  const key = parseNumericValue(correctAnswer);
  if (key === null || !explanation) return { ok: true };

  // Captura números precedidos por un marcador de RESULTADO FINAL de alta precisión.
  // Evitamos "entonces/por lo tanto/obtenemos" porque suelen preceder una ecuación
  // o un paso intermedio (ej. "entonces 3x = 6" capturaría el coeficiente 3).
  // El lookahead (?![\d.,]*[a-zA-Z]) descarta coeficientes como "3x".
  const re =
    /(?:el resto|el resultado(?:\s+final)?|la respuesta|en conclusi[oó]n|da como resultado|es igual a|el cociente|el valor final)\s*(?:es|:|=|vale)?\s*(-?\d[\d.,]*(?:\s*\/\s*\d+)?)(?![\d.,]*[a-zA-Z])/gi;

  let m: RegExpExecArray | null;
  let concluded: number | null = null;
  while ((m = re.exec(explanation)) !== null) {
    const v = parseNumericValue(m[1]);
    if (v !== null) concluded = v; // nos quedamos con el último resultado etiquetado
  }
  if (concluded === null) return { ok: true };

  const diff = Math.abs(concluded - key);
  const scale = Math.max(Math.abs(concluded), Math.abs(key), 1);
  if (diff > Math.max(0.05, 0.02 * scale)) {
    return {
      ok: false,
      reason: `answer_key_mismatch: la explicación concluye ${concluded} pero answer_key="${correctAnswer}"`,
    };
  }
  return { ok: true };
}

/** Punto de entrada agregador para chequeos de coherencia consigna/respuesta. */
export function checkConsistency(
  statement: string,
  correctAnswer: string,
  explanation = "",
): ConsistencyResult {
  const interval = checkIntervalConsistency(statement, correctAnswer);
  if (!interval.ok) return interval;
  const numericKey = checkAnswerKeyConsistency(explanation, correctAnswer);
  if (!numericKey.ok) return numericKey;
  return checkIntervalAnswerKey(explanation, correctAnswer);
}
