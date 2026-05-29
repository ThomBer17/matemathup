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
