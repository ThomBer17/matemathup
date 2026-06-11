import type { TheoryTopic } from "./types";

export const probabilidad: TheoryTopic = {
  slug: "probabilidad",
  summary: String.raw`La **probabilidad** mide qué tan posible es que ocurra un suceso, con un número entre $0$ (imposible) y $1$ (seguro). En la **probabilidad clásica** o de Laplace, cuando todos los resultados son igualmente posibles, la probabilidad de un evento es la cantidad de **casos favorables** dividida por la de **casos totales**.

Para contar casos usamos la **combinatoria**: las permutaciones (cuando importa el orden) y las combinaciones (cuando no importa). Estas herramientas permiten calcular, por ejemplo, de cuántas maneras se puede formar un equipo o salir un número de lotería.

La **estadística descriptiva** complementa el tema: organiza y resume datos. Las **medidas de tendencia central** (media, mediana y moda) indican un valor representativo del conjunto, mientras que las **medidas de dispersión** (varianza y desvío estándar) dicen qué tan dispersos están los datos respecto del promedio. Juntas, probabilidad y estadística permiten describir lo incierto y tomar decisiones con datos: aparecen en encuestas, juegos, control de calidad y ciencia.`,
  keyConcepts: [
    "Probabilidad clásica (Laplace)",
    "Casos favorables y casos totales",
    "Combinatoria: permutaciones y combinaciones",
    "Media, mediana y moda",
    "Varianza y desvío estándar",
    "Frecuencia relativa",
  ],
  formulas: [
    { label: "Probabilidad de Laplace", latex: String.raw`P(A) = \frac{\text{casos favorables}}{\text{casos totales}}` },
    { label: "Combinaciones", latex: String.raw`\binom{n}{k} = \frac{n!}{k!\,(n-k)!}` },
    { label: "Media (promedio)", latex: String.raw`\bar{x} = \frac{x_1 + x_2 + \cdots + x_n}{n}` },
    { label: "Desvío estándar", latex: String.raw`\sigma = \sqrt{\frac{\sum (x_i - \bar{x})^2}{n}}` },
  ],
  examples: [
    {
      problem: String.raw`Al tirar un dado, ¿cuál es la probabilidad de obtener un número par?`,
      steps: [
        String.raw`Casos favorables (pares): $2, 4, 6$, es decir $3$.`,
        String.raw`Casos totales: $6$ caras.`,
        String.raw`$P = \dfrac{3}{6} = \dfrac{1}{2}$.`,
      ],
      result: String.raw`$P(\text{par}) = \dfrac{1}{2} = 0{,}5$.`,
    },
    {
      problem: String.raw`Calculá la media de los datos $4, 8, 6, 2$.`,
      steps: [
        String.raw`Sumamos: $4 + 8 + 6 + 2 = 20$.`,
        String.raw`Dividimos por la cantidad de datos ($4$): $\bar{x} = \dfrac{20}{4}$.`,
      ],
      result: String.raw`$\bar{x} = 5$.`,
    },
    {
      problem: String.raw`¿De cuántas maneras se pueden elegir $2$ alumnos de un grupo de $4$?`,
      steps: [
        String.raw`No importa el orden, así que usamos combinaciones: $\binom{4}{2}$.`,
        String.raw`$\binom{4}{2} = \dfrac{4!}{2!\,2!} = \dfrac{24}{4} = 6$.`,
      ],
      result: String.raw`Hay $6$ formas posibles.`,
    },
  ],
  commonMistakes: [
    String.raw`Dar una probabilidad mayor que $1$ o negativa: siempre está entre $0$ y $1$.`,
    "Usar permutaciones (importa el orden) cuando en realidad no importa, o al revés.",
    "Confundir media (promedio) con mediana (valor del medio).",
    "Olvidar ordenar los datos antes de calcular la mediana.",
  ],
  checklist: [
    "Calculo probabilidades con la regla de Laplace",
    "Distingo permutaciones de combinaciones",
    "Calculo media, mediana y moda",
    "Interpreto el desvío estándar como dispersión",
    "Sé que toda probabilidad está entre 0 y 1",
  ],
};
