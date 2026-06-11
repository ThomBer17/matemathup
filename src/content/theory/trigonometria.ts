import type { TheoryTopic } from "./types";

export const trigonometria: TheoryTopic = {
  slug: "trigonometria",
  summary: String.raw`La **trigonometría** estudia la relación entre los ángulos y los lados de los triángulos, y por extensión, los fenómenos que se repiten (periódicos). Todo arranca en el **triángulo rectángulo**: fijado un ángulo agudo $\theta$, las razones entre sus lados (opuesto, adyacente e hipotenusa) son constantes y definen el **seno**, el **coseno** y la **tangente**.

Para trabajar con ángulos cualesquiera usamos la **circunferencia unitaria** (radio $1$): a cada ángulo le corresponde un punto $(\cos\theta, \sin\theta)$. Desde ahí surgen las identidades, como la **pitagórica** $\sin^2\theta+\cos^2\theta=1$. Los ángulos se miden en grados o en **radianes**, donde una vuelta completa equivale a $2\pi$.

Con estas herramientas resolvemos triángulos (encontrar lados o ángulos que faltan) usando el **teorema del seno** y el **del coseno**, y modelamos ondas y movimientos periódicos con las funciones $\sin x$, $\cos x$ y $\tan x$. La trigonometría conecta geometría, álgebra y funciones, y aparece en física, ingeniería y computación gráfica.`,
  keyConcepts: [
    "Seno, coseno y tangente",
    "Triángulo rectángulo: opuesto, adyacente, hipotenusa",
    "Circunferencia unitaria",
    "Radianes y grados",
    "Identidad pitagórica",
    "Teorema del seno y del coseno",
  ],
  formulas: [
    { label: "Razones trigonométricas", latex: String.raw`\sin\theta=\frac{\text{op}}{\text{hip}}\quad \cos\theta=\frac{\text{ady}}{\text{hip}}\quad \tan\theta=\frac{\text{op}}{\text{ady}}` },
    { label: "Identidad pitagórica", latex: String.raw`\sin^2\theta + \cos^2\theta = 1` },
    { label: "Teorema del seno", latex: String.raw`\frac{a}{\sin A}=\frac{b}{\sin B}=\frac{c}{\sin C}` },
    { label: "Teorema del coseno", latex: String.raw`c^2 = a^2 + b^2 - 2ab\cos C` },
    { label: "Conversión a radianes", latex: String.raw`\text{rad} = \text{grados}\cdot\frac{\pi}{180^\circ}` },
  ],
  examples: [
    {
      problem: String.raw`En un triángulo rectángulo, el cateto opuesto a $\theta$ mide $3$ y la hipotenusa $5$. Calculá $\sin\theta$ y $\cos\theta$.`,
      steps: [
        String.raw`$\sin\theta = \dfrac{\text{op}}{\text{hip}} = \dfrac{3}{5}$.`,
        String.raw`Buscamos el cateto adyacente con Pitágoras: $\text{ady}=\sqrt{5^2-3^2}=\sqrt{16}=4$.`,
        String.raw`$\cos\theta = \dfrac{\text{ady}}{\text{hip}} = \dfrac{4}{5}$.`,
      ],
      result: String.raw`$\sin\theta = \dfrac{3}{5}=0{,}6$ y $\cos\theta = \dfrac{4}{5}=0{,}8$.`,
    },
    {
      problem: String.raw`Sabiendo que $\cos\theta = \tfrac{1}{2}$ y $\theta$ es agudo, hallá $\sin\theta$.`,
      steps: [
        String.raw`Usamos la identidad pitagórica: $\sin^2\theta = 1 - \cos^2\theta$.`,
        String.raw`$\sin^2\theta = 1 - \left(\tfrac{1}{2}\right)^2 = 1 - \tfrac{1}{4} = \tfrac{3}{4}$.`,
        String.raw`Como $\theta$ es agudo, $\sin\theta>0$: $\sin\theta = \sqrt{\tfrac{3}{4}} = \tfrac{\sqrt{3}}{2}$.`,
      ],
      result: String.raw`$\sin\theta = \dfrac{\sqrt{3}}{2}$.`,
    },
    {
      problem: String.raw`Convertí $60^\circ$ a radianes.`,
      steps: [
        String.raw`Multiplicamos por $\tfrac{\pi}{180^\circ}$: $60^\circ\cdot\dfrac{\pi}{180^\circ}$.`,
        String.raw`Simplificamos $\tfrac{60}{180}=\tfrac{1}{3}$.`,
      ],
      result: String.raw`$60^\circ = \dfrac{\pi}{3}\ \text{rad}$.`,
    },
  ],
  commonMistakes: [
    "Confundir seno con coseno: seno usa el cateto opuesto, coseno el adyacente.",
    String.raw`Olvidar que $\sin\theta$ y $\cos\theta$ siempre están entre $-1$ y $1$.`,
    String.raw`Mezclar grados y radianes en la calculadora. Verificá el modo (DEG/RAD).`,
    String.raw`Escribir $\sin^2\theta$ como $\sin(\theta^2)$. Significa $(\sin\theta)^2$.`,
  ],
  checklist: [
    "Identifico opuesto, adyacente e hipotenusa según el ángulo",
    "Aplico seno, coseno y tangente correctamente",
    "Uso la identidad pitagórica para despejar razones",
    "Convierto entre grados y radianes",
    "Resuelvo triángulos con teorema del seno y del coseno",
  ],
};
