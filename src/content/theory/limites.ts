import type { TheoryTopic } from "./types";

export const limites: TheoryTopic = {
  slug: "limites",
  summary: String.raw`El **límite** describe hacia qué valor se acerca una función cuando la variable se aproxima a cierto punto, **sin necesariamente llegar a él**. Se escribe $\lim_{x\to a} f(x) = L$ y se lee: "cuando $x$ tiende a $a$, $f(x)$ tiende a $L$". Es la idea fundacional del cálculo: permite hablar con precisión de "acercarse infinitamente".

Para calcular límites, muchas veces alcanza con **reemplazar** el valor. Pero a veces aparece una **indeterminación**, como $\tfrac{0}{0}$, y hay que trabajar la expresión (factorizar, simplificar, racionalizar) antes de evaluar. También estudiamos **límites laterales** (acercándose por izquierda o por derecha) y **límites en el infinito**, que revelan el comportamiento de la función para valores muy grandes.

Los límites permiten detectar **asíntotas** (rectas a las que la curva se aproxima) y definir la **continuidad**: una función es continua en un punto si su límite ahí coincide con el valor de la función. Sin límites no existirían las derivadas ni las integrales: son la puerta de entrada al cálculo.`,
  keyConcepts: [
    "Noción intuitiva de límite",
    "Límites laterales (izquierda y derecha)",
    "Indeterminación 0/0",
    "Límites en el infinito",
    "Asíntotas verticales y horizontales",
    "Continuidad",
  ],
  formulas: [
    { label: "Definición (notación)", latex: String.raw`\lim_{x\to a} f(x) = L` },
    { label: "Continuidad en un punto", latex: String.raw`\lim_{x\to a} f(x) = f(a)` },
    {
      label: "Asíntota horizontal",
      latex: String.raw`\lim_{x\to \infty} f(x) = L \;\Rightarrow\; y = L`,
    },
  ],
  examples: [
    {
      problem: String.raw`Calculá $\lim_{x\to 2}\ (x^2 + 1)$.`,
      steps: [
        String.raw`La función es continua, así que reemplazamos: $x = 2$.`,
        String.raw`$2^2 + 1 = 4 + 1$.`,
      ],
      result: String.raw`$\lim_{x\to 2}(x^2+1) = 5$.`,
    },
    {
      problem: String.raw`Resolvé $\lim_{x\to 3}\ \dfrac{x^2 - 9}{x - 3}$.`,
      steps: [
        String.raw`Al reemplazar da $\tfrac{0}{0}$ (indeterminación): hay que trabajar la expresión.`,
        String.raw`Factorizamos el numerador: $x^2 - 9 = (x-3)(x+3)$.`,
        String.raw`Simplificamos: $\dfrac{(x-3)(x+3)}{x-3} = x + 3$, y ahora reemplazamos $x=3$.`,
      ],
      result: String.raw`$\lim_{x\to 3}\dfrac{x^2-9}{x-3} = 6$.`,
    },
    {
      problem: String.raw`Hallá $\lim_{x\to \infty}\ \dfrac{1}{x}$.`,
      steps: [
        String.raw`A medida que $x$ crece, $\tfrac{1}{x}$ se hace cada vez más chico.`,
        String.raw`Se acerca a $0$ sin llegar nunca.`,
      ],
      result: String.raw`$\lim_{x\to\infty}\dfrac{1}{x} = 0$ (asíntota horizontal $y=0$).`,
    },
  ],
  commonMistakes: [
    String.raw`Creer que el límite es siempre $f(a)$. Solo coincide si la función es continua en $a$.`,
    String.raw`Rendirse ante una indeterminación $\tfrac{0}{0}$ sin intentar factorizar o simplificar.`,
    "Olvidar revisar los límites laterales cuando la función cambia de definición.",
    String.raw`Pensar que $\tfrac{1}{0}$ "da $0$": tiende a infinito, no a cero.`,
  ],
  checklist: [
    "Interpreto el límite como acercamiento, no como llegada",
    "Reemplazo cuando la función es continua",
    "Levanto indeterminaciones 0/0 factorizando",
    "Calculo límites en el infinito",
    "Relaciono límites con asíntotas y continuidad",
  ],
};
