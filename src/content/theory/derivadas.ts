import type { TheoryTopic } from "./types";

export const derivadas: TheoryTopic = {
  slug: "derivadas",
  summary: String.raw`La **derivada** mide la **velocidad de cambio** de una función: cuán rápido sube o baja $f(x)$ en cada punto. Geométricamente, la derivada $f'(x)$ en un punto es la **pendiente de la recta tangente** a la curva en ese punto. Se define como un límite del cociente incremental, pero en la práctica se calcula con **reglas**.

Las reglas básicas permiten derivar casi todo: la **regla de la potencia** ($x^n \to nx^{n-1}$), y las reglas de la **suma**, el **producto**, el **cociente** y la **cadena** (para funciones compuestas). Con ellas obtenemos la función derivada sin recurrir al límite cada vez.

La derivada tiene aplicaciones potentes: donde $f'(x)=0$ pueden estar los **máximos y mínimos** (puntos críticos); el signo de $f'$ indica si la función **crece o decrece**; y el signo de la segunda derivada informa sobre la **concavidad**. Por eso la derivada es la herramienta central de los problemas de **optimización**: encontrar el mayor beneficio, el menor costo, la trayectoria más corta.`,
  keyConcepts: [
    "Derivada como pendiente de la recta tangente",
    "Velocidad de cambio",
    "Regla de la potencia",
    "Reglas de suma, producto, cociente y cadena",
    "Puntos críticos: máximos y mínimos",
    "Crecimiento y concavidad",
  ],
  formulas: [
    { label: "Regla de la potencia", latex: String.raw`\frac{d}{dx}\,x^n = n\,x^{n-1}` },
    { label: "Regla del producto", latex: String.raw`(f\cdot g)' = f'g + f g'` },
    { label: "Regla de la cadena", latex: String.raw`\big(f(g(x))\big)' = f'(g(x))\cdot g'(x)` },
    { label: "Recta tangente", latex: String.raw`y - f(a) = f'(a)\,(x - a)` },
  ],
  examples: [
    {
      problem: String.raw`Derivá $f(x) = x^3$.`,
      steps: [
        String.raw`Aplicamos la regla de la potencia: bajamos el exponente y restamos $1$.`,
        String.raw`$f'(x) = 3\,x^{3-1}$.`,
      ],
      result: String.raw`$f'(x) = 3x^2$.`,
    },
    {
      problem: String.raw`Derivá $f(x) = 5x^2 - 4x + 7$.`,
      steps: [
        String.raw`Derivamos término a término (regla de la suma).`,
        String.raw`$\tfrac{d}{dx}(5x^2)=10x$, $\tfrac{d}{dx}(-4x)=-4$, $\tfrac{d}{dx}(7)=0$.`,
      ],
      result: String.raw`$f'(x) = 10x - 4$.`,
    },
    {
      problem: String.raw`Hallá los puntos críticos de $f(x) = x^2 - 6x$.`,
      steps: [
        String.raw`Derivamos: $f'(x) = 2x - 6$.`,
        String.raw`Igualamos a cero: $2x - 6 = 0 \Rightarrow x = 3$.`,
        String.raw`Como la parábola abre hacia arriba, $x=3$ es un mínimo.`,
      ],
      result: String.raw`Punto crítico (mínimo) en $x = 3$.`,
    },
  ],
  commonMistakes: [
    String.raw`Olvidar la regla de la cadena al derivar funciones compuestas como $(2x+1)^3$.`,
    String.raw`Creer que la derivada de una constante es la constante: es $0$.`,
    String.raw`Aplicar mal la regla del producto: no es $f'g'$, sino $f'g + fg'$.`,
    String.raw`Confundir $f'(x)=0$ con "no hay extremo": hay que analizar el signo de $f'$.`,
  ],
  checklist: [
    "Interpreto la derivada como pendiente de la tangente",
    "Aplico la regla de la potencia",
    "Uso suma, producto, cociente y cadena",
    "Encuentro puntos críticos igualando f'(x)=0",
    "Decido crecimiento/decrecimiento con el signo de f'",
  ],
};
