/**
 * Clasificador de material por tema. Lógica pura: puntúa el texto extraído contra
 * keywords distintivas de cada unidad y elige la de mayor coincidencia. Si no hay
 * confianza suficiente devuelve null → "Sin clasificar".
 *
 * No usa IA ni requests. Base para que a futuro un clasificador por embeddings lo reemplace
 * sin cambiar el contrato (classifyMaterial(text) → { topic, confidence }).
 */

interface TopicKeywords {
  slug: string;
  name: string;
  keywords: string[];
}

const TOPICS: TopicKeywords[] = [
  {
    slug: "numeros-reales",
    name: "Números Reales",
    keywords: [
      "racional",
      "irracional",
      "intervalo",
      "valor absoluto",
      "recta numerica",
      "densidad",
      "numero entero",
      "numero natural",
      "aproximacion",
      "conjunto numerico",
    ],
  },
  {
    slug: "algebra",
    name: "Álgebra",
    keywords: [
      "polinomio",
      "factoriz",
      "monomio",
      "binomio",
      "trinomio",
      "distributiva",
      "factor comun",
      "ruffini",
      "grado del polinomio",
      "diferencia de cuadrados",
    ],
  },
  {
    slug: "funciones",
    name: "Funciones",
    keywords: [
      "funcion",
      "dominio",
      "imagen",
      "codominio",
      "funcion lineal",
      "funcion cuadratica",
      "parabola",
      "pendiente",
      "ordenada al origen",
      "creciente",
      "decreciente",
      "raices de la funcion",
    ],
  },
  {
    slug: "trigonometria",
    name: "Trigonometría",
    keywords: [
      "seno",
      "coseno",
      "tangente",
      "radian",
      "triangulo rectangulo",
      "identidad trigonometrica",
      "teorema del seno",
      "teorema del coseno",
      "hipotenusa",
      "cateto",
      "circulo trigonometrico",
    ],
  },
  {
    slug: "logaritmos",
    name: "Logaritmos",
    keywords: [
      "logaritmo",
      "exponencial",
      "cambio de base",
      "antilogaritmo",
      "ecuacion logaritmica",
      "ecuacion exponencial",
    ],
  },
  {
    slug: "limites",
    name: "Límites",
    keywords: [
      "limite",
      "asintota",
      "continuidad",
      "tiende a",
      "indeterminacion",
      "limite lateral",
    ],
  },
  {
    slug: "derivadas",
    name: "Derivadas",
    keywords: [
      "derivada",
      "derivar",
      "regla de la cadena",
      "recta tangente",
      "razon de cambio",
      "punto critico",
      "regla del producto",
      "monotonia",
      "concavidad",
    ],
  },
  {
    slug: "integrales",
    name: "Integrales",
    keywords: [
      "integral",
      "integrar",
      "primitiva",
      "antiderivada",
      "area bajo la curva",
      "integral definida",
      "integral indefinida",
      "teorema fundamental",
    ],
  },
  {
    slug: "probabilidad",
    name: "Probabilidad y Estadística",
    keywords: [
      "probabilidad",
      "combinatoria",
      "permutacion",
      "combinacion",
      "mediana",
      "varianza",
      "desvio",
      "frecuencia",
      "suceso",
      "espacio muestral",
      "media aritmetica",
    ],
  },
  {
    slug: "geometria",
    name: "Geometría",
    keywords: [
      "perimetro",
      "pitagoras",
      "semejanza",
      "thales",
      "circunferencia",
      "poligono",
      "volumen",
      "teorema de pitagoras",
      "area del",
      "bisectriz",
      "mediatriz",
    ],
  },
  {
    slug: "sistemas-de-ecuaciones",
    name: "Sistemas de Ecuaciones",
    keywords: [
      "sistema de ecuaciones",
      "sustitucion",
      "igualacion",
      "reduccion",
      "eliminacion",
      "incognitas",
      "compatible determinado",
      "incompatible",
      "metodo de cramer",
    ],
  },
];

const MIN_HITS = 2;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");
}

// Señales generales de "esto es matemática" (independientes del tema).
const MATH_WORDS = [
  "calcul",
  "resolv",
  "resuelv",
  "ecuacion",
  "inecuacion",
  "funcion",
  "numero",
  "formula",
  "grafic",
  "demostr",
  "despej",
  "factoriz",
  "derivad",
  "integral",
  "limite",
  "logaritmo",
  "trigonometr",
  "geometr",
  "probabilidad",
  "polinomio",
  "fraccion",
  "raiz",
  "potencia",
  "angulo",
  "triangulo",
  "perimetro",
  "volumen",
  "teorema",
  "vertice",
  "pendiente",
  "exponente",
  "conjunto",
  "intervalo",
  "operacion",
  "multiplic",
  "division",
  "porcentaje",
  "decimal",
  "racional",
  "ejercicio",
  "problema",
  "incognita",
  "variable",
];

/** Cuenta tipos de símbolos matemáticos presentes (cada tipo suma 1). */
function symbolSignals(rawText: string): number {
  let n = 0;
  if (/\d\s*[=]\s*\d|[a-z]\s*=\s*\d|=\s*-?\d/i.test(rawText)) n++; // ecuación con =
  if (/\d\s*[+\-*/×÷·]\s*\d/.test(rawText)) n++; // operación entre números
  if (/\^|²|³|x\s*\^?\s*2/i.test(rawText)) n++; // potencias
  if (/√|sqrt|π|≤|≥|≠|∞|±/i.test(rawText)) n++; // símbolos matemáticos
  if (/\d+\s*\/\s*\d+/.test(rawText)) n++; // fracciones
  if (/\b\d+\s*[a-z]\b/i.test(rawText)) n++; // coeficiente-variable (2x)
  return n;
}

export interface ClassifyResult {
  /** Nombre del tema detectado, o null = "Sin clasificar". */
  topic: string | null;
  slug: string | null;
  /** 0–1 según cuán dominante fue el tema ganador. */
  confidence: number;
  /** true si el contenido parece matemático (independiente de detectar el tema). */
  isMath: boolean;
  /** Puntaje de "matematicidad" (para debug/umbral). */
  mathScore: number;
}

const MATH_THRESHOLD = 3;

export function classifyMaterial(text: string): ClassifyResult {
  const raw = text ?? "";
  const t = normalize(raw);
  if (t.trim().length < 10) {
    return { topic: null, slug: null, confidence: 0, isMath: false, mathScore: 0 };
  }

  const scored = TOPICS.map((topic) => {
    let hits = 0;
    for (const kw of topic.keywords) {
      if (t.includes(normalize(kw))) hits++;
    }
    return { topic, hits };
  }).sort((a, b) => b.hits - a.hits);

  const best = scored[0];
  const second = scored[1];

  // Señales generales de matemática.
  let generalWords = 0;
  for (const w of MATH_WORDS) {
    if (t.includes(w)) generalWords++;
  }
  const symbols = symbolSignals(raw);

  // Puntaje combinado: keywords de tema + palabras generales + símbolos.
  const mathScore = best.hits + generalWords + symbols;
  const isMath = mathScore >= MATH_THRESHOLD;

  if (best.hits < MIN_HITS) {
    return { topic: null, slug: null, confidence: 0, isMath, mathScore };
  }

  const confidence = best.hits / (best.hits + (second?.hits ?? 0));
  return { topic: best.topic.name, slug: best.topic.slug, confidence, isMath, mathScore };
}

/** Atajo: ¿el texto parece contenido matemático? */
export function isMathematicalContent(text: string): boolean {
  return classifyMaterial(text).isMath;
}
