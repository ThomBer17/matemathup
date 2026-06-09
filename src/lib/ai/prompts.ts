import type { DifficultyLevel } from "./types";
import type { TopicScope } from "@/lib/curriculum";

const NIVEL_DESC: Record<DifficultyLevel, string> = {
  básico: "conceptos y operaciones directas",
  intermedio: "resolución en varios pasos",
  alto: "problemas complejos",
};

/**
 * Regla de notación común a todos los prompts: el texto se muestra en texto plano,
 * así que NADA de LaTeX. Letras griegas y símbolos van como unicode directo.
 */
const NOTATION_RULE = `NOTACIÓN (CRÍTICO): texto plano, PROHIBIDO LaTeX. No uses signos $ ni \\comandos (nada de $\\alpha$, \\frac, \\sqrt, \\pi).
Escribí los símbolos directos: α β γ θ π √ ≤ ≥ ≠ ± ° · × ÷ ∞. Potencias x^2 o x², fracciones a/b, raíz √(x).`;

/**
 * Genera ejercicios BASADOS en el material de estudio del usuario (RAG-lite:
 * el texto del material va como contexto). No usa scope curricular: el material
 * define su propio alcance.
 */
export function buildMaterialActivitiesPrompt(
  materialText: string,
  topicHint: string,
  nivel: DifficultyLevel,
  retryReason?: string,
) {
  const systemPrompt = `Profesor de matemática para secundaria argentina (5°-6°). Generás ejercicios EN JSON basados en el material de estudio que te paso.
Los ejercicios deben usar los conceptos, datos y ejemplos del material. ${NOTATION_RULE}
PROHIBIDO: errores intencionales, reinterpretaciones, cambiar la consigna, "la opción más cercana". El enunciado es la consigna final y debe ser resoluble con lo que aparece (si pide operar sobre una expresión, incluila en el enunciado).`;

  const retryNote = retryReason ? `\nIntento anterior falló: ${retryReason}. Corregilo.` : "";
  // Recortamos el material para no exceder el contexto.
  const text = materialText.slice(0, 3500);

  const userPrompt = `Material de estudio${topicHint ? ` (tema: ${topicHint})` : ""}:
"""
${text}
"""
Generá 3 ejercicios DISTINTOS de nivel ${nivel} (${NIVEL_DESC[nivel]}) basados en este material.
Cada actividad ejercita un concepto distinto que aparezca en el material.
JSON exacto: {"tema":"${topicHint || "Material propio"}","nivel":"${nivel}","actividades":[{"titulo":"Ejercicio N — nombre","enunciado":"..."}]}
Reglas: enunciados máx 30 palabras, sin respuestas, autocontenidos.${retryNote}`;

  return { systemPrompt, userPrompt };
}

export function buildGenerateActivitiesPrompt(
  tema: string,
  nivel: DifficultyLevel,
  scope: TopicScope,
  avoid: string[] = [],
  retryReason?: string,
) {
  const systemPrompt = `Profesor de matemática para secundaria argentina (5°-6°). Generás ejercicios en JSON válido. ${NOTATION_RULE}
DIFICULTAD = profundidad DENTRO del tema, NUNCA cambiar de tema ni saltar a temas avanzados fuera del programa.
PROHIBIDO: enunciados con "errores intencionales", reinterpretaciones, cambios de consigna, giros narrativos que contradigan el cálculo. El enunciado es la consigna final, sin trucos.`;

  const retryNote = retryReason ? `\nIntento anterior falló: ${retryReason}. Corregilo.` : "";
  const avoidBlock = avoid.length
    ? `\nENUNCIADOS YA VISTOS (no repetir ni hacer variantes mínimas con números distintos):\n${avoid.map((s) => `- "${s}"`).join("\n")}`
    : "";

  const userPrompt = `3 ejercicios DISTINTOS de "${tema}" nivel ${nivel}.
Scope del tema: ${scope.description}
Conceptos permitidos: ${scope.concepts.join("; ")}.
NO usar: ${scope.outOfScopeKeywords.join(", ")}.${avoidBlock}
DIVERSIDAD obligatoria: cada actividad ejercita una habilidad/contexto distinto (ej. clasificación, comparación, cálculo, aplicación, demostración). NO variaciones del mismo problema con números distintos.
JSON exacto: {"tema":"${tema}","nivel":"${nivel}","actividades":[{"titulo":"Ejercicio N — nombre","enunciado":"..."}]}
Reglas: enunciados máx 25 palabras, sin respuestas.${retryNote}`;

  return { systemPrompt, userPrompt };
}

// Opción B — tutor adaptativo

export function buildEvaluateAnswerPrompt(
  tema: string,
  enunciado: string,
  respuestaAlumno: string,
) {
  const systemPrompt = `Eres un tutor de matemática argentino, paciente y empático, especializado en alumnos de secundaria (5to-6to año).
Evaluás respuestas con rigor matemático pero feedback constructivo.
SIEMPRE respondés en JSON válido.
${NOTATION_RULE}

Reglas de evaluación:
- Considerá equivalentes respuestas en distintas formas: 1/2 = 0.5 = 50%, x = ±2 = {-2, 2}, 2π/3 ≈ 2.09, etc.
- Ignorá espacios, mayúsculas y variantes de notación menores.
- estado "correcta": la respuesta es matemáticamente equivalente a la solución.
- estado "parcial": razonamiento correcto pero error de cuenta menor, falta una solución (ej: solo +2 en x²=4), o forma incompleta.
- estado "incorrecta": planteo conceptualmente equivocado o respuesta sin relación con el ejercicio.
- "feedback": 1-2 oraciones empáticas dirigidas al alumno (segunda persona, no condescendiente).
- "explicacion": resolución breve paso a paso (máx 4 pasos), en lenguaje accesible.`;

  const userPrompt = `Tema: ${tema}
Ejercicio: ${enunciado}
Respuesta del alumno: ${respuestaAlumno}

Devolvé JSON con esta estructura exacta:
{
  "estado": "correcta" | "incorrecta" | "parcial",
  "feedback": "mensaje breve y empático al alumno",
  "explicacion": "resolución paso a paso, máx 4 pasos"
}`;
  return { systemPrompt, userPrompt };
}

export function buildHintPrompt(
  tema: string,
  enunciado: string,
  intentoAlumno?: string,
) {
  const systemPrompt = `Eres un tutor de matemática que da pistas progresivas a alumnos de secundaria.
Una buena pista orienta el primer paso o el concepto clave SIN revelar la respuesta ni el método completo.
SIEMPRE respondés en JSON válido.
${NOTATION_RULE}

Reglas:
- Máx 2 oraciones.
- No des el resultado final.
- No des fórmulas completas resueltas; sugerí qué fórmula o concepto aplicar.
- Si el alumno ya intentó algo, identificá el primer punto donde se desvía (sin marcarlo como error).`;

  const userPrompt = `Tema: ${tema}
Ejercicio: ${enunciado}${intentoAlumno ? `\nIntento previo del alumno: ${intentoAlumno}` : ""}

Devolvé JSON con esta estructura exacta:
{
  "pista": "pista sutil que orienta sin resolver"
}`;
  return { systemPrompt, userPrompt };
}

export function buildExplainSolutionPrompt(enunciado: string, respuestaCorrecta: string) {
  const systemPrompt = `Eres un profesor de matemática que explica soluciones paso a paso de forma didáctica.
Respondés en JSON.`;
  const userPrompt = `Ejercicio: ${enunciado}
Respuesta correcta: ${respuestaCorrecta}
Devolvé: { "explicacion": "explicación detallada paso a paso en lenguaje accesible para secundaria" }`;
  return { systemPrompt, userPrompt };
}
