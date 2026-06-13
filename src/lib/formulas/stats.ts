import { fmt, step, numberResult } from "./util";
import type { Formula } from "./types";

const listVar = {
  key: "values",
  label: "Lista de valores (separados por coma)",
  latex: "x_i",
  kind: "list" as const,
};

function asList(v: number | number[]): number[] {
  return Array.isArray(v) ? v : [v];
}
function listLatex(xs: number[]): string {
  return `\\{${xs.map(fmt).join(",\\ ")}\\}`;
}

export const stats: Formula[] = [
  {
    slug: "media",
    topic: "Estadística",
    name: "Media (promedio)",
    description: "Promedio de una lista de valores.",
    latex: "\\bar{x} = \\dfrac{\\sum x_i}{n}",
    vars: [listVar],
    compute: (inp, opts) => {
      const xs = asList(inp.values);
      if (xs.length === 0) return { steps: [], copyText: "—", note: "Ingresá al menos un valor." };
      const sum = xs.reduce((a, b) => a + b, 0);
      const mean = sum / xs.length;
      const steps = [
        step("Datos", listLatex(xs)),
        step("Suma", `\\sum x_i = ${fmt(sum)}`),
        step("Dividimos por n", `\\bar{x} = \\dfrac{${fmt(sum)}}{${xs.length}}`),
        step("Resultado", `\\bar{x} = ${fmt(mean)}`),
      ];
      return numberResult(steps, mean, opts);
    },
  },
  {
    slug: "mediana",
    topic: "Estadística",
    name: "Mediana",
    description: "Valor central de la lista ordenada.",
    latex: "\\tilde{x} = \\text{valor central}",
    vars: [listVar],
    compute: (inp, opts) => {
      const xs = asList(inp.values);
      if (xs.length === 0) return { steps: [], copyText: "—", note: "Ingresá al menos un valor." };
      const sorted = [...xs].sort((a, b) => a - b);
      const n = sorted.length;
      const mid = Math.floor(n / 2);
      const steps = [step("Ordenamos", listLatex(sorted))];
      let median: number;
      if (n % 2 === 1) {
        median = sorted[mid];
        steps.push(step("Valor central", `\\tilde{x} = ${fmt(median)}`));
      } else {
        median = (sorted[mid - 1] + sorted[mid]) / 2;
        steps.push(
          step(
            "Promedio de los dos centrales",
            `\\tilde{x} = \\dfrac{${fmt(sorted[mid - 1])} + ${fmt(sorted[mid])}}{2} = ${fmt(median)}`,
          ),
        );
      }
      return numberResult(steps, median, opts);
    },
  },
  {
    slug: "desvio-estandar",
    topic: "Estadística",
    name: "Desvío estándar",
    description: "Dispersión de los datos respecto de la media.",
    latex: "\\sigma = \\sqrt{\\dfrac{\\sum (x_i - \\bar{x})^2}{N}}",
    vars: [listVar],
    variants: [
      { key: "poblacional", label: "Poblacional (÷ N)" },
      { key: "muestral", label: "Muestral (÷ n−1)" },
    ],
    compute: (inp, opts) => {
      const xs = asList(inp.values);
      const muestral = opts.variant === "muestral";
      const denomCount = muestral ? xs.length - 1 : xs.length;
      if (xs.length === 0 || denomCount <= 0) {
        return {
          steps: [],
          copyText: "—",
          note: "Se necesitan al menos " + (muestral ? "2" : "1") + " valores.",
        };
      }
      const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
      const ss = xs.reduce((a, b) => a + (b - mean) ** 2, 0);
      const variance = ss / denomCount;
      const sd = Math.sqrt(variance);
      const steps = [
        step("Datos", listLatex(xs)),
        step("Media", `\\bar{x} = ${fmt(mean)}`),
        step("Suma de cuadrados", `\\sum (x_i - \\bar{x})^2 = ${fmt(ss)}`),
        step(
          muestral ? "Varianza muestral" : "Varianza poblacional",
          `s^2 = \\dfrac{${fmt(ss)}}{${denomCount}} = ${fmt(variance)}`,
        ),
        step("Resultado", `\\sigma \\approx ${fmt(sd)}`),
      ];
      return numberResult(steps, sd, opts);
    },
  },
];
