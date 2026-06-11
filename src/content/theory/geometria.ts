import type { TheoryTopic } from "./types";

export const geometria: TheoryTopic = {
  slug: "geometria",
  summary: String.raw`La **geometría** estudia las figuras, sus medidas y las relaciones entre ellas, en el plano y en el espacio. En el plano trabajamos con **triángulos**, cuadriláteros y polígonos en general, además de la **circunferencia** y el **círculo**. Calculamos **perímetros** (longitud del borde) y **áreas** (superficie encerrada), y en el espacio, **volúmenes** de cuerpos como prismas, cilindros, conos y esferas.

Una herramienta central es el **teorema de Pitágoras**, que relaciona los lados de un triángulo rectángulo: $a^2 + b^2 = c^2$. También usamos la **semejanza** (figuras con la misma forma pero distinto tamaño, lados proporcionales) y el **teorema de Thales** para resolver problemas con rectas paralelas.

La geometría no es solo memorizar fórmulas: es razonar sobre por qué valen, identificar qué figura tenés delante y elegir la herramienta adecuada. Aparece en arquitectura, diseño, navegación y en la propia trigonometría, que es geometría medida con números.`,
  keyConcepts: [
    "Triángulos y polígonos",
    "Teorema de Pitágoras",
    "Semejanza y teorema de Thales",
    "Perímetro y área",
    "Circunferencia y círculo",
    "Volúmenes de cuerpos",
  ],
  formulas: [
    { label: "Teorema de Pitágoras", latex: String.raw`a^2 + b^2 = c^2` },
    { label: "Área del triángulo", latex: String.raw`A = \frac{\text{base}\cdot\text{altura}}{2}` },
    { label: "Área y longitud del círculo", latex: String.raw`A = \pi r^2 \qquad L = 2\pi r` },
    { label: "Volumen del cilindro", latex: String.raw`V = \pi r^2 h` },
  ],
  examples: [
    {
      problem: String.raw`Un triángulo rectángulo tiene catetos de $6$ y $8$. Hallá la hipotenusa.`,
      steps: [
        String.raw`Por Pitágoras: $c^2 = 6^2 + 8^2 = 36 + 64 = 100$.`,
        String.raw`$c = \sqrt{100} = 10$.`,
      ],
      result: String.raw`La hipotenusa mide $10$.`,
    },
    {
      problem: String.raw`Calculá el área de un círculo de radio $5$.`,
      steps: [
        String.raw`Usamos $A = \pi r^2$ con $r = 5$.`,
        String.raw`$A = \pi \cdot 5^2 = 25\pi \approx 78{,}54$.`,
      ],
      result: String.raw`$A = 25\pi \approx 78{,}54$ unidades cuadradas.`,
    },
    {
      problem: String.raw`Dos triángulos son semejantes con razón $2$. Si un lado del chico mide $7$, ¿cuánto mide el correspondiente del grande?`,
      steps: [
        String.raw`En figuras semejantes, los lados correspondientes son proporcionales.`,
        String.raw`Multiplicamos por la razón: $7 \cdot 2 = 14$.`,
      ],
      result: String.raw`El lado correspondiente mide $14$.`,
    },
  ],
  commonMistakes: [
    String.raw`Aplicar Pitágoras a un triángulo que no es rectángulo.`,
    String.raw`Confundir perímetro (borde) con área (superficie).`,
    String.raw`Usar el diámetro en lugar del radio en $A=\pi r^2$.`,
    "Olvidar las unidades: el área va en unidades cuadradas y el volumen en cúbicas.",
  ],
  checklist: [
    "Aplico Pitágoras solo en triángulos rectángulos",
    "Calculo perímetros y áreas de figuras planas",
    "Uso semejanza y proporcionalidad de lados",
    "Calculo áreas y longitudes del círculo",
    "Distingo área de volumen y uso las unidades correctas",
  ],
};
