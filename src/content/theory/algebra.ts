import type { TheoryTopic } from "./types";

export const algebra: TheoryTopic = {
  slug: "algebra",
  summary: String.raw`El **álgebra** es el lenguaje que usa letras para representar números desconocidos o variables, y nos permite expresar relaciones generales y resolver problemas. Sus protagonistas son los **polinomios**: expresiones como $2x^2 - 5x + 3$ que combinan números y potencias de una variable.

Operamos con polinomios (suma, resta, producto, división) y, sobre todo, los **factorizamos**: reescribirlos como producto de factores más simples mediante factor común, diferencia de cuadrados $a^2-b^2=(a+b)(a-b)$ o trinomios cuadrados perfectos. Factorizar es clave para resolver **ecuaciones**, porque un producto vale cero solo si alguno de sus factores es cero.

Las **ecuaciones** lineales ($ax+b=0$) y cuadráticas ($ax^2+bx+c=0$) son centrales: las cuadráticas se resuelven con la fórmula resolvente. También trabajamos con **inecuaciones**, donde la solución es un conjunto de valores (un intervalo) en lugar de un único número. Dominar el álgebra es imprescindible para funciones, sistemas y todo el cálculo posterior.`,
  keyConcepts: [
    "Polinomios y sus operaciones",
    "Factor común y factorización",
    "Diferencia de cuadrados y trinomio cuadrado perfecto",
    "Ecuaciones lineales y cuadráticas",
    "Fórmula resolvente y discriminante",
    "Inecuaciones",
  ],
  formulas: [
    { label: "Fórmula resolvente", latex: String.raw`x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}` },
    { label: "Diferencia de cuadrados", latex: String.raw`a^2 - b^2 = (a+b)(a-b)` },
    { label: "Trinomio cuadrado perfecto", latex: String.raw`a^2 \pm 2ab + b^2 = (a \pm b)^2` },
    { label: "Discriminante", latex: String.raw`\Delta = b^2 - 4ac` },
  ],
  examples: [
    {
      problem: String.raw`Resolvé la ecuación cuadrática $x^2 - 5x + 6 = 0$.`,
      steps: [
        String.raw`Identificamos $a=1$, $b=-5$, $c=6$.`,
        String.raw`Aplicamos la resolvente: $x = \dfrac{5 \pm \sqrt{25 - 24}}{2} = \dfrac{5 \pm 1}{2}$.`,
        String.raw`Dos soluciones: $x = \tfrac{5+1}{2}=3$ y $x = \tfrac{5-1}{2}=2$.`,
      ],
      result: String.raw`$x = 3$ o $x = 2$.`,
    },
    {
      problem: String.raw`Factorizá $x^2 - 9$.`,
      steps: [
        String.raw`Reconocemos una diferencia de cuadrados: $x^2 - 9 = x^2 - 3^2$.`,
        String.raw`Aplicamos $a^2-b^2=(a+b)(a-b)$ con $a=x$, $b=3$.`,
      ],
      result: String.raw`$x^2 - 9 = (x+3)(x-3)$.`,
    },
    {
      problem: String.raw`Sacá factor común en $6x^3 - 9x^2$.`,
      steps: [
        String.raw`El factor común numérico es $3$ y el de la variable, $x^2$.`,
        String.raw`Dividimos cada término por $3x^2$: $6x^3 = 3x^2\cdot 2x$ y $9x^2 = 3x^2\cdot 3$.`,
      ],
      result: String.raw`$6x^3 - 9x^2 = 3x^2(2x - 3)$.`,
    },
  ],
  commonMistakes: [
    String.raw`Pensar que $(a+b)^2 = a^2 + b^2$. Falta el doble producto: $(a+b)^2 = a^2 + 2ab + b^2$.`,
    String.raw`Perder una solución de la cuadrática olvidando el $\pm$ de la resolvente.`,
    String.raw`Al despejar en una inecuación, no invertir el signo $<$ al multiplicar por un número negativo.`,
    "Cancelar términos sumados (no factores). Solo se simplifica lo que multiplica.",
  ],
  checklist: [
    "Opero y factorizo polinomios",
    "Reconozco casos de factorización (factor común, diferencia de cuadrados, TCP)",
    "Resuelvo ecuaciones cuadráticas con la resolvente",
    "Interpreto el discriminante (cantidad de soluciones)",
    "Resuelvo inecuaciones y expreso la solución como intervalo",
  ],
};
