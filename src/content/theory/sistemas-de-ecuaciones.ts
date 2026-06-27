import type { TheoryTopic } from "./types";

export const sistemasDeEcuaciones: TheoryTopic = {
  slug: "sistemas-de-ecuaciones",
  summary: String.raw`Un **sistema de ecuaciones** es un conjunto de dos o más ecuaciones que comparten las mismas incógnitas. Resolverlo significa encontrar los valores que satisfacen **todas** las ecuaciones a la vez. El caso más común en la secundaria es el sistema lineal $2\times 2$: dos ecuaciones con dos incógnitas ($x$ e $y$).

Geométricamente, cada ecuación lineal es una **recta**, y la solución del sistema es el **punto de intersección**. De ahí surgen tres situaciones: si las rectas se cruzan en un punto, el sistema es **compatible determinado** (una única solución); si son la misma recta, es **compatible indeterminado** (infinitas soluciones); y si son paralelas distintas, es **incompatible** (sin solución).

Para resolverlos usamos tres métodos equivalentes: **sustitución** (despejar una incógnita y reemplazar), **igualación** (despejar la misma incógnita en ambas y igualar) y **reducción** (sumar o restar las ecuaciones para eliminar una incógnita). Elegir el método más cómodo según cómo estén escritas las ecuaciones ahorra mucho trabajo.`,
  keyConcepts: [
    "Sistema lineal 2×2",
    "Método de sustitución",
    "Método de igualación",
    "Método de reducción (eliminación)",
    "Interpretación geométrica: intersección de rectas",
    "Sistemas compatibles, incompatibles e indeterminados",
  ],
  formulas: [
    {
      label: "Sistema lineal 2×2",
      latex: String.raw`\begin{cases} a_1 x + b_1 y = c_1 \\ a_2 x + b_2 y = c_2 \end{cases}`,
    },
    {
      label: "Única solución (rectas que se cruzan)",
      latex: String.raw`\frac{a_1}{a_2} \neq \frac{b_1}{b_2}`,
    },
    {
      label: "Sin solución (paralelas)",
      latex: String.raw`\frac{a_1}{a_2} = \frac{b_1}{b_2} \neq \frac{c_1}{c_2}`,
    },
  ],
  examples: [
    {
      problem: String.raw`Resolvé por sustitución: $\begin{cases} x + y = 5 \\ x - y = 1 \end{cases}$`,
      steps: [
        String.raw`Despejamos $x$ de la primera: $x = 5 - y$.`,
        String.raw`Reemplazamos en la segunda: $(5 - y) - y = 1 \Rightarrow 5 - 2y = 1$.`,
        String.raw`$-2y = -4 \Rightarrow y = 2$. Y $x = 5 - 2 = 3$.`,
      ],
      result: String.raw`$x = 3$, $y = 2$.`,
    },
    {
      problem: String.raw`Resolvé por reducción: $\begin{cases} 2x + y = 7 \\ x - y = 2 \end{cases}$`,
      steps: [
        String.raw`Sumamos ambas ecuaciones para eliminar $y$: $(2x + y) + (x - y) = 7 + 2$.`,
        String.raw`$3x = 9 \Rightarrow x = 3$.`,
        String.raw`Reemplazamos en $x - y = 2$: $3 - y = 2 \Rightarrow y = 1$.`,
      ],
      result: String.raw`$x = 3$, $y = 1$.`,
    },
    {
      problem: String.raw`¿Cuántas soluciones tiene $\begin{cases} x + y = 2 \\ 2x + 2y = 10 \end{cases}$?`,
      steps: [
        String.raw`La segunda es $2(x+y)=10$, o sea $x+y=5$.`,
        String.raw`Pero la primera dice $x+y=2$. No pueden valer $2$ y $5$ a la vez.`,
      ],
      result: String.raw`Sistema **incompatible**: no tiene solución (rectas paralelas).`,
    },
  ],
  commonMistakes: [
    "Resolver una sola ecuación y olvidar hallar la otra incógnita.",
    "Equivocar el signo al restar ecuaciones en el método de reducción.",
    "No verificar la solución reemplazando en ambas ecuaciones.",
    "Confundir sistema sin solución (incompatible) con infinitas soluciones (indeterminado).",
  ],
  checklist: [
    "Resuelvo sistemas 2×2 por sustitución, igualación y reducción",
    "Interpreto la solución como intersección de rectas",
    "Clasifico el sistema (determinado, indeterminado, incompatible)",
    "Verifico la solución en ambas ecuaciones",
    "Elijo el método más conveniente según el sistema",
  ],
};
