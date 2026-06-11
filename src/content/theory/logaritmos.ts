import type { TheoryTopic } from "./types";

export const logaritmos: TheoryTopic = {
  slug: "logaritmos",
  summary: String.raw`El **logaritmo** responde a la pregunta: ¿a qué exponente hay que elevar una base para obtener un número? Por definición, $\log_b a = c$ significa exactamente $b^c = a$. Es decir, el logaritmo es la **operación inversa** de la potencia. Por ejemplo, $\log_2 8 = 3$ porque $2^3 = 8$.

Trabajamos con la base $10$ (logaritmo decimal, $\log$) y con la base $e$ (logaritmo natural, $\ln$), pero la **fórmula de cambio de base** permite pasar de una a otra. Las **propiedades** son la clave: el logaritmo de un producto es la suma de logaritmos, el de un cociente es la resta, y el de una potencia "baja" el exponente como factor. Estas reglas convierten multiplicaciones en sumas, lo que simplifica muchísimas cuentas y ecuaciones.

Los logaritmos aparecen en todo lo que crece o decrece de forma exponencial: interés compuesto, poblaciones, desintegración radiactiva, pH, escala Richter. Resolver **ecuaciones exponenciales y logarítmicas** es una de las aplicaciones más importantes del tema.`,
  keyConcepts: [
    "Definición de logaritmo como exponente",
    "Logaritmo decimal (log) y natural (ln)",
    "Propiedad del producto y del cociente",
    "Propiedad de la potencia",
    "Cambio de base",
    "Ecuaciones exponenciales y logarítmicas",
  ],
  formulas: [
    { label: "Definición", latex: String.raw`\log_b a = c \iff b^c = a` },
    { label: "Producto y cociente", latex: String.raw`\log_b(xy) = \log_b x + \log_b y \qquad \log_b\!\frac{x}{y} = \log_b x - \log_b y` },
    { label: "Potencia", latex: String.raw`\log_b(x^n) = n\,\log_b x` },
    { label: "Cambio de base", latex: String.raw`\log_b a = \frac{\log a}{\log b}` },
  ],
  examples: [
    {
      problem: String.raw`Calculá $\log_2 32$.`,
      steps: [
        String.raw`Buscamos el exponente $c$ tal que $2^c = 32$.`,
        String.raw`Como $32 = 2^5$, entonces $c = 5$.`,
      ],
      result: String.raw`$\log_2 32 = 5$.`,
    },
    {
      problem: String.raw`Resolvé la ecuación exponencial $3^x = 81$.`,
      steps: [
        String.raw`Escribimos $81$ como potencia de $3$: $81 = 3^4$.`,
        String.raw`Igualamos exponentes: $3^x = 3^4 \Rightarrow x = 4$.`,
      ],
      result: String.raw`$x = 4$.`,
    },
    {
      problem: String.raw`Usá las propiedades para escribir $\log(100 \cdot x)$ como suma.`,
      steps: [
        String.raw`Propiedad del producto: $\log(100\cdot x) = \log 100 + \log x$.`,
        String.raw`Como $\log 100 = 2$ (base $10$): queda $2 + \log x$.`,
      ],
      result: String.raw`$\log(100x) = 2 + \log x$.`,
    },
  ],
  commonMistakes: [
    String.raw`Escribir $\log(x+y) = \log x + \log y$. ¡Falso! La propiedad de la suma es para el **producto**: $\log(xy)$.`,
    String.raw`Olvidar que no existe el logaritmo de números negativos ni de cero.`,
    String.raw`Confundir $\log_b(x^n)=n\log_b x$ con $(\log_b x)^n$.`,
    "Tomar logaritmo en un solo lado de la ecuación.",
  ],
  checklist: [
    "Entiendo el logaritmo como inverso de la potencia",
    "Aplico las propiedades (producto, cociente, potencia)",
    "Uso el cambio de base",
    "Resuelvo ecuaciones exponenciales igualando bases",
    "Reconozco el dominio del logaritmo (argumento positivo)",
  ],
};
