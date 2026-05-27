/**
 * Heuristics to detect math functions inside an exercise statement and
 * convert them to Desmos-compatible LaTeX expressions.
 */

export type DetectedGraph = {
  latex: string;
  label?: string;
};

const REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bsen\s*\(/gi, "\\sin("],
  [/\bsin\s*\(/gi, "\\sin("],
  [/\bcos\s*\(/gi, "\\cos("],
  [/\btan\s*\(/gi, "\\tan("],
  [/\bln\s*\(/gi, "\\ln("],
  [/\blog\s*\(/gi, "\\log("],
  [/\bsqrt\s*\(/gi, "\\sqrt("],
  [/√\s*\(/g, "\\sqrt("],
  [/\bpi\b/gi, "\\pi"],
  [/π/g, "\\pi"],
  [/\*/g, ""],
  [/\^/g, "^"],
];

export function toLatex(expr: string): string {
  let s = expr.trim();
  for (const [re, rep] of REPLACEMENTS) s = s.replace(re, rep);
  // wrap simple ^N when N is multi-digit/negative: x^-1 → x^{-1}
  s = s.replace(/\^(-?\d+)/g, (_m, n) => `^{${n}}`);
  return s;
}

/**
 * Find candidate function expressions inside a statement.
 * Looks for patterns like "f(x) = ...", "y = ..." up to a sentence boundary.
 */
export function detectFunctions(text: string): DetectedGraph[] {
  if (!text) return [];
  const results: DetectedGraph[] = [];
  const seen = new Set<string>();

  const re = /(?:f\s*\(\s*x\s*\)|g\s*\(\s*x\s*\)|h\s*\(\s*x\s*\)|y)\s*=\s*([^.,;\n]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = m[1].trim().replace(/\s+$/g, "");
    if (raw.length < 1 || raw.length > 80) continue;
    // skip if it doesn't look mathy
    if (!/[x0-9]/i.test(raw)) continue;
    const latex = `y=${toLatex(raw)}`;
    if (seen.has(latex)) continue;
    seen.add(latex);
    results.push({ latex, label: m[0].split("=")[0].trim() });
  }
  return results;
}
