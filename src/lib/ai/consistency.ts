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

type IntervalSet = Interval[];

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
const SQRT_RE = new RegExp(`${CHAR.sqrt}\\s*\\(?\\s*(\\d+(?:[.,]\\d+)?)\\s*\\)?`, "g");

export function parseNumericValue(raw: string): number | null {
  let s = raw.trim().toLowerCase();
  if (!s) return null;

  s = s
    .replace(/[{}]/g, "")
    .split(CHAR.minus)
    .join("-")
    .split(CHAR.middot)
    .join("*")
    .split(CHAR.times)
    .join("*")
    .split(CHAR.divide)
    .join("/")
    // OJO con el orden: primero el sqrt() textual, después el √ unicode.
    // Si fuera al revés, el √ produce "Math.sqrt(n)" y el regex textual
    // re-matchearía ese "sqrt(n)" generando "Math.Math.sqrt(n)".
    .replace(/sqrt\s*\(\s*(\d+(?:[.,]\d+)?)\s*\)/g, "Math.sqrt($1)")
    .replace(SQRT_RE, "Math.sqrt($1)")
    .replace(/(\d|\))\s*(Math\.sqrt\()/g, "$1*$2")
    .replace(/(\d),(\d)/g, "$1.$2"); // coma decimal -> punto

  // Solo permitimos un set seguro de caracteres tras normalizar
  const safe = s.replace(/math\.sqrt/gi, "").replace(/[\d+\-*/.()\s]/g, "");
  if (safe.length > 0) return null;

  try {
    const val = new Function(`"use strict"; return (${s});`)();
    if (typeof val === "number" && isFinite(val)) return val;
    return null;
  } catch {
    return null;
  }
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) [x, y] = [y, x % y];
  return x || 1;
}

function fractionString(num: number, den: number): string {
  const g = gcd(num, den);
  return `${num / g}/${den / g}`;
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

function intersectIntervals(a: Interval, b: Interval): Interval | null {
  const lo = Math.max(a.lo, b.lo);
  const hi = Math.min(a.hi, b.hi);
  let loOpen: boolean;
  let hiOpen: boolean;

  if (a.lo > b.lo) loOpen = a.loOpen;
  else if (b.lo > a.lo) loOpen = b.loOpen;
  else loOpen = a.loOpen || b.loOpen;

  if (a.hi < b.hi) hiOpen = a.hiOpen;
  else if (b.hi < a.hi) hiOpen = b.hiOpen;
  else hiOpen = a.hiOpen || b.hiOpen;

  if (lo > hi) return null;
  if (lo === hi && (loOpen || hiOpen)) return null;
  return { lo, hi, loOpen, hiOpen };
}

function intersectSets(a: IntervalSet, b: IntervalSet): IntervalSet {
  const out: IntervalSet = [];
  for (const ia of a) {
    for (const ib of b) {
      const iv = intersectIntervals(ia, ib);
      if (iv) out.push(iv);
    }
  }
  return normalizeSet(out);
}

const INTERVAL_TOKEN =
  /([[(])\s*(-?\d+(?:[.,]\d+)?(?:\/\d+)?)\s*[;,]\s*(-?\d+(?:[.,]\d+)?(?:\/\d+)?)\s*([\])])/g;

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
  const tol = Math.max(
    1e-6,
    1e-4 * Math.max(Math.abs(a.lo), Math.abs(a.hi), Math.abs(b.lo), Math.abs(b.hi), 1),
  );
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
  // Solo el caso de UN intervalo simple; las uniones las cubre checkSolutionSetMatch
  // (comparar último-vs-primero en una unión daría falsos positivos).
  if (keyIvs.length !== 1 || !explanation) return { ok: true };
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

// ---- Coherencia conjunto-solución: explicación vs answer key (intervalos/uniones/desigualdades) ----

const LE = "≤"; // ≤
const GE = "≥"; // ≥
const CUP = "∪"; // ∪

/** Normaliza símbolos para parsear desigualdades e intervalos de forma uniforme. */
function normSym(s: string): string {
  return s.split(CHAR.minus).join("-").split(LE).join("<=").split(GE).join(">=");
}

interface IvTok {
  iv: Interval;
  start: number;
  end: number;
}

/**
 * Encuentra TODOS los "tokens de intervalo" en el texto (ya normalizado): tanto en
 * notación de corchetes [a,b] como desigualdades de dos lados (a ≤ x < b). Devuelve
 * también el texto normalizado para poder mirar los conectores entre tokens.
 */
function intervalTokens(textRaw: string): { toks: IvTok[]; text: string } {
  const text = normSym(textRaw);
  const toks: IvTok[] = [];

  // Corchetes: [a,b] (a,b) [a,b) (a,b]
  const reB = new RegExp(INTERVAL_TOKEN);
  let m: RegExpExecArray | null;
  while ((m = reB.exec(text)) !== null) {
    const lo = parseNumericValue(m[2]);
    const hi = parseNumericValue(m[3]);
    if (lo === null || hi === null) continue;
    toks.push({
      iv: {
        lo: Math.min(lo, hi),
        hi: Math.max(lo, hi),
        loOpen: m[1] === "(",
        hiOpen: m[4] === ")",
      },
      start: m.index,
      end: m.index + m[0].length,
    });
  }

  // Desigualdad de dos lados: num <op> var <op> num. La variable es UNA letra
  // (así "x-1 ≤ 3" como paso intermedio NO matchea; sí matchea "−2 ≤ x < 4").
  const reI =
    /(-?\d+(?:\.\d+)?(?:\/\d+)?)\s*(<=|<)\s*[a-zA-Z]\s*(<=|<)\s*(-?\d+(?:\.\d+)?(?:\/\d+)?)/g;
  while ((m = reI.exec(text)) !== null) {
    const lo = parseNumericValue(m[1]);
    const hi = parseNumericValue(m[4]);
    if (lo === null || hi === null) continue;
    toks.push({
      iv: { lo, hi, loOpen: m[2] === "<", hiOpen: m[3] === "<" },
      start: m.index,
      end: m.index + m[0].length,
    });
  }

  toks.sort((a, b) => a.start - b.start);
  return { toks, text };
}

function normalizeSet(ivs: Interval[]): Interval[] {
  return ivs.slice().sort((a, b) => a.lo - b.lo || a.hi - b.hi);
}

function setsEqual(a: Interval[], b: Interval[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((iv, i) => intervalsEqual(iv, b[i]));
}

function fmtSet(ivs: Interval[]): string {
  if (ivs.length === 0) return "∅";
  return ivs.map(fmtInterval).join(` ${CUP} `);
}

function parseAnswerIntervalSet(raw: string): IntervalSet | null {
  const normalized = normSym(raw)
    .replace(/∞|\+?inf(inito)?/gi, "Infinity")
    .replace(/-inf(inito)?/gi, "-Infinity")
    .replace(/sqrt\(([^)]+)\)/gi, "√($1)");
  if (/^[\s{}]*[∅Øø]\s*[\s{}]*$/i.test(normalized) || /\bvac[ií]o\b/i.test(normalized)) {
    return [];
  }

  const endpoint = String.raw`(?:-?Infinity|-?\d+(?:[.,]\d+)?(?:\/\d+)?(?:\s*[+-]\s*√\(?\d+(?:[.,]\d+)?\)?)?|√\(?\d+(?:[.,]\d+)?\)?)`;
  const re = new RegExp(String.raw`([[(])\s*(${endpoint})\s*[;,]\s*(${endpoint})\s*([\])])`, "gi");
  const out: IntervalSet = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(normalized)) !== null) {
    const lo = m[2] === "-Infinity" ? -Infinity : parseNumericValue(m[2]);
    const hi = m[3] === "Infinity" ? Infinity : parseNumericValue(m[3]);
    if (lo === null || hi === null) return null;
    out.push({
      lo: Math.min(lo, hi),
      hi: Math.max(lo, hi),
      loOpen: m[1] === "(",
      hiOpen: m[4] === ")",
    });
  }
  return out.length ? normalizeSet(out) : null;
}

// Marcadores de conclusión: si aparecen, miramos solo lo que viene DESPUÉS del último.
const CONCLUSION_MARKER =
  /(solución|solucion|resultado|respuesta|por lo tanto|finalmente|en conclusión|en conclusion|conjunto soluci|intervalo soluci)/gi;

/** Conjunto-solución que CONCLUYE la explicación (grupo de intervalos del final). */
function explanationConclusionSet(explanation: string): Interval[] {
  const { toks, text } = intervalTokens(explanation);
  if (toks.length === 0) return [];

  // Si hay marcador de conclusión, considerar solo tokens posteriores al último.
  let pool = toks;
  let lastMarker = -1;
  let mm: RegExpExecArray | null;
  const re = new RegExp(CONCLUSION_MARKER);
  while ((mm = re.exec(text)) !== null) lastMarker = mm.index;
  if (lastMarker >= 0) {
    const after = toks.filter((t) => t.start >= lastMarker);
    if (after.length > 0) pool = after;
  }

  // Grupo final: el último token + los anteriores unidos por un conector de unión.
  const group: Interval[] = [pool[pool.length - 1].iv];
  for (let i = pool.length - 1; i > 0; i--) {
    const gap = text.slice(pool[i - 1].end, pool[i].start);
    const unionLike = gap.length <= 8 && new RegExp(`[${CUP},;]|\\b[ouy]\\b`, "i").test(gap);
    if (unionLike) group.unshift(pool[i - 1].iv);
    else break;
  }
  return normalizeSet(group);
}

/**
 * DEFENSA CLAVE: el conjunto-solución que CONCLUYE la explicación debe coincidir
 * EXACTAMENTE con la answer key. Cubre el caso que se escapaba: explicación que
 * concluye [-2,4) (como intervalo o como desigualdad -2 ≤ x < 4) mientras la
 * answer key dice [-5,-1] ∪ [1,4]. Conservador: si alguno no parsea, no bloquea.
 */
export function checkSolutionSetMatch(
  explanation: string,
  correctAnswer: string,
): ConsistencyResult {
  const ansToks = intervalTokens(correctAnswer).toks;
  const ansSet = normalizeSet(ansToks.map((t) => t.iv));
  if (ansSet.length === 0 || !explanation) return { ok: true };

  const explSet = explanationConclusionSet(explanation);
  if (explSet.length === 0) return { ok: true };

  if (!setsEqual(explSet, ansSet)) {
    return {
      ok: false,
      reason: `explanation_answer_mismatch: la explicación concluye ${fmtSet(explSet)} pero answer_key="${correctAnswer}"`,
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

function normalizeStatementMath(raw: string): string {
  return normSym(raw)
    .replace(/\s+/g, " ")
    .replace(/\|/g, "|")
    .replace(/\^\{?2\}?|²/g, "^2")
    .replace(/√\s*\(?\s*([0-9.,]+)\s*\)?/g, "sqrt($1)")
    .replace(/−/g, "-");
}

function parseTwoSidedXInterval(statement: string): Interval | null {
  const s = normalizeStatementMath(statement);
  const re = /(-?\d+(?:[.,]\d+)?(?:\/\d+)?)\s*(<=|<)\s*x\s*(<=|<)\s*(-?\d+(?:[.,]\d+)?(?:\/\d+)?)/i;
  const m = re.exec(s);
  if (!m) return null;
  const lo = parseNumericValue(m[1]);
  const hi = parseNumericValue(m[4]);
  if (lo === null || hi === null) return null;
  return { lo, hi, loOpen: m[2] === "<", hiOpen: m[3] === "<" };
}

function parseLinearXExpression(raw: string): { a: number; b: number } | null {
  const s = normalizeStatementMath(raw).replace(/\s+/g, "");
  const m = /^([+-]?(?:\d+(?:[.,]\d+)?(?:\/\d+)?)?)\*?x([+-]\d+(?:[.,]\d+)?(?:\/\d+)?)?$/.exec(s);
  if (!m) return null;

  let a: number;
  if (m[1] === "" || m[1] === "+") a = 1;
  else if (m[1] === "-") a = -1;
  else {
    const parsed = parseNumericValue(m[1]);
    if (parsed === null) return null;
    a = parsed;
  }
  if (a === 0) return null;

  const b = m[2] ? parseNumericValue(m[2]) : 0;
  if (b === null) return null;
  return { a, b };
}

function parseTwoSidedLinearInequality(statement: string): Interval | null {
  const s = normalizeStatementMath(statement);
  const num = String.raw`-?\d+(?:[.,]\d+)?(?:\/\d+)?`;
  const linear = String.raw`[+-]?(?:\d+(?:[.,]\d+)?(?:\/\d+)?)?\s*\*?\s*x(?:\s*[+-]\s*\d+(?:[.,]\d+)?(?:\/\d+)?)?`;
  const re = new RegExp(String.raw`(${num})\s*(<=|<)\s*(${linear})\s*(<=|<)\s*(${num})`, "i");
  const m = re.exec(s);
  if (!m) return null;

  const left = parseNumericValue(m[1]);
  const expr = parseLinearXExpression(m[3]);
  const right = parseNumericValue(m[5]);
  if (left === null || !expr || right === null) return null;

  const lower: Interval = { lo: -Infinity, hi: Infinity, loOpen: true, hiOpen: true };
  const upper: Interval = { lo: -Infinity, hi: Infinity, loOpen: true, hiOpen: true };
  const leftBoundary = (left - expr.b) / expr.a;
  const rightBoundary = (right - expr.b) / expr.a;

  // left < ax+b  =>  ax+b > left
  if (expr.a > 0) {
    lower.lo = leftBoundary;
    lower.loOpen = m[2] === "<";
  } else {
    lower.hi = leftBoundary;
    lower.hiOpen = m[2] === "<";
  }

  // ax+b < right
  if (expr.a > 0) {
    upper.hi = rightBoundary;
    upper.hiOpen = m[4] === "<";
  } else {
    upper.lo = rightBoundary;
    upper.loOpen = m[4] === "<";
  }

  return intersectIntervals(lower, upper);
}

export function checkTwoSidedLinearInequality(
  statement: string,
  correctAnswer: string,
): ConsistencyResult {
  const expected = parseTwoSidedLinearInequality(statement);
  if (!expected) return { ok: true };

  const answerSet = parseAnswerIntervalSet(correctAnswer);
  if (answerSet === null) {
    return {
      ok: false,
      reason: `linear_inequality_mismatch: la solución es ${fmtSet([expected])} pero answer_key="${correctAnswer}"`,
    };
  }
  if (!setsEqual([expected], answerSet)) {
    return {
      ok: false,
      reason: `linear_inequality_mismatch: la solución es ${fmtSet([expected])} pero answer_key="${correctAnswer}"`,
    };
  }
  return { ok: true };
}

function parseAbsLinearConstraint(statement: string): IntervalSet | null {
  const s = normalizeStatementMath(statement);
  const re =
    /\|\s*x\s*([+-])\s*(\d+(?:[.,]\d+)?)\s*\|\s*(<=|<|>=|>)\s*(sqrt\(\d+(?:[.,]\d+)?\)|\d+(?:[.,]\d+)?(?:\/\d+)?)/i;
  const m = re.exec(s);
  if (!m) return null;
  const shift = parseNumericValue(m[2]);
  const radius = parseNumericValue(m[4]);
  if (shift === null || radius === null || radius < 0) return null;
  const center = m[1] === "-" ? shift : -shift;
  const op = m[3];
  if (op === "<" || op === "<=") {
    return [
      {
        lo: center - radius,
        hi: center + radius,
        loOpen: op === "<",
        hiOpen: op === "<",
      },
    ];
  }
  return normalizeSet([
    { lo: -Infinity, hi: center - radius, loOpen: true, hiOpen: op === ">" },
    { lo: center + radius, hi: Infinity, loOpen: op === ">", hiOpen: true },
  ]);
}

export function checkSimpleInequalitySystem(
  statement: string,
  correctAnswer: string,
): ConsistencyResult {
  if (!/simult[aá]neamente|intersect|conjunto\s+de\s+valores/i.test(statement)) {
    return { ok: true };
  }
  if (!/\|/.test(statement)) return { ok: true };

  const interval = parseTwoSidedXInterval(statement);
  const absSet = parseAbsLinearConstraint(statement);
  const answerSet = parseAnswerIntervalSet(correctAnswer);
  if (!interval || !absSet || answerSet === null) return { ok: true };

  const expected = intersectSets([interval], absSet);
  if (!setsEqual(expected, answerSet)) {
    return {
      ok: false,
      reason: `inequality_system_mismatch: la solución es ${fmtSet(expected)} pero answer_key="${correctAnswer}"`,
    };
  }
  return { ok: true };
}

export function checkTwoGirlsWithoutReplacement(
  statement: string,
  correctAnswer: string,
): ConsistencyResult {
  const s = statement.toLowerCase();
  if (!/sin\s+reemplazo|sin\s+reposici[oó]n|sin\s+devoluci[oó]n/.test(s)) return { ok: true };
  if (!/amb[oa]s?.{0,35}chicas|dos.{0,20}chicas/.test(s)) return { ok: true };

  const totalMatch = /(?:clase|grupo).{0,20}(?:hay|tiene)\s+(\d+)\s+alumn/i.exec(statement);
  const girlsMatch = /(\d+)\s+(?:son\s+)?chicas/i.exec(statement);
  if (!totalMatch || !girlsMatch) return { ok: true };

  const total = Number(totalMatch[1]);
  const girls = Number(girlsMatch[1]);
  if (!Number.isInteger(total) || !Number.isInteger(girls) || total < 2 || girls < 2) {
    return { ok: true };
  }

  const expected = fractionString(girls * (girls - 1), total * (total - 1));
  const expectedValue = parseNumericValue(expected);
  const answerValue = parseNumericValue(correctAnswer);
  if (expectedValue === null || answerValue === null) return { ok: true };
  if (!numericClose(expectedValue, answerValue)) {
    return {
      ok: false,
      reason: `probability_without_replacement_mismatch: la probabilidad es ${expected} pero answer_key="${correctAnswer}"`,
    };
  }
  return { ok: true };
}

function parsePolynomialTerms(polyRaw: string): Map<number, number> | null {
  const poly = normalizeStatementMath(polyRaw)
    .replace(/\s+/g, "")
    .replace(/\*/g, "")
    .replace(/^\+/g, "");
  const normalized = poly.replace(/-/g, "+-");
  const terms = normalized.split("+").filter(Boolean);
  if (!terms.length) return null;
  const out = new Map<number, number>();
  for (const term of terms) {
    let coef: number;
    let pow: number;
    if (term.includes("x")) {
      const [coefRaw, rest] = term.split("x");
      if (coefRaw === "" || coefRaw === "+") coef = 1;
      else if (coefRaw === "-") coef = -1;
      else {
        const parsed = parseNumericValue(coefRaw);
        if (parsed === null) return null;
        coef = parsed;
      }
      const powMatch = /^\^(\d+)$/.exec(rest ?? "");
      pow = powMatch ? Number(powMatch[1]) : 1;
    } else {
      const parsed = parseNumericValue(term);
      if (parsed === null) return null;
      coef = parsed;
      pow = 0;
    }
    out.set(pow, (out.get(pow) ?? 0) + coef);
  }
  return out;
}

function evaluatePolynomial(terms: Map<number, number>, x: number): number {
  let total = 0;
  for (const [pow, coef] of terms) total += coef * x ** pow;
  return total;
}

export function checkPolynomialRemainderTheorem(
  statement: string,
  correctAnswer: string,
): ConsistencyResult {
  if (!/resto|residuo/i.test(statement)) return { ok: true };
  const s = normalizeStatementMath(statement);
  const polyMatch = /p\s*\(\s*x\s*\)\s*=\s*([^?]+?)\s+se\s+divide/i.exec(s);
  const divisorMatch = /\(\s*x\s*([+-])\s*(\d+(?:[.,]\d+)?)\s*\)/i.exec(s);
  if (!polyMatch || !divisorMatch) return { ok: true };

  const aRaw = parseNumericValue(divisorMatch[2]);
  if (aRaw === null) return { ok: true };
  const root = divisorMatch[1] === "-" ? aRaw : -aRaw;
  const terms = parsePolynomialTerms(polyMatch[1]);
  if (!terms) return { ok: true };

  const expected = evaluatePolynomial(terms, root);
  const answer = parseNumericValue(correctAnswer);
  if (answer === null) return { ok: true };
  if (!numericClose(expected, answer)) {
    return {
      ok: false,
      reason: `remainder_theorem_mismatch: el resto es ${expected} pero answer_key="${correctAnswer}"`,
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

  const finalEquality = checkFinalEqualityConclusion(explanation, correctAnswer);
  if (!finalEquality.ok) return finalEquality;

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

function numericClose(a: number, b: number): boolean {
  return Math.abs(a - b) <= Math.max(1e-9, 1e-6 * Math.max(Math.abs(a), Math.abs(b), 1));
}

function trimMathCandidate(raw: string): string {
  return raw
    .replace(/\${1,2}/g, "")
    .replace(/^[\s:]+/g, "")
    .replace(/[\s,;:.!?]+$/g, "")
    .trim();
}

function finalEqualityCandidate(explanation: string): string | null {
  const normalized = normSym(explanation);
  const lastEq = normalized.lastIndexOf("=");
  if (lastEq < 0) return null;

  const after = normalized.slice(lastEq + 1);
  const firstLine = after.split(/\r?\n/)[0] ?? "";
  const sentence = firstLine.split(/;/)[0] ?? "";
  const candidate = trimMathCandidate(sentence);
  return candidate || null;
}

/**
 * Detecta conclusiones finales expresadas como cadena de igualdad:
 * "50/18 + 9/18 - 15/18 = 44/18 = 22/9".
 * Conservador: solo compara si el ultimo termino y la answer key son numericos.
 */
export function checkFinalEqualityConclusion(
  explanation: string,
  correctAnswer: string,
): ConsistencyResult {
  const candidate = finalEqualityCandidate(explanation);
  if (!candidate) return { ok: true };

  const concluded = parseNumericValue(candidate);
  const key = parseNumericValue(correctAnswer);
  if (concluded === null || key === null) return { ok: true };

  if (!numericClose(concluded, key)) {
    return {
      ok: false,
      reason: `explanation_answer_mismatch: la explicaciÃ³n concluye ${candidate} pero answer_key="${correctAnswer}"`,
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
  const probability = checkTwoGirlsWithoutReplacement(statement, correctAnswer);
  if (!probability.ok) return probability;
  const remainder = checkPolynomialRemainderTheorem(statement, correctAnswer);
  if (!remainder.ok) return remainder;
  const linearInequality = checkTwoSidedLinearInequality(statement, correctAnswer);
  if (!linearInequality.ok) return linearInequality;
  const inequalitySystem = checkSimpleInequalitySystem(statement, correctAnswer);
  if (!inequalitySystem.ok) return inequalitySystem;
  const interval = checkIntervalConsistency(statement, correctAnswer);
  if (!interval.ok) return interval;
  const numericKey = checkAnswerKeyConsistency(explanation, correctAnswer);
  if (!numericKey.ok) return numericKey;
  const singleIv = checkIntervalAnswerKey(explanation, correctAnswer);
  if (!singleIv.ok) return singleIv;
  // Comparación de conjunto-solución completa (uniones + desigualdades).
  return checkSolutionSetMatch(explanation, correctAnswer);
}
