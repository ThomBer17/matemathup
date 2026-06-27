const SQRT = String.fromCharCode(0x221a);
const MINUS = String.fromCharCode(0x2212);
const TIMES = String.fromCharCode(0x00d7);
const DOT = String.fromCharCode(0x00b7);
const DIV = String.fromCharCode(0x00f7);

function normalizeLatex(raw: string): string {
  let s = raw;
  s = s.replace(/\\[dt]?frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, "($1)/($2)");
  s = s.replace(/\\sqrt\s*\{([^{}]+)\}/g, "sqrt($1)");
  s = s.replace(/\${1,2}/g, "");
  s = s.replace(/\\left|\\right/g, "");
  s = s.replace(/[{}]/g, "");
  s = s.replace(/\\cdot|\\times/g, "*");
  return s;
}

export function normalizeExpressionText(raw: string): string {
  return normalizeLatex(raw)
    .replaceAll(MINUS, "-")
    .replaceAll(TIMES, "*")
    .replaceAll(DOT, "*")
    .replaceAll(DIV, "/")
    .replace(new RegExp(`${SQRT}\\s*\\(`, "g"), "sqrt(")
    .replace(new RegExp(`${SQRT}\\s*(\\d+(?:[.,]\\d+)?)`, "g"), "sqrt($1)")
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/\s+/g, "");
}

function mathFragments(statement: string): string[] {
  const fragments: string[] = [];
  const re = /\${1,2}([\s\S]*?)\${1,2}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(statement)) !== null) fragments.push(m[1]);
  return fragments;
}

function hasOperatorLikeMath(s: string): boolean {
  return /[+\-*/^]|sqrt|abs|\|/.test(s);
}

function isSafeArithmeticCandidate(s: string): boolean {
  const normalized = normalizeExpressionText(s);
  if (!normalized || normalized.length > 160) return false;
  if (!/[0-9]/.test(normalized)) return false;
  const withoutWords = normalized.replace(/sqrt|abs/g, "");
  return !/[a-zA-Z_]/.test(withoutWords) && /^[0-9+\-*/^().|,[\]\s]+$/.test(withoutWords);
}

/**
 * Extrae una expresion aritmetica computable del enunciado.
 * Conservador: prefiere math mode y evita frases con variables o texto.
 */
export function extractArithmeticExpression(statement: string): string | null {
  const fragments = mathFragments(statement).filter(
    (f) => hasOperatorLikeMath(f) && isSafeArithmeticCandidate(f),
  );
  if (fragments.length > 0) {
    return normalizeExpressionText(fragments.sort((a, b) => b.length - a.length)[0]);
  }

  const plain = normalizeExpressionText(statement);
  const m = plain.match(/[-+|()0-9sqrtabs*/^.,]+/g);
  const candidates = (m ?? []).filter(
    (c) => hasOperatorLikeMath(c) && isSafeArithmeticCandidate(c),
  );
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => b.length - a.length)[0];
}

export function extractIntervalLiteral(statement: string): string | null {
  const text = normalizeLatex(statement).replaceAll(MINUS, "-");
  const m = text.match(
    /([[(])\s*(-?\d+(?:[.,]\d+)?(?:\/\d+)?)\s*[,;]\s*(-?\d+(?:[.,]\d+)?(?:\/\d+)?)\s*([\])])/,
  );
  if (!m) return null;
  const lo = m[2].replace(",", ".");
  const hi = m[3].replace(",", ".");
  return `${m[1]}${lo},${hi}${m[4]}`;
}
