/**
 * Convierte expresiones en sintaxis "amigable" del usuario
 * (sqrt(2), pi, x^2, sin(x), ≤, ∞, etc.) a LaTeX para KaTeX.
 *
 * Es heurístico — no es un parser matemático completo.
 * Cubre los casos que produce el Math Input Helper + sintaxis habitual.
 */
export function mathToLatex(input: string): string {
  if (!input.trim()) return "";

  let s = input;

  // 1) Símbolos unicode → comandos LaTeX
  s = s
    .replace(/≤/g, " \\leq ")
    .replace(/≥/g, " \\geq ")
    .replace(/≠/g, " \\neq ")
    .replace(/∞/g, " \\infty ")
    .replace(/×/g, " \\times ")
    .replace(/÷/g, " \\div ")
    .replace(/−/g, "-");

  // 2) Constantes (palabras enteras, case-sensitive para no romper variables)
  s = s.replace(/\bpi\b/g, "\\pi ");

  // 3) Funciones trig / logaritmos → \sin(...
  s = s.replace(/\b(sin|cos|tan|log|ln)\(/g, "\\$1(");

  // 4) sqrt(...) → \sqrt{...} con matching de paréntesis (iterativo por anidamiento)
  let guard = 0;
  while (s.includes("sqrt(") && guard++ < 32) {
    const prev = s;
    s = replaceSqrtOnce(s);
    if (s === prev) break;
  }

  // 5) Auto-braces en exponentes: x^2 → x^{2}, x^(a+b) → x^{(a+b)}
  s = s.replace(
    /\^(\([^()]*\)|\d+\.?\d*|[a-zA-Z])/g,
    (_m, body: string) => `^{${body}}`,
  );

  return s;
}

// --- Render de matemática "plana" (con unicode: √, ², θ) detectada en explicaciones ---

const SUPERSCRIPT_CHARS: Record<string, string> = {
  "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4",
  "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
};

const GREEK_UNICODE: Record<string, string> = {
  α: "\\alpha", β: "\\beta", γ: "\\gamma", δ: "\\delta", ε: "\\epsilon",
  ζ: "\\zeta", η: "\\eta", θ: "\\theta", ι: "\\iota", κ: "\\kappa",
  λ: "\\lambda", μ: "\\mu", ν: "\\nu", ξ: "\\xi", π: "\\pi", ρ: "\\rho",
  σ: "\\sigma", τ: "\\tau", υ: "\\upsilon", φ: "\\phi", χ: "\\chi",
  ψ: "\\psi", ω: "\\omega", Γ: "\\Gamma", Δ: "\\Delta", Θ: "\\Theta",
  Λ: "\\Lambda", Π: "\\Pi", Σ: "\\Sigma", Φ: "\\Phi", Ω: "\\Omega",
};

const KNOWN_FN_RE = /\b(sin|cos|tan|cot|sec|csc|log|ln|sqrt|sen|tg|cotg|cosec|lim|max|min|mcd|mcm|exp)\b/gi;

/**
 * ¿La expresión es matemática "compacta" (no prosa)? Si al sacar funciones conocidas
 * quedan palabras de 3+ letras, es texto con palabras (ej. "cateto_adyacente") y NO
 * conviene tipografiarla con KaTeX (saldría en bastardilla y con subíndices raros).
 */
export function isRenderableMath(run: string): boolean {
  const stripped = run.replace(KNOWN_FN_RE, " ");
  return !/[A-Za-zÁÉÍÓÚÜáéíóúüÑñ]{3,}/.test(stripped);
}

/**
 * Convierte una expresión matemática en notación plana/unicode (√(x), 15², θ, a/b)
 * a LaTeX para KaTeX. Heurístico, pensado para las "corridas" matemáticas que detecta
 * splitMathFragments dentro de las explicaciones.
 */
export function plainMathToLatex(input: string): string {
  if (!input.trim()) return "";
  let s = input.replace(/−/g, "-");

  // Superíndices unicode contiguos → ^{...}
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (m) =>
    `^{${[...m].map((c) => SUPERSCRIPT_CHARS[c]).join("")}}`,
  );

  // Raíces: √(...) con matching de paréntesis; √token → \sqrt{token}
  let guard = 0;
  while (s.includes("√") && guard++ < 32) {
    const prev = s;
    s = replaceUnicodeRootOnce(s);
    if (s === prev) break;
  }
  // sqrt( ascii → \sqrt{...}
  guard = 0;
  while (s.includes("sqrt(") && guard++ < 32) {
    const prev = s;
    s = replaceSqrtOnce(s);
    if (s === prev) break;
  }

  // Griegas unicode → comandos
  s = s.replace(/[α-ωΑ-Ω]/g, (c) => GREEK_UNICODE[c] ?? c);

  // Símbolos
  s = s
    .replace(/·/g, " \\cdot ")
    .replace(/×/g, " \\times ")
    .replace(/÷/g, " \\div ")
    .replace(/±/g, " \\pm ")
    .replace(/∓/g, " \\mp ")
    .replace(/≤/g, " \\leq ")
    .replace(/≥/g, " \\geq ")
    .replace(/≠/g, " \\neq ")
    .replace(/≈/g, " \\approx ")
    .replace(/∞/g, " \\infty ")
    .replace(/→/g, " \\to ")
    .replace(/°/g, "^{\\circ}");

  // Funciones trig/log: \sin( ; sen/tg español → \operatorname
  s = s.replace(/\b(sin|cos|tan|cot|sec|csc|log|ln)\b/gi, "\\$1 ");
  s = s.replace(/\b(sen|tg|cotg|cosec)\b/gi, "\\operatorname{$1}");
  s = s.replace(/\bpi\b/gi, "\\pi ");

  // Fracciones simples num/num → \frac
  s = s.replace(/(\d+)\s*\/\s*(\d+)/g, "\\frac{$1}{$2}");

  // Exponentes ^n → ^{n}
  s = s.replace(/\^(\([^()]*\)|\d+\.?\d*|[a-zA-Z])/g, (_m, body: string) => `^{${body}}`);

  return s.replace(/\s{2,}/g, " ").trim();
}

function replaceUnicodeRootOnce(s: string): string {
  const idx = s.indexOf("√");
  if (idx === -1) return s;
  const after = s.slice(idx + 1);
  // √(...) con matching de paréntesis
  if (after.startsWith("(")) {
    let depth = 1;
    let j = 1;
    while (j < after.length && depth > 0) {
      if (after[j] === "(") depth++;
      else if (after[j] === ")") depth--;
      if (depth === 0) break;
      j++;
    }
    if (depth === 0) {
      return s.slice(0, idx) + "\\sqrt{" + after.slice(1, j) + "}" + after.slice(j + 1);
    }
  }
  // √token (número/variable, posibles superíndices ya convertidos)
  const m = /^([0-9A-Za-zα-ωΑ-Ω.]+(?:\^\{[^}]*\})?)/.exec(after);
  if (m) {
    return s.slice(0, idx) + "\\sqrt{" + m[1] + "}" + after.slice(m[1].length);
  }
  // No se pudo: convertimos a \sqrt sin radicando para no loopear.
  return s.slice(0, idx) + "\\surd " + after;
}

function replaceSqrtOnce(s: string): string {
  const idx = s.indexOf("sqrt(");
  if (idx === -1) return s;

  let depth = 1;
  let j = idx + 5;
  while (j < s.length && depth > 0) {
    if (s[j] === "(") depth++;
    else if (s[j] === ")") depth--;
    if (depth === 0) break;
    j++;
  }
  if (depth !== 0) return s;

  return s.slice(0, idx) + "\\sqrt{" + s.slice(idx + 5, j) + "}" + s.slice(j + 1);
}
