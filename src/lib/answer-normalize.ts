export type ExerciseType = "multiple_choice" | "true_false" | "open";

const TRUE_FORMS = new Set([
  "true", "verdadero", "v", "t", "sí", "si", "yes", "y", "1",
]);
const FALSE_FORMS = new Set([
  "false", "falso", "f", "no", "n", "0",
]);

function basic(s: string): string {
  return s.trim().toLowerCase().replace(/[.\s]+$/g, "").replace(/\s+/g, " ");
}

export function normalizeTrueFalse(value: string): "true" | "false" | null {
  const v = basic(value);
  if (TRUE_FORMS.has(v)) return "true";
  if (FALSE_FORMS.has(v)) return "false";
  return null;
}

export function trueFalseLabel(canonical: "true" | "false"): string {
  return canonical === "true" ? "Verdadero" : "Falso";
}

/**
 * Compara dos respuestas según el tipo de ejercicio.
 * Para true_false acepta variantes de idioma; para el resto normaliza espacios + case.
 */
export function answersEqual(a: string, b: string, type: ExerciseType): boolean {
  if (type === "true_false") {
    const ca = normalizeTrueFalse(a);
    const cb = normalizeTrueFalse(b);
    if (ca && cb) return ca === cb;
  }
  return basic(a) === basic(b);
}

/**
 * Devuelve el texto humanizado de una respuesta correcta para mostrar al alumno.
 * Para true_false fuerza "Verdadero"/"Falso" en lugar del string crudo del modelo.
 */
export function displayCorrectAnswer(correctAnswer: string, type: ExerciseType): string {
  if (type === "true_false") {
    const c = normalizeTrueFalse(correctAnswer);
    if (c) return trueFalseLabel(c);
  }
  return correctAnswer;
}
