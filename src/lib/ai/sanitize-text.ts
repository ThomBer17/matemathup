/**
 * Convierte notación LaTeX que a veces emite el modelo (ej. "$\alpha$", "\frac{a}{b}")
 * a texto/unicode legible, porque los enunciados se muestran en texto plano.
 * Lógica pura. Conservador: lo que no reconoce, lo deja lo más legible posible.
 */

const GREEK: Record<string, string> = {
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  epsilon: "ε",
  varepsilon: "ε",
  zeta: "ζ",
  eta: "η",
  theta: "θ",
  vartheta: "θ",
  iota: "ι",
  kappa: "κ",
  lambda: "λ",
  mu: "μ",
  nu: "ν",
  xi: "ξ",
  pi: "π",
  rho: "ρ",
  sigma: "σ",
  tau: "τ",
  upsilon: "υ",
  phi: "φ",
  varphi: "φ",
  chi: "χ",
  psi: "ψ",
  omega: "ω",
  Gamma: "Γ",
  Delta: "Δ",
  Theta: "Θ",
  Lambda: "Λ",
  Xi: "Ξ",
  Pi: "Π",
  Sigma: "Σ",
  Phi: "Φ",
  Psi: "Ψ",
  Omega: "Ω",
};

const SYMBOLS: Record<string, string> = {
  cdot: "·",
  times: "×",
  div: "÷",
  pm: "±",
  mp: "∓",
  leq: "≤",
  le: "≤",
  geq: "≥",
  ge: "≥",
  neq: "≠",
  ne: "≠",
  approx: "≈",
  infty: "∞",
  to: "→",
  rightarrow: "→",
  Rightarrow: "⇒",
  in: "∈",
  notin: "∉",
  subset: "⊂",
  cup: "∪",
  cap: "∩",
  forall: "∀",
  exists: "∃",
  circ: "°",
  degree: "°",
  angle: "∠",
  perp: "⊥",
  parallel: "∥",
  sum: "Σ",
  prod: "Π",
  int: "∫",
  partial: "∂",
  nabla: "∇",
  ldots: "…",
  cdots: "…",
  dots: "…",
  quad: " ",
  qquad: "  ",
  left: "",
  right: "",
  displaystyle: "",
  limits: "",
};

const SUPERSCRIPT: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};

export function sanitizeMathText(input: string, opts: { trim?: boolean } = {}): string {
  if (!input) return input;
  const trim = opts.trim ?? true;
  let s = input;

  // \frac{a}{b} y \dfrac{a}{b} → (a)/(b)
  s = s.replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "($1)/($2)");
  // \sqrt[n]{x} → raíz n(x) ; \sqrt{x} → √(x)
  s = s.replace(/\\sqrt\s*\[([^\]]*)\]\s*\{([^{}]*)\}/g, "raíz $1($2)");
  s = s.replace(/\\sqrt\s*\{([^{}]*)\}/g, "√($1)");
  // \text{...}, \mathrm{...}, \mathbf{...} → contenido
  s = s.replace(/\\(?:text|mathrm|mathbf|mathit|operatorname)\s*\{([^{}]*)\}/g, "$1");

  // Comandos con barra: griegas, símbolos, o funciones (sin/cos/log → sin barra).
  s = s.replace(/\\([a-zA-Z]+)/g, (_m, name: string) => {
    if (name in GREEK) return GREEK[name];
    if (name in SYMBOLS) return SYMBOLS[name];
    return name; // \sin → sin, \log → log, \lim → lim, comando desconocido → nombre
  });

  // Exponentes: ^{2} → ² (dígitos), ^{abc} → ^(abc); ^2 → ²
  s = s.replace(/\^\{([^{}]*)\}/g, (_m, body: string) =>
    /^\d+$/.test(body) ? toSuperscript(body) : `^(${body})`,
  );
  s = s.replace(/\^(\d)/g, (_m, d: string) => SUPERSCRIPT[d] ?? `^${d}`);
  // Subíndices: _{abc} → _(abc) ; _a → _a (se deja)
  s = s.replace(/_\{([^{}]*)\}/g, "_($1)");

  // Sacar delimitadores de math mode y llaves sueltas.
  s = s.replace(/\${1,2}/g, "");
  s = s.replace(/\\[()[\]]/g, ""); // \(, \), \[, \]
  s = s.replace(/[{}]/g, "");
  // Espacios LaTeX y limpieza final.
  s = s.replace(/\\[,;: ]/g, " ");
  if (trim) s = s.replace(/\s{2,}/g, " ").trim();

  return s;
}

function toSuperscript(digits: string): string {
  return digits
    .split("")
    .map((d) => SUPERSCRIPT[d] ?? d)
    .join("");
}
