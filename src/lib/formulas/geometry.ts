import { fmt, p, step, numberResult, piResult } from "./util";
import type { Formula } from "./types";

export const geometry: Formula[] = [
  {
    slug: "area-circulo",
    topic: "Geometría",
    name: "Área del círculo",
    description: "Área a partir del radio: A = π r².",
    latex: "A = \\pi r^2",
    vars: [{ key: "r", label: "Radio", latex: "r" }],
    compute: (inp, opts) => {
      const r = inp.r as number;
      const coeff = r * r;
      const value = Math.PI * coeff;
      const steps = [
        step("Fórmula", "A = \\pi r^2"),
        step("Sustituimos", `A = \\pi \\cdot ${p(r)}^2 = ${fmt(coeff)}\\pi`),
        step("Resultado", `A \\approx ${fmt(value)}`),
      ];
      return piResult(steps, coeff, value, opts);
    },
  },
  {
    slug: "area-triangulo",
    topic: "Geometría",
    name: "Área del triángulo",
    description: "Área a partir de base y altura: A = b·h / 2.",
    latex: "A = \\dfrac{b \\cdot h}{2}",
    vars: [
      { key: "b", label: "Base", latex: "b" },
      { key: "h", label: "Altura", latex: "h" },
    ],
    compute: (inp, opts) => {
      const b = inp.b as number;
      const h = inp.h as number;
      const value = (b * h) / 2;
      const steps = [
        step("Fórmula", "A = \\dfrac{b \\cdot h}{2}"),
        step("Sustituimos", `A = \\dfrac{${p(b)} \\cdot ${p(h)}}{2}`),
        step("Resultado", `A = ${fmt(value)}`),
      ];
      return numberResult(steps, value, opts);
    },
  },
  {
    slug: "volumen-esfera",
    topic: "Geometría",
    name: "Volumen de la esfera",
    description: "Volumen a partir del radio: V = 4/3 π r³.",
    latex: "V = \\dfrac{4}{3}\\pi r^3",
    vars: [{ key: "r", label: "Radio", latex: "r" }],
    compute: (inp, opts) => {
      const r = inp.r as number;
      const coeff = (4 / 3) * r * r * r;
      const value = Math.PI * coeff;
      const steps = [
        step("Fórmula", "V = \\dfrac{4}{3}\\pi r^3"),
        step("Sustituimos", `V = \\dfrac{4}{3}\\pi \\cdot ${p(r)}^3`),
        step("Resultado", `V \\approx ${fmt(value)}`),
      ];
      return piResult(steps, coeff, value, opts);
    },
  },
  {
    slug: "volumen-cilindro",
    topic: "Geometría",
    name: "Volumen del cilindro",
    description: "Volumen a partir del radio y la altura: V = π r² h.",
    latex: "V = \\pi r^2 h",
    vars: [
      { key: "r", label: "Radio", latex: "r" },
      { key: "h", label: "Altura", latex: "h" },
    ],
    compute: (inp, opts) => {
      const r = inp.r as number;
      const h = inp.h as number;
      const coeff = r * r * h;
      const value = Math.PI * coeff;
      const steps = [
        step("Fórmula", "V = \\pi r^2 h"),
        step("Sustituimos", `V = \\pi \\cdot ${p(r)}^2 \\cdot ${p(h)} = ${fmt(coeff)}\\pi`),
        step("Resultado", `V \\approx ${fmt(value)}`),
      ];
      return piResult(steps, coeff, value, opts);
    },
  },
];
