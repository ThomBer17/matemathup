import type { TheoryTopic } from "./types";

export const integrales: TheoryTopic = {
  slug: "integrales",
  summary: String.raw`La **integral** es la operación inversa de la derivada y, a la vez, una forma de **acumular** cantidades. La **integral indefinida** $\int f(x)\,dx$ busca una función cuya derivada sea $f$ (una **antiderivada** o primitiva). Como derivar una constante da cero, siempre agregamos una constante de integración $+\,C$.

La **integral definida** $\int_a^b f(x)\,dx$ representa el **área bajo la curva** de $f$ entre $x=a$ y $x=b$. El puente entre ambas ideas es el **Teorema Fundamental del Cálculo**: para calcular el área, basta encontrar una primitiva $F$ y restar $F(b) - F(a)$. Así, un problema geométrico (área) se resuelve con álgebra.

Para integrar usamos primero las **integrales inmediatas** (las reglas básicas leídas "al revés" de las derivadas), y para casos más complejos, técnicas como la **sustitución**. Las integrales sirven para calcular áreas, volúmenes, distancias recorridas a partir de la velocidad y, en general, cualquier magnitud que se acumula. Son una de las herramientas más usadas en física e ingeniería.`,
  keyConcepts: [
    "Antiderivada e integral indefinida",
    "Constante de integración (+C)",
    "Integrales inmediatas",
    "Integral definida y área bajo la curva",
    "Teorema Fundamental del Cálculo",
    "Método de sustitución",
  ],
  formulas: [
    { label: "Regla de la potencia (integral)", latex: String.raw`\int x^n\,dx = \frac{x^{n+1}}{n+1} + C \quad (n\neq -1)` },
    { label: "Teorema Fundamental del Cálculo", latex: String.raw`\int_a^b f(x)\,dx = F(b) - F(a)` },
    { label: "Linealidad", latex: String.raw`\int \big(a\,f + b\,g\big)\,dx = a\!\int f\,dx + b\!\int g\,dx` },
  ],
  examples: [
    {
      problem: String.raw`Calculá $\int x^2\,dx$.`,
      steps: [
        String.raw`Aplicamos la regla de la potencia: sumamos $1$ al exponente y dividimos.`,
        String.raw`$\dfrac{x^{2+1}}{2+1} = \dfrac{x^3}{3}$, y agregamos la constante.`,
      ],
      result: String.raw`$\int x^2\,dx = \dfrac{x^3}{3} + C$.`,
    },
    {
      problem: String.raw`Resolvé la integral definida $\int_0^2 2x\,dx$.`,
      steps: [
        String.raw`Una primitiva de $2x$ es $F(x) = x^2$.`,
        String.raw`Por el Teorema Fundamental: $F(2) - F(0) = 2^2 - 0^2$.`,
      ],
      result: String.raw`$\int_0^2 2x\,dx = 4$ (área bajo la recta).`,
    },
    {
      problem: String.raw`Calculá $\int (3x^2 + 2)\,dx$.`,
      steps: [
        String.raw`Integramos término a término (linealidad).`,
        String.raw`$\int 3x^2\,dx = x^3$ y $\int 2\,dx = 2x$.`,
      ],
      result: String.raw`$\int (3x^2 + 2)\,dx = x^3 + 2x + C$.`,
    },
  ],
  commonMistakes: [
    String.raw`Olvidar el $+C$ en las integrales indefinidas.`,
    String.raw`Aplicar la regla de la potencia con $n=-1$: ese caso da $\ln|x|$, no $\tfrac{x^0}{0}$.`,
    "Restar al revés en la integral definida: es F(b) − F(a), no F(a) − F(b).",
    "Pensar que integrar y derivar son lo mismo: son operaciones inversas.",
  ],
  checklist: [
    "Entiendo la integral como inversa de la derivada",
    "No olvido la constante +C",
    "Calculo integrales inmediatas con la regla de la potencia",
    "Uso el Teorema Fundamental para integrales definidas",
    "Interpreto la integral definida como área",
  ],
};
