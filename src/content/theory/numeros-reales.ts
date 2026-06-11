import type { TheoryTopic } from "./types";

export const numerosReales: TheoryTopic = {
  slug: "numeros-reales",
  summary: String.raw`Los **números reales** ($\mathbb{R}$) son todos los números que podés ubicar sobre la recta numérica. Se organizan en conjuntos encajados: los naturales $\mathbb{N}=\{1,2,3,\dots\}$ sirven para contar; los enteros $\mathbb{Z}$ agregan el cero y los negativos; los racionales $\mathbb{Q}$ son los que se escriben como fracción $\tfrac{a}{b}$ (con $b\neq 0$) y tienen expresión decimal finita o periódica; y los irracionales $\mathbb{I}$ (como $\sqrt{2}$ o $\pi$) tienen infinitas cifras decimales sin período. La unión de racionales e irracionales forma $\mathbb{R}$.

Sobre los reales operamos con suma, resta, multiplicación, división (salvo por cero), potencias y raíces, respetando la jerarquía de operaciones. Una herramienta clave es el **valor absoluto** $|x|$, que mide la distancia de un número al cero y siempre es no negativo. También trabajamos con **intervalos**, que describen tramos de la recta (abiertos, cerrados o semiabiertos), muy útiles para expresar soluciones de inecuaciones. Entender qué tipo de número estás manejando y cómo se ordenan en la recta es la base para todo lo que viene en álgebra y funciones.`,
  keyConcepts: [
    "Conjuntos numéricos: ℕ, ℤ, ℚ, 𝕀, ℝ",
    "Números racionales e irracionales",
    "Recta numérica y orden",
    "Valor absoluto y distancia",
    "Intervalos y notación de conjuntos",
    "Potencias y raíces; racionalización",
  ],
  formulas: [
    { label: "Valor absoluto", latex: String.raw`|x| = \begin{cases} x & \text{si } x \ge 0 \\ -x & \text{si } x < 0 \end{cases}` },
    { label: "Racionalización", latex: String.raw`\frac{a}{\sqrt{b}} = \frac{a}{\sqrt{b}}\cdot\frac{\sqrt{b}}{\sqrt{b}} = \frac{a\sqrt{b}}{b}` },
    { label: "Propiedad de raíces", latex: String.raw`\sqrt{a\cdot b} = \sqrt{a}\cdot\sqrt{b}\quad (a,b\ge 0)` },
    { label: "Intervalo cerrado", latex: String.raw`[a,b] = \{\,x\in\mathbb{R} : a \le x \le b\,\}` },
  ],
  examples: [
    {
      problem: String.raw`Clasificá el número $\sqrt{4}$ y decidí si es racional o irracional.`,
      steps: [
        String.raw`Calculamos la raíz: $\sqrt{4} = 2$.`,
        String.raw`$2$ se puede escribir como fracción: $2 = \tfrac{2}{1}$.`,
      ],
      result: String.raw`$\sqrt{4}=2$ es un número **racional** (y entero y natural).`,
    },
    {
      problem: String.raw`Racionalizá la expresión $\dfrac{6}{\sqrt{3}}$.`,
      steps: [
        String.raw`Multiplicamos numerador y denominador por $\sqrt{3}$: $\dfrac{6}{\sqrt{3}}\cdot\dfrac{\sqrt{3}}{\sqrt{3}}$.`,
        String.raw`En el denominador: $\sqrt{3}\cdot\sqrt{3}=3$, entonces queda $\dfrac{6\sqrt{3}}{3}$.`,
        String.raw`Simplificamos $\tfrac{6}{3}=2$.`,
      ],
      result: String.raw`$\dfrac{6}{\sqrt{3}} = 2\sqrt{3}$`,
    },
    {
      problem: String.raw`Resolvé $|x - 3| = 5$.`,
      steps: [
        String.raw`El valor absoluto da dos casos: $x-3 = 5$ o $x-3 = -5$.`,
        String.raw`Primer caso: $x = 8$. Segundo caso: $x = -2$.`,
      ],
      result: String.raw`$x = 8$ o $x = -2$.`,
    },
  ],
  commonMistakes: [
    String.raw`Creer que $\sqrt{4}$ es irracional: es $2$, perfectamente racional.`,
    String.raw`Pensar que $|x| = x$ siempre. Si $x<0$, entonces $|x| = -x > 0$.`,
    String.raw`Escribir $\sqrt{a+b} = \sqrt{a}+\sqrt{b}$. ¡Es falso! La raíz no se reparte sobre la suma.`,
    "Confundir intervalo abierto ( ) con cerrado [ ]: el corchete incluye el extremo, el paréntesis no.",
  ],
  checklist: [
    "Distingo racionales de irracionales",
    "Sé representar y operar con intervalos",
    "Entiendo el valor absoluto como distancia",
    "Puedo racionalizar denominadores con raíces",
    "Reconozco a qué conjunto pertenece un número",
  ],
};
