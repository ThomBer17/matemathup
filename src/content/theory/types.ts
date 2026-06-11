/**
 * Modelo de contenido de la Biblioteca Matemática (Teoría).
 *
 * Contenido ESTÁTICO y versionado: cada tema es un archivo de datos en
 * src/content/theory/<slug>.ts. No usa IA en runtime. Para agregar/editar un tema
 * solo se toca su archivo de datos; la lógica de la app no cambia.
 *
 * Notación matemática: los campos de texto pueden incluir LaTeX inline entre $...$
 * (se renderiza con KaTeX vía <MathRich>). Las fórmulas se guardan sin delimitadores.
 * Tip: usar String.raw`...` en los .ts para no tener que escapar los backslashes.
 */

export interface TheoryFormula {
  /** Nombre/uso de la fórmula (ej. "Identidad pitagórica"). */
  label: string;
  /** LaTeX sin delimitadores $ — se muestra como fórmula destacada (display). */
  latex: string;
}

export interface TheoryExample {
  /** Enunciado del problema (admite $...$). */
  problem: string;
  /** Resolución paso a paso (cada paso admite $...$). */
  steps: string[];
  /** Resultado final (admite $...$). */
  result: string;
}

export interface TheoryTopic {
  /** Slug canónico, igual al de la tabla `topics` y a /topics/$slug. */
  slug: string;
  /** Resumen claro, máx ~500 palabras (admite $...$). */
  summary: string;
  /** Conceptos fundamentales del tema. */
  keyConcepts: string[];
  /** Fórmulas importantes (KaTeX). */
  formulas: TheoryFormula[];
  /** Ejemplos resueltos (al menos 2-3). */
  examples: TheoryExample[];
  /** Errores frecuentes (admiten $...$). */
  commonMistakes: string[];
  /** Checklist de repaso. */
  checklist: string[];
}
