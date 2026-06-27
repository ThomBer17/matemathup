/**
 * Scope curricular por tema (programa de matemática de secundaria argentina, 5°-6° año).
 *
 * Propósito: la IA tiende a confundir "dificultad alta" con "tema más avanzado".
 * Este módulo restringe la generación al scope pedagógico del tema:
 *   - "concepts": lo que SÍ debe usar la IA (se inyecta en el prompt).
 *   - "outOfScopeKeywords": lo que NO debe aparecer (se valida post-generación).
 *
 * Si el tema no está mapeado, se aplica un fallback con keywords genéricas
 * de matemática universitaria (Taylor, integrales, EDO, etc.).
 */

export interface TopicScope {
  /** Descripción curricular breve para inyectar en el prompt */
  description: string;
  /** Conceptos permitidos — anclan al modelo dentro del tema */
  concepts: string[];
  /** Palabras/frases fuera de scope — disparan retry si aparecen */
  outOfScopeKeywords: string[];
}

const FALLBACK_OUT_OF_SCOPE = [
  "taylor",
  "maclaurin",
  "fourier",
  "transformada",
  "ecuación diferencial",
  "ecuaciones diferenciales",
  "matriz",
  "determinante",
  "tensorial",
  "topología",
  "homomorfismo",
  "isomorfismo",
];

const CURRICULUM: Record<string, TopicScope> = {
  "numeros-reales": {
    description:
      "Conjuntos numéricos, operaciones, intervalos, valor absoluto, raíces y propiedades del orden.",
    concepts: [
      "clasificación N / Z / Q / I / R",
      "operaciones combinadas con reales",
      "intervalos y notación de conjuntos",
      "valor absoluto y distancia",
      "raíces cuadradas y racionalización",
      "potencias con exponente entero o fraccionario",
      "propiedades del orden y desigualdades simples",
      "aproximaciones decimales",
      "densidad de Q en R",
    ],
    outOfScopeKeywords: [
      "taylor",
      "maclaurin",
      "serie infinita",
      "series infinitas",
      "derivada",
      "integral",
      "límite de una función",
      "matriz",
      "determinante",
      "vectorial",
      "transformada",
    ],
  },

  funciones: {
    description:
      "Concepto de función, dominio e imagen, funciones lineales, cuadráticas, racionales, exponenciales y logarítmicas elementales.",
    concepts: [
      "definición de función, dominio e imagen",
      "función lineal y cuadrática",
      "función racional simple",
      "función exponencial y logarítmica",
      "ceros, signo, crecimiento",
      "composición e inversa básica",
      "gráficos cartesianos",
    ],
    outOfScopeKeywords: [
      "taylor",
      "serie",
      "transformada",
      "derivada parcial",
      "integral definida",
      "convergencia uniforme",
    ],
  },

  trigonometria: {
    description:
      "Razones trigonométricas, identidades, resolución de triángulos, ecuaciones trigonométricas básicas.",
    concepts: [
      "razones trigonométricas (sen, cos, tan, sec, csc, cot)",
      "círculo trigonométrico y radianes",
      "identidades pitagóricas",
      "resolución de triángulos rectángulos",
      "teorema del seno y del coseno",
      "ecuaciones trigonométricas simples",
      "gráficas de seno, coseno y tangente",
    ],
    outOfScopeKeywords: [
      "serie de fourier",
      "transformada",
      "derivada de",
      "integral de",
      "ecuación diferencial",
    ],
  },

  logaritmos: {
    description: "Definición y propiedades de logaritmos, ecuaciones logarítmicas y exponenciales.",
    concepts: [
      "definición de logaritmo",
      "propiedades del logaritmo (producto, cociente, potencia, cambio de base)",
      "ecuaciones logarítmicas",
      "ecuaciones exponenciales",
      "modelado de crecimiento/decrecimiento exponencial",
    ],
    outOfScopeKeywords: ["derivada", "integral", "serie de taylor", "logaritmo complejo"],
  },

  limites: {
    description:
      "Concepto intuitivo y formal de límite, cálculo de límites, asíntotas, continuidad.",
    concepts: [
      "noción intuitiva de límite",
      "cálculo de límites finitos e infinitos",
      "límites laterales",
      "indeterminaciones 0/0 e ∞/∞ básicas",
      "asíntotas verticales y horizontales",
      "continuidad de funciones elementales",
    ],
    outOfScopeKeywords: [
      "derivada de",
      "integral",
      "serie de taylor",
      "regla de l'hôpital",
      "epsilon-delta",
      "convergencia uniforme",
    ],
  },

  derivadas: {
    description:
      "Definición de derivada, reglas de derivación, aplicaciones (recta tangente, máximos/mínimos, monotonía).",
    concepts: [
      "definición de derivada como límite",
      "derivadas de funciones elementales",
      "regla de la suma, producto, cociente, cadena",
      "recta tangente",
      "monotonía y extremos relativos",
      "concavidad y puntos de inflexión",
      "problemas de optimización simples",
    ],
    outOfScopeKeywords: [
      "integral",
      "ecuación diferencial",
      "derivada parcial",
      "serie de taylor",
      "jacobiano",
    ],
  },

  integrales: {
    description:
      "Integral indefinida, integrales inmediatas, integral definida y aplicaciones (área bajo la curva).",
    concepts: [
      "antiderivada e integral indefinida",
      "integrales inmediatas",
      "método de sustitución simple",
      "integración por partes (introductorio)",
      "integral definida y teorema fundamental",
      "cálculo de áreas",
    ],
    outOfScopeKeywords: [
      "integral múltiple",
      "integral de superficie",
      "integral de línea",
      "ecuación diferencial",
      "transformada",
      "serie de fourier",
    ],
  },

  algebra: {
    description: "Polinomios, factorización, ecuaciones e inecuaciones algebraicas.",
    concepts: [
      "polinomios y operaciones",
      "factorización (factor común, diferencia de cuadrados, trinomio cuadrado)",
      "ecuaciones lineales y cuadráticas",
      "inecuaciones lineales y cuadráticas",
      "ecuaciones racionales simples",
      "teorema del resto y Ruffini",
    ],
    outOfScopeKeywords: [
      "grupo abeliano",
      "anillo",
      "cuerpo",
      "extensión de cuerpos",
      "matriz",
      "determinante",
      "espacio vectorial",
    ],
  },

  geometria: {
    description:
      "Geometría plana y del espacio: triángulos, polígonos, círculos, áreas, volúmenes, semejanza, Pitágoras.",
    concepts: [
      "triángulos y polígonos",
      "teorema de Pitágoras",
      "semejanza y Thales",
      "círculo: longitud, área, ángulos inscriptos",
      "áreas y perímetros",
      "volúmenes de cuerpos elementales",
      "coordenadas cartesianas en el plano",
    ],
    outOfScopeKeywords: [
      "topología",
      "variedad diferenciable",
      "curvatura gaussiana",
      "geometría no euclidiana",
      "tensor",
    ],
  },

  "sistemas-de-ecuaciones": {
    description:
      "Sistemas de ecuaciones lineales 2×2 y 3×3, métodos de resolución, interpretación geométrica.",
    concepts: [
      "sistema 2x2 y 3x3",
      "método de sustitución",
      "método de igualación",
      "método de reducción/eliminación",
      "sistemas compatibles, incompatibles, indeterminados",
      "interpretación geométrica (rectas, planos)",
    ],
    outOfScopeKeywords: [
      "matriz inversa",
      "determinante",
      "rango",
      "espacio vectorial",
      "Cramer con matrices",
    ],
  },

  probabilidad: {
    description: "Probabilidad clásica, combinatoria básica, estadística descriptiva.",
    concepts: [
      "probabilidad clásica de Laplace",
      "combinaciones, permutaciones, variaciones",
      "probabilidad condicional simple",
      "media, mediana, moda",
      "varianza y desvío estándar",
      "frecuencia relativa y acumulada",
    ],
    outOfScopeKeywords: [
      "distribución normal multivariante",
      "teorema central del límite",
      "cadena de markov",
      "bayes complejo",
      "función generatriz",
    ],
  },
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Aliases comunes (nombre alternativo → slug canónico)
const ALIASES: Record<string, string> = {
  numeros: "numeros-reales",
  reales: "numeros-reales",
  "logaritmos-y-exponenciales": "logaritmos",
  exponenciales: "logaritmos",
  trigo: "trigonometria",
  polinomios: "algebra",
  ecuaciones: "algebra",
  "probabilidad-y-estadistica": "probabilidad",
  estadistica: "probabilidad",
  sistemas: "sistemas-de-ecuaciones",
};

export function getTopicScope(topicNameOrSlug: string): TopicScope {
  const key = normalize(topicNameOrSlug);
  const resolved = CURRICULUM[key] ?? CURRICULUM[ALIASES[key]];
  if (resolved) return resolved;

  // Fallback: scope genérico, no bloquea pero injecta out-of-scope universitario
  return {
    description: `Conceptos y aplicaciones de ${topicNameOrSlug} dentro del programa de 5°-6° año de secundaria argentina.`,
    concepts: [
      `conceptos fundamentales de ${topicNameOrSlug}`,
      "aplicaciones contextualizadas",
      "ejercicios típicos del nivel secundario",
    ],
    outOfScopeKeywords: FALLBACK_OUT_OF_SCOPE,
  };
}

/**
 * Chequea si el texto contiene palabras fuera del scope.
 * Match por word boundary (case-insensitive, accent-insensitive).
 */
export function validateInScope(
  text: string,
  scope: TopicScope,
): { inScope: true } | { inScope: false; matched: string } {
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  for (const kw of scope.outOfScopeKeywords) {
    const normalizedKw = kw
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");
    const escaped = normalizedKw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b${escaped}\\b`, "i");
    if (pattern.test(normalized)) {
      return { inScope: false, matched: kw };
    }
  }
  return { inScope: true };
}
