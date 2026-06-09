import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAI, getAIConfig } from "@/lib/ai/service";
import { answersEqual, normalizeTrueFalse } from "@/lib/answer-normalize";
import { getTopicScope, validateInScope, type TopicScope } from "@/lib/curriculum";
import { checkArtificialPatterns, checkStatementMutation, checkClosestOptionFraud, checkMathematicalRationalization } from "@/lib/ai/quality-checks";
import { mostSimilar } from "@/lib/ai/diversity";
import { rateLimit } from "@/lib/ai/rate-limit";
import { checkConsistency } from "@/lib/ai/consistency";
import { sanitizeMathText } from "@/lib/ai/sanitize-text";
import { checkNumericSanity } from "@/lib/ai/numeric-sanity";
import { validateStructure } from "@/lib/ai/structural";
import { assertWithinFreemiumLimit } from "@/lib/billing/usage";

const SIMILARITY_THRESHOLD = 0.7;

const ExerciseSchema = z.object({
  statement: z.string().min(5),
  type: z.enum(["multiple_choice", "true_false", "open"]),
  options: z.array(z.string()).optional(),
  correct_answer: z.string().min(1),
  explanation: z.string().min(5),
  hints: z.array(z.string()).default([]),
  graph_expressions: z.array(z.string()).default([]),
});

type ParsedExercise = z.infer<typeof ExerciseSchema>;

function validateExercise(ex: ParsedExercise): { ok: true } | { ok: false; reason: string } {
  if (ex.type === "multiple_choice") {
    const opts = ex.options ?? [];
    if (opts.length < 2 || opts.length > 5) {
      return { ok: false, reason: `multiple_choice debe tener entre 2 y 5 opciones (tiene ${opts.length})` };
    }
    const normalized = opts.map((o) => o.trim().toLowerCase());
    if (new Set(normalized).size !== normalized.length) {
      return { ok: false, reason: "multiple_choice tiene opciones duplicadas" };
    }
    const matchCount = opts.filter((o) =>
      answersEqual(o, ex.correct_answer, "multiple_choice"),
    ).length;
    if (matchCount === 0) {
      // El resultado correcto NO está entre las opciones → ejercicio roto.
      return { ok: false, reason: `answer_not_in_choices: correct_answer "${ex.correct_answer}" no aparece en las opciones` };
    }
    if (matchCount > 1) {
      return { ok: false, reason: "multiple_choice_integrity_failed: correct_answer coincide con varias opciones" };
    }
  }

  if (ex.type === "true_false") {
    const canonical = normalizeTrueFalse(ex.correct_answer);
    if (!canonical) {
      return {
        ok: false,
        reason: `true_false: correct_answer "${ex.correct_answer}" no es Verdadero/Falso`,
      };
    }
    // La heurística de "contradicción en explicación" se removió: false-positiveaba en
    // explicaciones legítimas que mencionaban "es verdadero/falso" para sub-pasos.
    // Se confía en el prompt + retry estructural si falla la normalización.
  }

  if (ex.type === "open") {
    if (!ex.correct_answer.trim()) {
      return { ok: false, reason: "open: correct_answer vacío" };
    }
  }

  return { ok: true };
}

// System prompt minimalista. Las reglas de consistencia/narrativa se enforce-an
// con validadores deterministas (validateExercise, checkConsistency, checkArtificialPatterns),
// así que acá solo dejamos lo esencial. Menos input = menor tiempo al primer token.
const BASE_SYSTEM_PROMPT = `Profesor de matemática secundaria argentina (5°-6°). Generás UN ejercicio en JSON.
NOTACIÓN (CRÍTICO): texto plano, PROHIBIDO LaTeX. No uses $ ni \\comandos (nada de $\\alpha$, \\frac, \\sqrt, \\pi). Símbolos directos: α β θ π √ ≤ ≥ ≠ ± ° · ×. Potencias x^2, fracciones a/b.
Reglas: multiple_choice→4 opciones distintas, correct_answer EXACTO igual a una opción. true_false→correct_answer "Verdadero"/"Falso".
MULTIPLE CHOICE: resolvé primero, después construí las opciones de modo que UNA sea EXACTAMENTE tu resultado. PROHIBIDO elegir "la opción más cercana" si ninguna coincide: en ese caso corregí las opciones para incluir tu resultado exacto. Nada de "ninguna coincide, la más cercana es…".
correct_answer = el resultado real del cálculo de "explanation" (sin invertir ni reinterpretar). Si la consigna pide un intervalo/condición, verificá que el resultado la cumpla.
El "statement" DEBE incluir el objeto matemático explícito: si pedís factorizar/resolver/simplificar, escribí el polinomio/ecuación/expresión EN el enunciado. Nunca "Factorizá el siguiente polinomio" sin el polinomio.
Las cuentas y aproximaciones de "explanation" deben ser numéricamente correctas (ej: 1.732×3.646≈6.315, no 4.587).
LA MATEMÁTICA MANDA: resolvé el problema TAL CUAL está dado. Si tu cálculo da un resultado, ESE es el correct_answer. PROHIBIDO cambiar el divisor, el signo, los datos o la consigna para que coincida con una respuesta esperada. Nada de "la respuesta esperada era X, usemos Y en vez de Z". La consigna es inmutable.
NUNCA adaptes la matemática a las opciones. Orden obligatorio: 1) resolvé el ejercicio, 2) recién después generá las opciones de modo que UNA sea EXACTAMENTE tu resultado. Si ninguna opción coincide exacto con el resultado obtenido, el ejercicio está ROTO: corregí las opciones para incluir tu resultado exacto ANTES de responder. PROHIBIDO en la explicación: "la opción más cercana", "ajustar/modificar las opciones", "si asumimos un error", "las opciones originales", "para que la opción correcta sea…", "si usamos otro valor de tan/sen/cos". No justifiques ni muestres una respuesta incorrecta: la respuesta debe derivarse de la matemática, no la matemática de la respuesta.
DIFICULTAD = profundidad dentro del tema, nunca cambiar de tema.`;

function buildUserPrompt(
  topicName: string,
  diffLabel: string,
  difficulty: number,
  scope: TopicScope,
  avoid: string[],
  retryReason?: string,
) {
  const retryNote = retryReason ? `\nFalló: ${retryReason}. Corregilo.` : "";
  // Solo los últimos 3 enunciados a evitar (menos tokens que toda la historia).
  const avoidBlock = avoid.length
    ? `\nNo repitas (ni variantes con otros números): ${avoid.slice(0, 3).map((s) => `"${s}"`).join("; ")}`
    : "";

  return `Ejercicio de "${topicName}" dificultad ${diffLabel} (${difficulty}/5).
Conceptos: ${scope.concepts.slice(0, 6).join("; ")}.
NO usar: ${scope.outOfScopeKeywords.slice(0, 6).join(", ")}.${avoidBlock}
JSON: {"statement","type":"multiple_choice"|"true_false"|"open","options":["..."],"correct_answer","explanation","hints":["pista"],"graph_expressions":[]}
- explanation: máx 3 pasos cortos
- hints: 1 sola pista sutil
- graph_expressions: 1 expresión "y=..." SOLO si hay función graficable, sino []
Variá tipo y contexto.${retryNote}`;
}

async function generateOnce(
  topicName: string,
  diffLabel: string,
  difficulty: number,
  scope: TopicScope,
  avoid: string[],
  retryReason?: string,
): Promise<ParsedExercise> {
  const raw = await callAI<unknown>({
    systemPrompt: BASE_SYSTEM_PROMPT,
    userPrompt: buildUserPrompt(topicName, diffLabel, difficulty, scope, avoid, retryReason),
    label: retryReason ? "generateExercise:retry" : "generateExercise",
    model: getAIConfig().fastModel, // usa AI_MODEL_FAST si está seteado
    reasoningEffort: "low", // clave: acelera mucho en modelos de reasoning
    maxAttempts: 2, // fallar rápido en vez de 3 intentos lentos
  });
  const parsed = ExerciseSchema.parse(raw);
  // Limpiar LaTeX que el modelo a veces emite (ej. $\alpha$ → α).
  parsed.statement = sanitizeMathText(parsed.statement);
  parsed.explanation = sanitizeMathText(parsed.explanation);
  parsed.correct_answer = sanitizeMathText(parsed.correct_answer);
  parsed.options = parsed.options?.map(sanitizeMathText);
  parsed.hints = parsed.hints.map(sanitizeMathText);
  return parsed;
}

function combinedScopeText(ex: ParsedExercise): string {
  return [ex.statement, ex.explanation, ...(ex.options ?? []), ...ex.hints].join(" ");
}

export const generateExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { topicId: string; topicName: string; difficulty: number; avoid?: string[] }) => input,
  )
  .handler(async ({ data, context }) => {
    const { topicId, topicName, difficulty, avoid = [] } = data;
    const { userId, supabase } = context;

    // Freemium: bloquea si ya respondió su cuota diaria de práctica adaptativa.
    // Lanza un código estable que el cliente traduce a paywall (no error técnico).
    await assertWithinFreemiumLimit(supabase, userId, "adaptive");

    const rl = rateLimit(userId, "generate", 15);
    if (!rl.ok) {
      throw new Error(`Estás generando muy seguido. Probá en ${rl.retryInSec}s.`);
    }

    const diffLabel =
      ["muy fácil", "fácil", "intermedio", "difícil", "muy difícil"][difficulty - 1] ?? "intermedio";

    const scope = getTopicScope(topicName);
    const t0 = Date.now();
    let retried = false;

    let parsed: ParsedExercise;
    try {
      parsed = await generateOnce(topicName, diffLabel, difficulty, scope, avoid);
    } catch (e) {
      // Parse/schema falló en el primer intento — reintentamos UNA vez con instrucción explícita
      console.warn("[generateExercise] parse error (first attempt), retrying", e);
      try {
        parsed = await generateOnce(
          topicName,
          diffLabel,
          difficulty,
          scope,
          avoid,
          "JSON inválido o campos faltantes — devolvé el objeto exacto del schema",
        );
      } catch (e2) {
        console.error("AI parse error (after retry)", e2);
        throw new Error("La IA devolvió un formato inválido. Probá de nuevo.");
      }
    }

    const checkCore = (ex: ParsedExercise): { ok: true } | { ok: false; reason: string } => {
      // 1) Estructura básica (tipo/opciones/answer key)
      const structuralBasic = validateExercise(ex);
      if (!structuralBasic.ok) return structuralBasic;

      // 2) Estructura completa: campos requeridos + objeto matemático presente
      const structure = validateStructure(ex);
      if (!structure.ok) return structure;

      const combined = combinedScopeText(ex);

      // 3) Scope curricular
      const scopeRes = validateInScope(combined, scope);
      if (!scopeRes.inScope) {
        return { ok: false, reason: `invalid_structure: usó "${scopeRes.matched}" fuera del tema ${topicName}` };
      }

      // 4) Narrativa artificial / correcciones ficticias
      const artifact = checkArtificialPatterns(combined);
      if (!artifact.ok) {
        return { ok: false, reason: `math_validation_failed: narrativa artificial "${artifact.matched}"` };
      }

      // 4b) Mutación de consigna: la IA cambia el problema para forzar la respuesta.
      const mutation = checkStatementMutation(ex.explanation);
      if (!mutation.ok) {
        return { ok: false, reason: `statement_mutation_attempt: "${mutation.matched}"` };
      }

      // 4c) Multiple choice: "ninguna opción coincide, la más cercana es…" = roto.
      if (ex.type === "multiple_choice") {
        const closest = checkClosestOptionFraud(`${ex.explanation} ${ex.statement}`);
        if (!closest.ok) {
          return { ok: false, reason: `multiple_choice_integrity_failed: "${closest.matched}"` };
        }
      }

      // 4d) Racionalización matemática: el modelo calcula bien pero "negocia" con la
      //     respuesta — ajusta opciones, asume un error, back-solvea una constante.
      //     LA MATEMÁTICA MANDA: si no coincide exacto, es inválido → regenerar.
      //     Aplica a TODO tipo (no solo MC); la racionalización vive en la explicación.
      const rationalization = checkMathematicalRationalization(`${ex.explanation} ${ex.statement}`);
      if (!rationalization.ok) {
        return { ok: false, reason: `mathematical_rationalization_detected: "${rationalization.matched}"` };
      }

      // 5) Coherencia consigna ↔ respuesta + MATH > ANSWER KEY (la cuenta manda).
      const consistency = checkConsistency(ex.statement, ex.correct_answer, ex.explanation);
      if (!consistency.ok) {
        return { ok: false, reason: `math_consistency_failed: ${consistency.reason ?? "incoherencia consigna-respuesta"}` };
      }

      // 6) Sanity numérico SOLO de la explicación (sus cálculos deben ser correctos).
      //    NO escaneamos el statement: un true_false válido puede contener una
      //    afirmación falsa a propósito (ej. "Verdadero o falso: 2+2=5").
      const sanity = checkNumericSanity(ex.explanation);
      if (!sanity.ok) {
        return { ok: false, reason: sanity.reason ?? "numeric_sanity_failed" };
      }

      return { ok: true };
    };

    // checkAll = core + similitud (solo se exige en el primer intento, como best-effort).
    const checkAll = (ex: ParsedExercise): { ok: true } | { ok: false; reason: string } => {
      const core = checkCore(ex);
      if (!core.ok) return core;
      if (avoid.length) {
        const sim = mostSimilar(ex.statement, avoid);
        if (sim && sim.score >= SIMILARITY_THRESHOLD) {
          return {
            ok: false,
            reason: `enunciado muy parecido al previo (${Math.round(sim.score * 100)}% solapamiento)`,
          };
        }
      }
      return { ok: true };
    };

    const tGen = Date.now();
    let validation = checkAll(parsed);
    let effectiveDifficulty = difficulty;
    if (!validation.ok) {
      retried = true;
      // Si el rechazo es por scope y estamos en dificultad alta, bajamos un escalón en el retry:
      // a difficulty 5 el modelo tiende a salirse del tema. Degradar evita el dead-end.
      const isScopeFailure = validation.reason.toLowerCase().includes("fuera del tema");
      const retryDifficulty = isScopeFailure && difficulty >= 4 ? difficulty - 1 : difficulty;
      const retryDiffLabel =
        ["muy fácil", "fácil", "intermedio", "difícil", "muy difícil"][retryDifficulty - 1] ?? "intermedio";

      // Observabilidad: el reason ya viene con código (missing_expression,
      // numeric_sanity_failed, math_validation_failed, invalid_structure...).
      console.warn(
        `[generateExercise] retry_reason=${validation.reason}${retryDifficulty !== difficulty ? ` (baja a dif ${retryDifficulty})` : ""}`,
      );
      try {
        parsed = await generateOnce(topicName, retryDiffLabel, retryDifficulty, scope, avoid, validation.reason);
      } catch (e) {
        console.error("AI parse error (retry)", e);
        throw new Error("La IA devolvió un formato inválido. Probá de nuevo.");
      }
      // En el retry exigimos toda la validez matemática/estructural (checkCore),
      // pero NO la similitud (era best-effort). Mejor un ejercicio válido repetido
      // que dejar al alumno sin ejercicio.
      const coreRetry = checkCore(parsed);
      if (!coreRetry.ok) {
        console.error(`[generateExercise] FALLÓ tras retry · reason=${coreRetry.reason}`, parsed);
        throw new Error("No pudimos generar un ejercicio válido. Reintentá.");
      }
      effectiveDifficulty = retryDifficulty;
    }
    const tValidate = Date.now();
    console.log(
      `[generateExercise] TOTAL ${tValidate - t0}ms · gen=${tGen - t0}ms · validate=${tValidate - tGen}ms · retry=${retried} · tema=${topicName} diff=${effectiveDifficulty}`,
    );

    const { data: inserted, error } = await supabase
      .from("exercises")
      .insert({
        topic_id: topicId,
        statement: parsed.statement,
        type: parsed.type,
        options: parsed.options ?? null,
        correct_answer: parsed.correct_answer,
        explanation: parsed.explanation,
        hints: parsed.hints,
        difficulty: effectiveDifficulty,
        ai_generated: true,
        approved: true,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error("insert exercise", error);
      throw new Error("No se pudo guardar el ejercicio.");
    }

    void supabase.from("ai_generation_log").insert({
      user_id: userId,
      topic_id: topicId,
      difficulty: effectiveDifficulty,
      model: getAIConfig().model,
      status: "success",
      generated_exercise: JSON.parse(JSON.stringify(parsed)),
    });

    return {
      id: inserted.id as string,
      statement: parsed.statement,
      type: parsed.type,
      options: parsed.options ?? null,
      correct_answer: parsed.correct_answer,
      explanation: parsed.explanation,
      hints: parsed.hints,
      graph_expressions: parsed.graph_expressions ?? [],
      difficulty: effectiveDifficulty,
    };
  });
