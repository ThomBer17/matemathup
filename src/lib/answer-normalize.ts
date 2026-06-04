import { parseNumericValue } from "@/lib/ai/consistency";

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
  if (basic(a) === basic(b)) return true;
  // Equivalencia numérica: "0.5" == "1/2", "2" == "2.0", "50%" no aplica.
  // Evita marcar incorrecta una respuesta correcta escrita en otra forma.
  const na = parseNumericValue(a);
  const nb = parseNumericValue(b);
  if (na !== null && nb !== null) {
    return Math.abs(na - nb) <= Math.max(1e-9, 1e-6 * Math.max(Math.abs(na), Math.abs(nb)));
  }
  return false;
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
