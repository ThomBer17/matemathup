/**
 * Autoformateo de explicaciones de ejercicios. Lógica pura (sin React) y testeable.
 *
 * Convierte el bloque de texto que devuelve la IA en una estructura de PASOS legible,
 * detectando:
 *   - enumeraciones: "1)", "2.", "3-"
 *   - "Paso 1", "Paso 2"
 *   - saltos naturales tras conectores: "Por lo tanto", "Entonces", "Finalmente",
 *     "Aplicamos", "Despejamos", etc.
 *   - expresiones matemáticas inline (tan(θ)=-3/4, cos²(θ)=16/25) → "chips".
 *
 * Compatibilidad: si la explicación no tiene estructura (1 solo segmento), se devuelve
 * como un único paso sin numerar (`structured: false`) para mostrarla como párrafo normal.
 */

/** Un fragmento de una línea: texto plano o expresión matemática (se resalta como chip). */
export interface ExplanationFragment {
  text: string;
  math: boolean;
}

/** Una línea dentro de un paso (un conector "Entonces:" y sus ecuaciones van en líneas distintas). */
export interface ExplanationLine {
  fragments: ExplanationFragment[];
}

export interface ExplanationStep {
  /** Número del paso (1-based) si la explicación es estructurada; null si es un párrafo suelto. */
  n: number | null;
  lines: ExplanationLine[];
}

export interface FormattedExplanation {
  steps: ExplanationStep[];
  /** true si se detectaron ≥2 pasos (se muestran numerados). */
  structured: boolean;
}

const SENTINEL = "";

// Conectores que, al inicio de una cláusula, abren un paso nuevo.
const CONNECTORS = [
  "Por lo tanto",
  "Por ende",
  "Por consiguiente",
  "Por último",
  "Finalmente",
  "Entonces",
  "Luego",
  "Aplicamos",
  "Aplicando",
  "Despejamos",
  "Despejando",
  "Sabemos que",
  "Usamos",
  "Reemplazamos",
  "Sustituimos",
  "Calculamos",
  "Resolvemos",
  "Simplificamos",
];

// Conectores ordenados por longitud descendente para que "Por lo tanto" gane sobre "Por".
const CONNECTOR_RE = new RegExp(
  `(?<=^|[\\s${SENTINEL},.;:])(${CONNECTORS.slice()
    .sort((a, b) => b.length - a.length)
    .join("|")})\\b`,
  "gi",
);

/** Inserta marcadores de corte y devuelve los segmentos crudos (uno por paso candidato). */
function splitIntoSegments(raw: string): string[] {
  let s = raw.replace(/\r\n/g, "\n").trim();

  // "\n" literal (backslash+n) que pudo quedar de contenido viejo → tratar como salto.
  // Solo si NO es un comando LaTeX (\theta, \neq van seguidos de minúscula).
  s = s.replace(/\\[nrt](?![a-z])/g, "\n");

  // Saltos de línea explícitos → corte.
  s = s.replace(/\n+/g, SENTINEL);

  // "Paso N" → corte antes.
  s = s.replace(
    new RegExp(`(^|[\\s${SENTINEL}])(Paso\\s+\\d+)`, "gi"),
    (_m, pre: string, mark: string) => (pre === "" ? mark : SENTINEL + mark),
  );

  // Enumeraciones "1)" "2." "3-" al comienzo de una cláusula → corte antes.
  s = s.replace(
    new RegExp(`(^|[\\s${SENTINEL}])(\\d{1,2}[).-])\\s+`, "g"),
    (_m, _pre, mark: string) => `${SENTINEL}${mark} `,
  );

  // Conectores → corte antes (conservando la palabra conectora en el segmento siguiente).
  s = s.replace(CONNECTOR_RE, `${SENTINEL}$1`);

  const segs = s
    .split(SENTINEL)
    .map((seg) => stripStepMarker(seg.trim()))
    .filter((seg) => seg.length > 0);

  return mergeTinySegments(segs);
}

/**
 * Une fragmentos "colgantes" al siguiente segmento: cláusulas cortas que NO terminan en
 * puntuación de cierre (ej. "Primero,"), típicas de cuando un conector aparece muy
 * temprano y parte una oración en dos pasos feos. Un paso corto pero COMPLETO
 * ("Verificamos.", "Segunda idea.") se respeta.
 */
function mergeTinySegments(segs: string[]): string[] {
  const out: string[] = [];
  let buffer = "";
  for (const seg of segs) {
    const merged = buffer ? `${buffer} ${seg}` : seg;
    const words = seg.split(/\s+/).filter(Boolean).length;
    const dangling = words <= 3 && !/[.!?:]$/.test(seg) && !MATH_SIGNAL.test(seg);
    if (dangling) {
      buffer = merged;
      continue;
    }
    out.push(merged);
    buffer = "";
  }
  if (buffer) {
    if (out.length) out[out.length - 1] += ` ${buffer}`;
    else out.push(buffer);
  }
  return out;
}

/** Quita el marcador original del paso ("1)", "Paso 2:") ya que renumeramos nosotros. */
function stripStepMarker(seg: string): string {
  return seg
    .replace(/^Paso\s+\d+\s*[:.-]?\s*/i, "")
    .replace(/^\d{1,2}[).-]\s*/, "")
    .replace(/^[,;:]\s*/, "")
    .trim();
}

// ---- Detección de expresiones matemáticas (chips) ----

const OPERATORS = new Set([
  "=",
  "+",
  "×",
  "·",
  "*",
  "/",
  "^",
  "→",
  "±",
  "-",
  "−",
  "≤",
  "≥",
  "≠",
  "<",
  ">",
]);
// Un "core" es matemático si contiene alguno de estos signos (evita chipear números sueltos como "5").
const MATH_SIGNAL = /[=/^²³√()<>≤≥≠±°πθαβγλμφ]/u;
// Caracteres permitidos dentro de un token matemático.
const MATH_CORE = /^[0-9A-Za-zα-ωΑ-Ω²³°πθαβγλμφ√(){}[\]<>≤≥≠±=+\-*/^·×_.'’]+$/u;

function isMathCore(core: string): boolean {
  if (!core) return false;
  if (OPERATORS.has(core)) return true;
  if (!MATH_CORE.test(core)) return false;
  return MATH_SIGNAL.test(core);
}

/** Separa un token de sus signos de puntuación de cierre (., ;, :, !, ?) finales. */
function splitTrailingPunct(tok: string): { core: string; trailing: string } {
  const m = /^(.*?)([.,;:!?]+)$/.exec(tok);
  if (m && m[1]) return { core: m[1], trailing: m[2] };
  return { core: tok, trailing: "" };
}

function pushText(frags: ExplanationFragment[], text: string) {
  if (!text) return;
  const last = frags[frags.length - 1];
  if (last && !last.math) last.text += text;
  else frags.push({ text, math: false });
}

/**
 * Divide una línea en fragmentos de texto y de matemática. Las corridas de tokens
 * matemáticos contiguos (incl. el "=" y los operandos) se agrupan en un solo chip.
 */
export function splitMathFragments(line: string): ExplanationFragment[] {
  const frags: ExplanationFragment[] = [];
  const parts = line.split(/(\s+)/); // conserva los espacios como tokens

  let i = 0;
  while (i < parts.length) {
    const tok = parts[i];
    if (tok === "" || /^\s+$/.test(tok)) {
      pushText(frags, tok);
      i++;
      continue;
    }

    const { core, trailing } = splitTrailingPunct(tok);
    if (isMathCore(core)) {
      // Acumula una corrida matemática: tokens math separados por espacios simples.
      let run = core;
      let j = i + 1;
      while (j + 1 < parts.length && /^\s+$/.test(parts[j])) {
        const next = splitTrailingPunct(parts[j + 1]);
        if (!isMathCore(next.core)) break;
        run += parts[j] + next.core;
        // si el token traía puntuación final, cerramos la corrida ahí
        if (next.trailing) {
          j += 2;
          pushMathRun(frags, run);
          run = "";
          pushText(frags, next.trailing);
          break;
        }
        j += 2;
      }
      if (run) pushMathRun(frags, run);
      pushText(frags, trailing);
      i = j;
    } else {
      pushText(frags, tok);
      i++;
    }
  }
  return frags;
}

/** Una corrida con ≥2 "=" son varias ecuaciones encadenadas: las dejamos como un chip igual. */
function pushMathRun(frags: ExplanationFragment[], run: string) {
  frags.push({ text: run, math: true });
}

/** Cuenta los "=" de una corrida matemática (para decidir si van en líneas separadas). */
function equationCount(run: string): number {
  return (run.match(/=/g) ?? []).length;
}

/**
 * Construye las líneas de un paso. Si hay un encabezado tipo "Entonces:" lo separa
 * en su propia línea. Si el cuerpo es una sola corrida con varias ecuaciones
 * ("sen(θ)=1/csc(θ) sen(θ)=-3/5"), las parte en una ecuación por línea.
 */
function buildLines(content: string): ExplanationLine[] {
  const lines: ExplanationLine[] = [];

  // Encabezado "Algo:" + cuerpo.
  let header: string | null = null;
  let body = content;
  const colon = /^([^:]{1,40}):\s+(\S.*)$/s.exec(content);
  if (colon && !MATH_SIGNAL.test(colon[1])) {
    header = `${colon[1].trim()}:`;
    body = colon[2].trim();
  }

  if (header) lines.push({ fragments: splitMathFragments(header) });

  const frags = splitMathFragments(body);
  const onlyMath = frags.filter((f) => f.text.trim().length > 0);
  if (onlyMath.length === 1 && onlyMath[0].math && equationCount(onlyMath[0].text) >= 2) {
    // Varias ecuaciones encadenadas → una por línea.
    for (const eq of splitChainedEquations(onlyMath[0].text)) {
      lines.push({ fragments: [{ text: eq, math: true }] });
    }
  } else {
    lines.push({ fragments: frags });
  }

  return lines.filter((l) => l.fragments.some((f) => f.text.trim().length > 0));
}

/** "sen(θ)=1/csc(θ) sen(θ)=-3/5" → ["sen(θ)=1/csc(θ)", "sen(θ)=-3/5"]. */
function splitChainedEquations(run: string): string[] {
  const tokens = run.split(/\s+/);
  const groups: string[][] = [];
  let cur: string[] = [];
  for (const t of tokens) {
    if (cur.length && /=/.test(cur.join("")) && /=/.test(t)) {
      groups.push(cur);
      cur = [t];
    } else {
      cur.push(t);
    }
  }
  if (cur.length) groups.push(cur);
  return groups.map((g) => g.join(" ").trim()).filter(Boolean);
}

/** Un paso con su texto crudo (incluye LaTeX $...$ para renderizar con KaTeX). */
export interface RawStep {
  /** Número 1-based si la explicación es estructurada; null si es un párrafo suelto. */
  n: number | null;
  text: string;
}

/**
 * Segmenta la explicación en pasos numerados conservando el texto CRUDO de cada uno
 * (con su LaTeX intacto). Lo usa el render con KaTeX, que tipografía las expresiones.
 */
export function parseSteps(raw: string): RawStep[] {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return [];
  const segments = splitIntoSegments(trimmed);
  const structured = segments.length > 1;
  return segments.map((text, i) => ({ n: structured ? i + 1 : null, text }));
}

/** Parsea una explicación cruda de la IA en pasos legibles. */
export function parseExplanation(raw: string): FormattedExplanation {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return { steps: [], structured: false };

  const segments = splitIntoSegments(trimmed);
  const structured = segments.length > 1;

  const steps: ExplanationStep[] = segments.map((seg, idx) => ({
    n: structured ? idx + 1 : null,
    lines: buildLines(seg),
  }));

  return { steps, structured };
}
