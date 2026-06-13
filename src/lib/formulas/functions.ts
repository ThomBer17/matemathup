import { fmt, p, step, numberResult, valueForms } from "./util";
import type { Formula } from "./types";

export const functions: Formula[] = [
  {
    slug: "pendiente",
    topic: "Funciones",
    name: "Pendiente de una recta",
    description: "Pendiente entre dos puntos: m = (y₂ − y₁) / (x₂ − x₁).",
    latex: "m = \\dfrac{y_2 - y_1}{x_2 - x_1}",
    vars: [
      { key: "x1", label: "x₁", latex: "x_1" },
      { key: "y1", label: "y₁", latex: "y_1" },
      { key: "x2", label: "x₂", latex: "x_2" },
      { key: "y2", label: "y₂", latex: "y_2" },
    ],
    compute: (inp, opts) => {
      const x1 = inp.x1 as number;
      const y1 = inp.y1 as number;
      const x2 = inp.x2 as number;
      const y2 = inp.y2 as number;
      if (x2 - x1 === 0) {
        return {
          steps: [],
          copyText: "Indefinida",
          note: "x₁ = x₂: la recta es vertical, la pendiente no está definida.",
        };
      }
      const m = (y2 - y1) / (x2 - x1);
      const steps = [
        step("Fórmula", "m = \\dfrac{y_2 - y_1}{x_2 - x_1}"),
        step(
          "Sustituimos",
          `m = \\dfrac{${p(y2)} - ${p(y1)}}{${p(x2)} - ${p(x1)}} = \\dfrac{${fmt(y2 - y1)}}{${fmt(x2 - x1)}}`,
        ),
        step("Resultado", `m = ${fmt(m)}`),
      ];
      return numberResult(steps, m, opts);
    },
  },
  {
    slug: "distancia",
    topic: "Funciones",
    name: "Distancia entre dos puntos",
    description: "Distancia: d = √((x₂ − x₁)² + (y₂ − y₁)²).",
    latex: "d = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}",
    vars: [
      { key: "x1", label: "x₁", latex: "x_1" },
      { key: "y1", label: "y₁", latex: "y_1" },
      { key: "x2", label: "x₂", latex: "x_2" },
      { key: "y2", label: "y₂", latex: "y_2" },
    ],
    compute: (inp, opts) => {
      const x1 = inp.x1 as number;
      const y1 = inp.y1 as number;
      const x2 = inp.x2 as number;
      const y2 = inp.y2 as number;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const inside = dx * dx + dy * dy;
      const d = Math.sqrt(inside);
      const steps = [
        step("Fórmula", "d = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}"),
        step("Sustituimos", `d = \\sqrt{(${fmt(dx)})^2 + (${fmt(dy)})^2} = \\sqrt{${fmt(inside)}}`),
        step("Resultado", `d \\approx ${fmt(d)}`),
      ];
      return numberResult(steps, d, opts);
    },
  },
  {
    slug: "punto-medio",
    topic: "Funciones",
    name: "Punto medio",
    description: "Punto medio entre dos puntos: M = ((x₁+x₂)/2, (y₁+y₂)/2).",
    latex: "M = \\left(\\dfrac{x_1 + x_2}{2},\\ \\dfrac{y_1 + y_2}{2}\\right)",
    vars: [
      { key: "x1", label: "x₁", latex: "x_1" },
      { key: "y1", label: "y₁", latex: "y_1" },
      { key: "x2", label: "x₂", latex: "x_2" },
      { key: "y2", label: "y₂", latex: "y_2" },
    ],
    compute: (inp, opts) => {
      const x1 = inp.x1 as number;
      const y1 = inp.y1 as number;
      const x2 = inp.x2 as number;
      const y2 = inp.y2 as number;
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const fx = valueForms(mx, opts.exact);
      const fy = valueForms(my, opts.exact);
      const steps = [
        step("Fórmula", "M = \\left(\\dfrac{x_1 + x_2}{2},\\ \\dfrac{y_1 + y_2}{2}\\right)"),
        step(
          "Sustituimos",
          `M = \\left(\\dfrac{${p(x1)} + ${p(x2)}}{2},\\ \\dfrac{${p(y1)} + ${p(y2)}}{2}\\right)`,
        ),
        step("Resultado", `M = \\left(${fx.latex},\\ ${fy.latex}\\right)`),
      ];
      return {
        steps,
        exactLatex: `\\left(${fx.latex},\\ ${fy.latex}\\right)`,
        decimal: `(${fmt(mx)}, ${fmt(my)})`,
        copyText: `(${fx.copy}, ${fy.copy})`,
      };
    },
  },
];
