/**
 * Banco de preguntas del Test Diagnóstico. Contenido ESTÁTICO (sin IA): una pregunta
 * por tema, nivel intermedio, para calibrar el punto de partida del alumno.
 * El texto admite LaTeX entre $...$ (se renderiza con MathRich/KaTeX).
 *
 * Para agregar/editar: tocás este archivo. `topicSlug` debe coincidir con la tabla `topics`.
 */

export interface DiagnosticQuestion {
  id: string;
  topicSlug: string;
  /** Nivel (1-5) que representa la pregunta: define la dificultad inicial si acierta. */
  difficulty: number;
  statement: string;
  options: string[];
  correctIndex: number;
}

export const DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  {
    id: "nr-1",
    topicSlug: "numeros-reales",
    difficulty: 3,
    statement: "¿Cuál de estos números es irracional?",
    options: ["$0{,}25$", "$\\dfrac{3}{7}$", "$\\sqrt{2}$", "$-4$"],
    correctIndex: 2,
  },
  {
    id: "alg-1",
    topicSlug: "algebra",
    difficulty: 3,
    statement: "Las soluciones de $x^2 - 5x + 6 = 0$ son:",
    options: ["$x=2$ y $x=3$", "$x=-2$ y $x=-3$", "$x=1$ y $x=6$", "$x=5$ y $x=6$"],
    correctIndex: 0,
  },
  {
    id: "fun-1",
    topicSlug: "funciones",
    difficulty: 3,
    statement: "La pendiente de la recta que pasa por $(1,2)$ y $(3,8)$ es:",
    options: ["$3$", "$2$", "$6$", "$\\dfrac{1}{3}$"],
    correctIndex: 0,
  },
  {
    id: "tri-1",
    topicSlug: "trigonometria",
    difficulty: 3,
    statement: "¿Cuánto vale $\\sin(30^\\circ)$?",
    options: ["$\\dfrac{1}{2}$", "$\\dfrac{\\sqrt{3}}{2}$", "$1$", "$\\dfrac{\\sqrt{2}}{2}$"],
    correctIndex: 0,
  },
  {
    id: "log-1",
    topicSlug: "logaritmos",
    difficulty: 3,
    statement: "$\\log_2 8$ es igual a:",
    options: ["$3$", "$4$", "$2$", "$8$"],
    correctIndex: 0,
  },
  {
    id: "sis-1",
    topicSlug: "sistemas-de-ecuaciones",
    difficulty: 3,
    statement: "La solución del sistema $\\begin{cases} x+y=5 \\\\ x-y=1 \\end{cases}$ es:",
    options: ["$x=3,\\ y=2$", "$x=2,\\ y=3$", "$x=4,\\ y=1$", "No tiene solución"],
    correctIndex: 0,
  },
  {
    id: "geo-1",
    topicSlug: "geometria",
    difficulty: 3,
    statement: "En un triángulo rectángulo de catetos $3$ y $4$, la hipotenusa mide:",
    options: ["$5$", "$7$", "$12$", "$\\sqrt{7}$"],
    correctIndex: 0,
  },
  {
    id: "pro-1",
    topicSlug: "probabilidad",
    difficulty: 3,
    statement: "Al tirar un dado, la probabilidad de obtener un número par es:",
    options: ["$\\dfrac{1}{2}$", "$\\dfrac{1}{3}$", "$\\dfrac{1}{6}$", "$\\dfrac{2}{3}$"],
    correctIndex: 0,
  },
  {
    id: "lim-1",
    topicSlug: "limites",
    difficulty: 3,
    statement: "$\\lim_{x\\to 2}\\,(x^2 + 1)$ vale:",
    options: ["$5$", "$4$", "$1$", "No existe"],
    correctIndex: 0,
  },
  {
    id: "der-1",
    topicSlug: "derivadas",
    difficulty: 3,
    statement: "La derivada de $f(x) = x^3$ es:",
    options: ["$3x^2$", "$x^2$", "$3x$", "$2x^3$"],
    correctIndex: 0,
  },
  {
    id: "int-1",
    topicSlug: "integrales",
    difficulty: 3,
    statement: "$\\int x^2\\,dx$ es igual a:",
    options: ["$\\dfrac{x^3}{3} + C$", "$2x + C$", "$x^3 + C$", "$\\dfrac{x^2}{2} + C$"],
    correctIndex: 0,
  },
];
