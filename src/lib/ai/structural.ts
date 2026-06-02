/**
 * Validación estructural: ningún ejercicio debe renderizar si le falta info esencial.
 *
 * Detecta:
 *  - missing_statement   → enunciado vacío o demasiado corto
 *  - missing_options     → multiple_choice sin opciones suficientes
 *  - missing_answer_key  → sin respuesta correcta
 *  - missing_expression  → pide factorizar/resolver/etc. pero NO incluye el objeto matemático
 *  - invalid_structure   → forma inconsistente para el tipo
 */

export type StructuralReason =
  | "missing_statement"
  | "missing_options"
  | "missing_answer_key"
  | "missing_expression"
  | "invalid_structure";

export interface StructuralExercise {
  statement: string;
  type: "multiple_choice" | "true_false" | "open";
  options?: string[] | null;
  correct_answer: string;
}

/**
 * Heurística: ¿el texto contiene un objeto matemático explícito?
 * (polinomio, ecuación, expresión con variables/exponentes/raíces/fracciones).
 */
export function hasMathExpression(text: string): boolean {
  if (!text) return false;
  const t = text;
  return (
    /\^/.test(t) || // exponente x^2
    /√|sqrt/i.test(t) || // raíz
    /[a-zA-Z]\s*[²³⁴]/.test(t) || // x² superíndice
    /\d\s*[a-zA-Z]/.test(t) || // coeficiente-variable: 2x, 3y
    /[a-zA-Z]\s*[-+*/=]\s*\d/.test(t) || // x = 3, x+2
    /\d\s*[-+*/]\s*[a-zA-Z]/.test(t) || // 3 + x
    /\d+\s*\/\s*\d+/.test(t) || // fracción 3/4
    /[a-zA-Z]\s*[-+]\s*[a-zA-Z]/.test(t) || // a + b
    /=/.test(t) // cualquier igualdad/ecuación
  );
}

// Verbos/sustantivos que EXIGEN un objeto matemático explícito en el enunciado.
const REQUIRES_EXPRESSION =
  /\b(factoriz\w*|simplific\w*|desarroll\w*|deriv\w*|integr\w*|resolv\w*|resuelv\w*|despej\w*)\b/i;
const POINTER_NOUN =
  /\b(polinomio|ecuaci[oó]n|inecuaci[oó]n|sistema de ecuaciones|expresi[oó]n algebraica)\b/i;

/**
 * Chequea que, si el enunciado pide operar sobre un objeto matemático, ese objeto
 * esté efectivamente presente. Usado tanto en práctica adaptativa como en tandas.
 */
export function checkRequiredExpression(statement: string): { ok: true } | { ok: false; reason: string } {
  const needsExpr = REQUIRES_EXPRESSION.test(statement) || POINTER_NOUN.test(statement);
  if (needsExpr && !hasMathExpression(statement)) {
    return { ok: false, reason: "missing_expression: el enunciado pide operar sobre un objeto matemático que no está presente" };
  }
  return { ok: true };
}

export function validateStructure(
  ex: StructuralExercise,
): { ok: true } | { ok: false; reason: string } {
  const statement = (ex.statement ?? "").trim();

  if (statement.length < 10) {
    return { ok: false, reason: "missing_statement: enunciado vacío o demasiado corto" };
  }

  if (ex.type === "multiple_choice") {
    const opts = (ex.options ?? []).map((o) => o.trim()).filter(Boolean);
    if (opts.length < 2) {
      return { ok: false, reason: "missing_options: multiple_choice necesita al menos 2 opciones" };
    }
  }

  if (!ex.correct_answer || !ex.correct_answer.trim()) {
    return { ok: false, reason: "missing_answer_key: falta la respuesta correcta" };
  }

  if (ex.type === "true_false") {
    // La afirmación debe ser sustantiva, no solo "¿Verdadero o falso?".
    const stripped = statement.replace(/¿?\s*verdadero\s*o\s*falso\s*\??:?/i, "").trim();
    if (stripped.length < 8) {
      return { ok: false, reason: "invalid_structure: true_false sin afirmación explícita" };
    }
  }

  // Objeto matemático requerido (factorizar/resolver/... sin expresión).
  const exprCheck = checkRequiredExpression(statement);
  if (!exprCheck.ok) return exprCheck;

  return { ok: true };
}
