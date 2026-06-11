import type { TheoryTopic } from "./types";

export const funciones: TheoryTopic = {
  slug: "funciones",
  summary: String.raw`Una **función** es una regla que asigna a cada valor de entrada ($x$) exactamente una salida ($y$). Se escribe $y = f(x)$ y se piensa como una "máquina": metés un número y devuelve otro. El conjunto de entradas válidas es el **dominio**, y el de salidas posibles, la **imagen**.

Las funciones se representan con **gráficos** en el plano cartesiano, lo que permite leer de un vistazo su comportamiento: dónde crece o decrece, sus **ceros** (donde corta el eje $x$), su signo y sus valores máximos o mínimos. Las más usuales en la secundaria son la **lineal** $f(x)=mx+b$ (una recta, con pendiente $m$ y ordenada al origen $b$), la **cuadrática** $f(x)=ax^2+bx+c$ (una parábola), y las **exponenciales** y **logarítmicas**.

Entender funciones es entender cómo se relacionan dos cantidades que varían juntas: la distancia en función del tiempo, el precio en función de la cantidad, etc. Es la idea central que conecta el álgebra con el cálculo (límites y derivadas).`,
  keyConcepts: [
    "Función, dominio e imagen",
    "Función lineal: pendiente y ordenada al origen",
    "Función cuadrática y parábola",
    "Ceros, signo y crecimiento",
    "Gráficos cartesianos",
    "Vértice de la parábola",
  ],
  formulas: [
    { label: "Función lineal", latex: String.raw`f(x) = mx + b` },
    { label: "Pendiente entre dos puntos", latex: String.raw`m = \frac{y_2 - y_1}{x_2 - x_1}` },
    { label: "Función cuadrática", latex: String.raw`f(x) = ax^2 + bx + c` },
    { label: "Vértice de la parábola", latex: String.raw`x_v = -\frac{b}{2a}` },
  ],
  examples: [
    {
      problem: String.raw`Hallá la pendiente de la recta que pasa por $(1, 2)$ y $(3, 8)$.`,
      steps: [
        String.raw`Usamos $m = \dfrac{y_2 - y_1}{x_2 - x_1}$ con los puntos dados.`,
        String.raw`$m = \dfrac{8 - 2}{3 - 1} = \dfrac{6}{2}$.`,
      ],
      result: String.raw`$m = 3$.`,
    },
    {
      problem: String.raw`Encontrá los ceros de $f(x) = x^2 - 4$.`,
      steps: [
        String.raw`Los ceros cumplen $f(x)=0$: $x^2 - 4 = 0$.`,
        String.raw`Despejamos: $x^2 = 4$, entonces $x = \pm 2$.`,
      ],
      result: String.raw`Los ceros son $x = 2$ y $x = -2$.`,
    },
    {
      problem: String.raw`Calculá el vértice de la parábola $f(x) = x^2 - 6x + 5$.`,
      steps: [
        String.raw`$x_v = -\dfrac{b}{2a} = -\dfrac{-6}{2\cdot 1} = 3$.`,
        String.raw`$y_v = f(3) = 3^2 - 6\cdot 3 + 5 = 9 - 18 + 5 = -4$.`,
      ],
      result: String.raw`El vértice es $(3,\,-4)$.`,
    },
  ],
  commonMistakes: [
    "Confundir dominio (entradas) con imagen (salidas).",
    String.raw`Creer que toda curva es función: si una recta vertical la corta dos veces, no lo es.`,
    String.raw`En la lineal, mezclar pendiente $m$ con ordenada al origen $b$.`,
    String.raw`Olvidar el signo de $a$: si $a>0$ la parábola abre hacia arriba; si $a<0$, hacia abajo.`,
  ],
  checklist: [
    "Determino dominio e imagen de una función",
    "Grafico funciones lineales y cuadráticas",
    "Calculo ceros y vértice",
    "Interpreto crecimiento y signo desde el gráfico",
    "Distingo cuándo una relación es función",
  ],
};
