import { fmt, p, step, valueForms, numberResult } from "./util";
import type { Formula } from "./types";

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

export const algebra: Formula[] = [
  {
    slug: "cuadratica",
    topic: "Álgebra",
    name: "Fórmula cuadrática",
    description: "Resuelve ax² + bx + c = 0 (las raíces reales).",
    latex: "x = \\dfrac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
    vars: [
      { key: "a", label: "Coeficiente cuadrático (≠ 0)", latex: "a" },
      { key: "b", label: "Coeficiente lineal", latex: "b" },
      { key: "c", label: "Término independiente", latex: "c" },
    ],
    compute: (inp, opts) => {
      const a = inp.a as number;
      const b = inp.b as number;
      const c = inp.c as number;
      if (a === 0) {
        return {
          steps: [],
          copyText: "a no puede ser 0",
          note: "Con a = 0 no es una ecuación cuadrática.",
        };
      }
      const disc = b * b - 4 * a * c;
      const steps = [
        step("Fórmula", "x = \\dfrac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"),
        step(
          "Sustituimos",
          `x = \\dfrac{-${p(b)} \\pm \\sqrt{${p(b)}^2 - 4(${p(a)})(${p(c)})}}{2(${p(a)})}`,
        ),
        step("Discriminante", `\\Delta = ${fmt(disc)}`),
      ];
      if (disc < 0) {
        return {
          steps,
          copyText: "Sin solución real",
          note: "El discriminante es negativo: la ecuación no tiene soluciones reales.",
        };
      }
      const sq = Math.sqrt(disc);
      const x1 = (-b + sq) / (2 * a);
      const x2 = (-b - sq) / (2 * a);
      if (disc === 0) {
        const r = valueForms(x1, opts.exact);
        steps.push(step("Raíz doble", `x = \\dfrac{-${p(b)}}{2(${p(a)})} = ${r.latex}`));
        return {
          steps,
          exactLatex: `x = ${r.latex}`,
          decimal: `x = ${fmt(x1)}`,
          copyText: `x = ${r.copy}`,
        };
      }
      const r1 = valueForms(x1, opts.exact);
      const r2 = valueForms(x2, opts.exact);
      steps.push(step("Dos soluciones", `x_1 = ${r1.latex}, \\quad x_2 = ${r2.latex}`));
      return {
        steps,
        exactLatex: `x_1 = ${r1.latex},\\ x_2 = ${r2.latex}`,
        decimal: `x₁ = ${fmt(x1)}, x₂ = ${fmt(x2)}`,
        copyText: `x₁ = ${r1.copy}, x₂ = ${r2.copy}`,
      };
    },
  },
  {
    slug: "diferencia-cuadrados",
    topic: "Álgebra",
    name: "Diferencia de cuadrados",
    description: "Factoriza a² − b² = (a + b)(a − b) y evalúa el resultado.",
    latex: "a^2 - b^2 = (a + b)(a - b)",
    vars: [
      { key: "a", label: "Primer término", latex: "a" },
      { key: "b", label: "Segundo término", latex: "b" },
    ],
    compute: (inp, opts) => {
      const a = inp.a as number;
      const b = inp.b as number;
      const value = a * a - b * b;
      const steps = [
        step("Fórmula", "a^2 - b^2 = (a + b)(a - b)"),
        step("Sustituimos", `${p(a)}^2 - ${p(b)}^2 = (${p(a)} + ${p(b)})(${p(a)} - ${p(b)})`),
        step("Factorizado", `= (${fmt(a + b)})(${fmt(a - b)})`),
        step("Valor", `= ${fmt(value)}`),
      ];
      return numberResult(steps, value, opts);
    },
  },
  {
    slug: "factor-comun",
    topic: "Álgebra",
    name: "Factor común",
    description: "Extrae el factor común (MCD) de dos términos.",
    latex: "a\\,x + b\\,x = x\\,(a + b)",
    vars: [
      { key: "a", label: "Primer coeficiente", latex: "a" },
      { key: "b", label: "Segundo coeficiente", latex: "b" },
    ],
    compute: (inp) => {
      const a = Math.trunc(inp.a as number);
      const b = Math.trunc(inp.b as number);
      const g = gcd(a, b);
      const steps = [
        step("Términos", `${fmt(a)} \\;\\text{y}\\; ${fmt(b)}`),
        step("Factor común (MCD)", `\\gcd(${fmt(a)}, ${fmt(b)}) = ${fmt(g)}`),
        step("Factorizado", `${fmt(a)} + ${fmt(b)} = ${fmt(g)}\\,(${fmt(a / g)} + ${fmt(b / g)})`),
      ];
      return {
        steps,
        exactLatex: `${fmt(g)}\\,(${fmt(a / g)} + ${fmt(b / g)})`,
        copyText: `${g}(${a / g} + ${b / g})`,
      };
    },
  },
];
