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
    /\d\s*[a-zA-Z](?![a-zA-Z])/.test(t) || // coeficiente-variable de 1 letra: 2x, 3y (no "5 metros")
    /(?<![a-zA-Z])[a-zA-Z]\s*[-+*/=]\s*\d/.test(t) || // variable de 1 letra: x = 3, x+2 (no "casa+2")
    /\d\s*[-+*/]\s*[a-zA-Z](?![a-zA-Z])/.test(t) || // 3 + x
    /\d+\s*\/\s*\d+/.test(t) || // fracción 3/4
    /(?<![a-zA-Z])[a-zA-Z]\s*[-+]\s*[a-zA-Z](?![a-zA-Z])/.test(t) || // a + b (variables sueltas)
    /=/.test(t) // cualquier igualdad/ecuación
  );
}

// Verbos que EXIGEN un objeto matemático explícito (en consigna imperativa).
const REQUIRES_EXPRESSION =
  /\b(factoriz\w*|simplific\w*|desarroll\w*|deriv\w*|integr\w*|resolv\w*|resuelv\w*|despej\w*)\b/i;
// Sustantivo APUNTADO con artículo definido/demostrativo ("el siguiente polinomio",
// "esta ecuación") → debe estar presente. "una ecuación" (indefinido) es conceptual.
const POINTER_NOUN =
  /\b(el|la|los|las|este|esta|estos|estas|siguiente|siguientes)\s+(siguiente\s+|pr[oó]xim[oa]\s+)?(polinomio|ecuaci[oó]n|inecuaci[oó]n|sistema|expresi[oó]n algebraica)\b/i;
// Pregunta conceptual / método general: NO requiere un objeto concreto.
// Nota: usamos \w* (no \w+) en los verbos porque acentos como "Explicá"/"definí"
// no cuentan como \w sin flag unicode; \w* matchea el stem igual.
const CONCEPTUAL =
  /[¿?]|^\s*(qu[eé]|c[oó]mo|cu[aá]ndo|cu[aá]l|por\s+qu[eé]|defin\w*|explic\w*|describ\w*|enumer\w*)|\bse\s+(resuelv|factoriz|calcul|simplific|despej|deriv|integr)\w*/i;

/**
 * Chequea que, si el enunciado pide operar sobre un objeto matemático concreto, ese
 * objeto esté presente. Ignora preguntas conceptuales ("¿cómo se resuelve...?").
 * Usado en práctica adaptativa y en tandas.
 */
export function checkRequiredExpression(statement: string): { ok: true } | { ok: false; reason: string } {
  if (CONCEPTUAL.test(statement)) return { ok: true }; // pregunta/método general
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
