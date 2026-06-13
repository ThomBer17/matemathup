import { Rational } from "@/lib/fraction";
import { fmt, p, step, numberResult, DEG2RAD, RAD2DEG } from "./util";
import type { Formula, FormulaComputeOpts } from "./types";

/** Convierte un ángulo de entrada (en la unidad del toggle) a radianes. */
function toRad(angle: number, opts: FormulaComputeOpts): number {
  return opts.angleMode === "rad" ? angle : angle * DEG2RAD;
}
/** Convierte un resultado en radianes a la unidad del toggle. */
function fromRad(rad: number, opts: FormulaComputeOpts): number {
  return opts.angleMode === "rad" ? rad : rad * RAD2DEG;
}
function unit(opts: FormulaComputeOpts): string {
  return opts.angleMode === "rad" ? "\\,\\text{rad}" : "^\\circ";
}

export const trig: Formula[] = [
  {
    slug: "pitagoras",
    topic: "Trigonometría",
    name: "Teorema de Pitágoras",
    description: "Relaciona los lados de un triángulo rectángulo: a² + b² = c².",
    latex: "a^2 + b^2 = c^2",
    vars: [
      { key: "a", label: "Cateto a", latex: "a" },
      { key: "b", label: "Cateto b", latex: "b" },
      { key: "c", label: "Hipotenusa c", latex: "c" },
    ],
    variants: [
      { key: "hipotenusa", label: "Hallar hipotenusa", uses: ["a", "b"] },
      { key: "cateto", label: "Hallar cateto", uses: ["c", "a"] },
    ],
    compute: (inp, opts) => {
      if (opts.variant === "cateto") {
        const c = inp.c as number;
        const a = inp.a as number;
        const inside = c * c - a * a;
        if (inside < 0) {
          return {
            steps: [],
            copyText: "Sin solución",
            note: "La hipotenusa debe ser mayor que el cateto.",
          };
        }
        const b = Math.sqrt(inside);
        const steps = [
          step("Despejamos", "b = \\sqrt{c^2 - a^2}"),
          step("Sustituimos", `b = \\sqrt{${p(c)}^2 - ${p(a)}^2} = \\sqrt{${fmt(inside)}}`),
          step("Resultado", `b = ${fmt(b)}`),
        ];
        return numberResult(steps, b, opts);
      }
      const a = inp.a as number;
      const b = inp.b as number;
      const inside = a * a + b * b;
      const c = Math.sqrt(inside);
      const steps = [
        step("Despejamos", "c = \\sqrt{a^2 + b^2}"),
        step("Sustituimos", `c = \\sqrt{${p(a)}^2 + ${p(b)}^2} = \\sqrt{${fmt(inside)}}`),
        step("Resultado", `c = ${fmt(c)}`),
      ];
      return numberResult(steps, c, opts);
    },
  },
  {
    slug: "ley-senos",
    topic: "Trigonometría",
    name: "Ley de senos",
    description: "Halla un lado conociendo su ángulo opuesto y otro par lado–ángulo.",
    latex: "\\dfrac{a}{\\sin A} = \\dfrac{b}{\\sin B}",
    angle: true,
    vars: [
      { key: "A", label: "Ángulo A (opuesto al lado buscado)", latex: "A" },
      { key: "b", label: "Lado conocido b", latex: "b" },
      { key: "B", label: "Ángulo B (opuesto a b)", latex: "B" },
    ],
    variants: [{ key: "lado", label: "Hallar lado a", uses: ["A", "b", "B"] }],
    compute: (inp, opts) => {
      const A = inp.A as number;
      const b = inp.b as number;
      const B = inp.B as number;
      const sinB = Math.sin(toRad(B, opts));
      if (Math.abs(sinB) < 1e-12) {
        return { steps: [], copyText: "Indefinido", note: "sen(B) = 0: no se puede dividir." };
      }
      const a = (b * Math.sin(toRad(A, opts))) / sinB;
      const steps = [
        step("Despejamos", "a = \\dfrac{b \\, \\sin A}{\\sin B}"),
        step(
          "Sustituimos",
          `a = \\dfrac{${p(b)} \\cdot \\sin(${fmt(A)}${unit(opts)})}{\\sin(${fmt(B)}${unit(opts)})}`,
        ),
        step("Resultado", `a = ${fmt(a)}`),
      ];
      return numberResult(steps, a, opts);
    },
  },
  {
    slug: "ley-cosenos",
    topic: "Trigonometría",
    name: "Ley de cosenos",
    description: "Halla un lado o un ángulo en cualquier triángulo.",
    latex: "c^2 = a^2 + b^2 - 2ab\\cos C",
    angle: true,
    vars: [
      { key: "a", label: "Lado a", latex: "a" },
      { key: "b", label: "Lado b", latex: "b" },
      { key: "c", label: "Lado c (opuesto a C)", latex: "c" },
      { key: "C", label: "Ángulo C", latex: "C" },
    ],
    variants: [
      { key: "lado", label: "Hallar lado c", uses: ["a", "b", "C"] },
      { key: "angulo", label: "Hallar ángulo C", uses: ["a", "b", "c"] },
    ],
    compute: (inp, opts) => {
      const a = inp.a as number;
      const b = inp.b as number;
      if (opts.variant === "angulo") {
        const c = inp.c as number;
        const denom = 2 * a * b;
        if (denom === 0)
          return { steps: [], copyText: "Indefinido", note: "a y b deben ser distintos de 0." };
        const cosC = (a * a + b * b - c * c) / denom;
        if (cosC < -1 || cosC > 1) {
          return {
            steps: [],
            copyText: "Sin solución",
            note: "Esos lados no forman un triángulo válido.",
          };
        }
        const Crad = Math.acos(cosC);
        const C = fromRad(Crad, opts);
        const steps = [
          step("Despejamos", "C = \\arccos\\!\\left(\\dfrac{a^2 + b^2 - c^2}{2ab}\\right)"),
          step(
            "Sustituimos",
            `C = \\arccos\\!\\left(\\dfrac{${p(a)}^2 + ${p(b)}^2 - ${p(c)}^2}{2(${p(a)})(${p(b)})}\\right)`,
          ),
          step("Resultado", `C = ${fmt(C)}${unit(opts)}`),
        ];
        return numberResult(steps, C, opts);
      }
      const C = inp.C as number;
      const inside = a * a + b * b - 2 * a * b * Math.cos(toRad(C, opts));
      if (inside < 0) return { steps: [], copyText: "Sin solución", note: "Datos inconsistentes." };
      const c = Math.sqrt(inside);
      const steps = [
        step("Fórmula", "c = \\sqrt{a^2 + b^2 - 2ab\\cos C}"),
        step(
          "Sustituimos",
          `c = \\sqrt{${p(a)}^2 + ${p(b)}^2 - 2(${p(a)})(${p(b)})\\cos(${fmt(C)}${unit(opts)})}`,
        ),
        step("Resultado", `c = ${fmt(c)}`),
      ];
      return numberResult(steps, c, opts);
    },
  },
  {
    slug: "conversion-angulos",
    topic: "Trigonometría",
    name: "Conversión grados ↔ radianes",
    description: "Convierte entre grados y radianes.",
    latex: "\\text{rad} = \\text{grados} \\cdot \\dfrac{\\pi}{180}",
    vars: [
      { key: "deg", label: "Ángulo en grados", latex: "\\theta^\\circ" },
      { key: "rad", label: "Ángulo en radianes", latex: "\\theta_{rad}" },
    ],
    variants: [
      { key: "aRad", label: "Grados → radianes", uses: ["deg"] },
      { key: "aDeg", label: "Radianes → grados", uses: ["rad"] },
    ],
    compute: (inp, opts) => {
      if (opts.variant === "aDeg") {
        const rad = inp.rad as number;
        const deg = rad * RAD2DEG;
        const steps = [
          step("Fórmula", "\\text{grados} = \\text{rad} \\cdot \\dfrac{180}{\\pi}"),
          step("Sustituimos", `${fmt(rad)} \\cdot \\dfrac{180}{\\pi}`),
          step("Resultado", `${fmt(deg)}^\\circ`),
        ];
        return numberResult(steps, deg, opts);
      }
      const deg = inp.deg as number;
      const value = deg * DEG2RAD;
      const steps = [
        step("Fórmula", "\\text{rad} = \\text{grados} \\cdot \\dfrac{\\pi}{180}"),
        step("Sustituimos", `${fmt(deg)} \\cdot \\dfrac{\\pi}{180}`),
      ];
      // Exacto como fracción de π cuando deg es entero.
      let exactLatex: string | undefined;
      let copyText = `${fmt(value)} rad`;
      if (opts.exact && Number.isInteger(deg)) {
        const f = new Rational(deg, 180);
        const c = f.toLatex();
        exactLatex = c === "1" ? "\\pi" : c === "-1" ? "-\\pi" : `${c}\\pi`;
        copyText = (f.toString() === "1" ? "" : `${f.toString()}·`) + "π rad";
      }
      steps.push(
        step("Resultado", `${exactLatex ?? fmt(value)}${exactLatex ? "" : "\\,\\text{rad}"}`),
      );
      return { steps, exactLatex, decimal: `${fmt(value)} rad`, copyText };
    },
  },
];
