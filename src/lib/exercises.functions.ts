import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAI, getAIConfig, FatalAIError } from "@/lib/ai/service";
import { answersEqual, normalizeTrueFalse } from "@/lib/answer-normalize";
import { getTopicScope, validateInScope, type TopicScope } from "@/lib/curriculum";
import {
  checkArtificialPatterns,
  checkStatementMutation,
  checkClosestOptionFraud,
  checkMathematicalRationalization,
} from "@/lib/ai/quality-checks";
import { mostSimilar } from "@/lib/ai/diversity";
import { persistentRateLimit } from "@/lib/ai/rate-limit";
import { checkConsistency } from "@/lib/ai/consistency";
import { sanitizeMathText } from "@/lib/ai/sanitize-text";
import { checkNumericSanity } from "@/lib/ai/numeric-sanity";
import { validateStructure } from "@/lib/ai/structural";
import {
  buildCanonicalOptions,
  checkCanonicalConsistency,
  solveCanonical,
  type CanonicalAnswer,
} from "@/lib/math";
import {
  assertWithinFreemiumLimit,
  finishAIGeneration,
  reserveAIGeneration,
} from "@/lib/billing/usage";
import { errorFields, log } from "@/lib/observability/log";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const SIMILARITY_THRESHOLD = 0.7;
const CURRENT_VALIDATION_VERSION = 8;

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
      return {
        ok: false,
        reason: `multiple_choice debe tener entre 2 y 5 opciones (tiene ${opts.length})`,
      };
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
      return {
        ok: false,
        reason: `answer_not_in_choices: correct_answer "${ex.correct_answer}" no aparece en las opciones`,
      };
    }
    if (matchCount > 1) {
      return {
        ok: false,
        reason: "multiple_choice_integrity_failed: correct_answer coincide con varias opciones",
      };
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
NOTACIÓN (CRÍTICO): en "statement", "explanation" y "hints" escribí la matemática en LaTeX entre $...$ (se renderiza con KaTeX): $\\frac{a}{b}$, $\\sqrt{x}$, $x^2$, $\\theta$, $\\sin(\\alpha)$, $30^\\circ$. Display $$...$$ para un resultado clave.
PERO "correct_answer" y cada "options" van en notación SIMPLE tipeable, SIN $ ni LaTeX (ej: -3/4, x^2, sqrt(2), pi, 30) para poder compararlas con lo que tipea el alumno.
En "explanation": cada igualdad encadenada completa en UN $...$ (no la partas), y en nombres usá palabras normales sin guion bajo ("cateto adyacente", no "cateto_adyacente").
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
    ? `\nNo repitas (ni variantes con otros números): ${avoid
        .slice(0, 3)
        .map((s) => `"${s}"`)
        .join("; ")}`
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
  // statement/explanation/hints conservan su LaTeX $...$ (se renderizan con KaTeX).
  // correct_answer y options deben ser tipeables/comparables → si la IA metió LaTeX,
  // lo bajamos a texto plano (ej: $\frac{3}{4}$ → (3)/(4)).
  parsed.correct_answer = sanitizeMathText(parsed.correct_answer);
  parsed.options = parsed.options?.map((o) => sanitizeMathText(o));
  // graph_expressions las consume el graficador (y=...), deben ir en texto plano.
  parsed.graph_expressions = parsed.graph_expressions.map((g) => sanitizeMathText(g));
  return parsed;
}

function combinedScopeText(ex: ParsedExercise): string {
  return [ex.statement, ex.explanation, ...(ex.options ?? []), ...ex.hints].join(" ");
}

function canonicalizeExercise(ex: ParsedExercise): {
  exercise: ParsedExercise;
  solver?: string;
  answer?: CanonicalAnswer;
} {
  const result = solveCanonical({
    statement: ex.statement,
    type: ex.type,
    options: ex.options ?? null,
    correct_answer: ex.correct_answer,
    explanation: ex.explanation,
  });
  if (!result.ok) return { exercise: ex };

  return {
    exercise: {
      ...ex,
      correct_answer: result.answer.typable,
      options:
        ex.type === "multiple_choice"
          ? buildCanonicalOptions(result.answer, ex.options)
          : ex.options,
    },
    solver: result.solver,
    answer: result.answer,
  };
}

function validateCanonicalSourceOfTruth(
  ex: ParsedExercise,
): { ok: true } | { ok: false; reason: string } {
  const result = solveCanonical({
    statement: ex.statement,
    type: ex.type,
    options: ex.options ?? null,
    correct_answer: ex.correct_answer,
    explanation: ex.explanation,
  });
  if (!result.ok) return { ok: true };

  const consistency = checkCanonicalConsistency(
    {
      statement: ex.statement,
      type: ex.type,
      options: ex.options ?? null,
      correct_answer: ex.correct_answer,
      explanation: ex.explanation,
    },
    result.answer,
  );
  if (consistency.ok) return { ok: true };
  return {
    ok: false,
    reason: `canonical_consistency_failed: ${result.solver}: ${consistency.issues
      .map((issue) => `${issue.code}: ${issue.message}`)
      .join("; ")}`,
  };
}

function sanitizeExerciseForValidation(exRaw: ParsedExercise): ParsedExercise {
  return {
    ...exRaw,
    statement: sanitizeMathText(exRaw.statement),
    explanation: sanitizeMathText(exRaw.explanation),
    hints: exRaw.hints.map((h) => sanitizeMathText(h)),
  };
}

function validateGeneratedExerciseCore(
  exRaw: ParsedExercise,
  scope: TopicScope,
  topicName: string,
): { ok: true } | { ok: false; reason: string } {
  const ex = sanitizeExerciseForValidation(exRaw);

  const structuralBasic = validateExercise(ex);
  if (!structuralBasic.ok) return structuralBasic;

  const structure = validateStructure(ex);
  if (!structure.ok) return structure;

  const combined = combinedScopeText(ex);

  const scopeRes = validateInScope(combined, scope);
  if (!scopeRes.inScope) {
    return {
      ok: false,
      reason: `invalid_structure: usó "${scopeRes.matched}" fuera del tema ${topicName}`,
    };
  }

  const artifact = checkArtificialPatterns(combined);
  if (!artifact.ok) {
    return {
      ok: false,
      reason: `math_validation_failed: narrativa artificial "${artifact.matched}"`,
    };
  }

  const mutation = checkStatementMutation(ex.explanation);
  if (!mutation.ok) {
    return { ok: false, reason: `statement_mutation_attempt: "${mutation.matched}"` };
  }

  if (ex.type === "multiple_choice") {
    const closest = checkClosestOptionFraud(`${ex.explanation} ${ex.statement}`);
    if (!closest.ok) {
      return { ok: false, reason: `multiple_choice_integrity_failed: "${closest.matched}"` };
    }
  }

  const rationalization = checkMathematicalRationalization(`${ex.explanation} ${ex.statement}`);
  if (!rationalization.ok) {
    return {
      ok: false,
      reason: `mathematical_rationalization_detected: "${rationalization.matched}"`,
    };
  }

  const consistency = checkConsistency(ex.statement, ex.correct_answer, ex.explanation);
  if (!consistency.ok) {
    return {
      ok: false,
      reason: `math_consistency_failed: ${consistency.reason ?? "incoherencia consigna-respuesta"}`,
    };
  }

  const canonical = validateCanonicalSourceOfTruth(ex);
  if (!canonical.ok) return canonical;

  const sanity = checkNumericSanity(ex.explanation);
  if (!sanity.ok) {
    return { ok: false, reason: sanity.reason ?? "numeric_sanity_failed" };
  }

  return { ok: true };
}

function shuffle<T>(items: T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

interface ServedExercise {
  id: string;
  statement: string;
  type: ParsedExercise["type"];
  options: string[] | null;
  correct_answer: string;
  explanation: string;
  hints: string[];
  graph_expressions: string[];
  difficulty: number;
}

/**
 * Banco de ejercicios: intenta servir uno YA generado del tema (dificultad cercana)
 * que el alumno no haya visto todavía, en vez de llamar a la IA. Ahorra cuota y es
 * instantáneo. Devuelve null si no hay candidato fresco → se genera con IA.
 */
async function tryBank(
  supabase: SupabaseClient<Database>,
  userId: string,
  topicId: string,
  topicName: string,
  difficulty: number,
  scope: TopicScope,
  avoid: string[],
): Promise<ServedExercise | null> {
  const { data: candidates } = await supabase
    .from("exercises")
    .select(
      "id, statement, type, options, correct_answer, explanation, hints, difficulty, validation_version",
    )
    .eq("topic_id", topicId)
    .eq("approved", true)
    .gte("difficulty", Math.max(1, difficulty - 1))
    .lte("difficulty", Math.min(5, difficulty + 1))
    .limit(80);
  if (!candidates || candidates.length === 0) return null;

  const { data: seen } = await supabase
    .from("exercise_attempts")
    .select("exercise_id")
    .eq("user_id", userId)
    .not("exercise_id", "is", null)
    .limit(1000);
  const seenIds = new Set((seen ?? []).map((s) => s.exercise_id));
  const norm = (s: string) => s.trim().toLowerCase();
  const avoidSet = new Set(avoid.map(norm));

  const fresh = candidates.filter(
    (c) => !seenIds.has(c.id) && !avoidSet.has(norm(c.statement as string)),
  );
  if (fresh.length === 0) return null;

  for (const pick of shuffle(fresh)) {
    const served = {
      id: pick.id as string,
      statement: pick.statement as string,
      type: pick.type as ParsedExercise["type"],
      options: (pick.options as string[] | null) ?? null,
      correct_answer: pick.correct_answer as string,
      explanation: (pick.explanation as string | null) ?? "",
      hints: (pick.hints as string[] | null) ?? [],
      graph_expressions: [],
      difficulty: (pick.difficulty as number) ?? difficulty,
    };

    const version = (pick.validation_version as number | null) ?? 0;
    if (version >= CURRENT_VALIDATION_VERSION) return served;

    const parsed = ExerciseSchema.safeParse({
      statement: served.statement,
      type: served.type,
      options: served.options ?? undefined,
      correct_answer: served.correct_answer,
      explanation: served.explanation,
      hints: served.hints,
      graph_expressions: [],
    });
    const validation = parsed.success
      ? validateGeneratedExerciseCore(parsed.data, scope, topicName)
      : ({ ok: false, reason: parsed.error.issues[0]?.message ?? "invalid_schema" } as const);

    if (validation.ok) {
      const { error } = await supabase
        .from("exercises")
        .update({ validation_version: CURRENT_VALIDATION_VERSION })
        .eq("id", served.id);
      if (error) {
        log.warn("exercise_bank_validation_version_update_failed", {
          exerciseId: served.id,
          error: error.message,
        });
      }
      return served;
    }

    const { error } = await supabase
      .from("exercises")
      .update({ approved: false, validation_version: 0 })
      .eq("id", served.id);
    log.warn("exercise_bank_rejected_corrupt_exercise", {
      exerciseId: served.id,
      reason: validation.reason,
      updateError: error?.message,
    });
  }

  return null;
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
    const rl = await persistentRateLimit(supabase, userId, "generate", 15);
    if (!rl.ok) {
      throw new Error(`Estás generando muy seguido. Probá en ${rl.retryInSec}s.`);
    }

    const scope = getTopicScope(topicName);

    // Banco de ejercicios: si hay uno ya generado y sin ver, lo revalidamos si hace falta
    // antes de servirlo. Esto evita reciclar contenido viejo con answer key corrupta.
    const banked = await tryBank(supabase, userId, topicId, topicName, difficulty, scope, avoid);
    if (banked) {
      log.info("adaptive_exercise_bank_hit", { topicName, difficulty });
      return banked;
    }

    const diffLabel =
      ["muy fácil", "fácil", "intermedio", "difícil", "muy difícil"][difficulty - 1] ??
      "intermedio";

    const t0 = Date.now();
    let retried = false;
    let generationLogId: string | null = null;

    await assertWithinFreemiumLimit(supabase, userId, "adaptive_generation");
    generationLogId = await reserveAIGeneration(supabase, {
      userId,
      topicId,
      difficulty,
      model: getAIConfig().model,
      metadata: { topicName, kind: "adaptive" },
    });

    let parsed: ParsedExercise;
    try {
      parsed = await generateOnce(topicName, diffLabel, difficulty, scope, avoid);
    } catch (e) {
      await finishAIGeneration(supabase, generationLogId, {
        status: "error",
        errorMessage: e instanceof Error ? e.message : "generation_failed",
      });
      // Errores de credenciales/config no se arreglan reintentando: propagamos el mensaje real.
      if (e instanceof FatalAIError) throw e;
      // Parse/schema falló en el primer intento — reintentamos UNA vez con instrucción explícita
      log.warn("adaptive_exercise_parse_failed_retrying", {
        ...errorFields(e),
        topicName,
        difficulty,
      });
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
        await finishAIGeneration(supabase, generationLogId, {
          status: "error",
          errorMessage: e2 instanceof Error ? e2.message : "generation_retry_failed",
        });
        if (e2 instanceof FatalAIError) throw e2;
        log.error("adaptive_exercise_parse_failed_after_retry", {
          ...errorFields(e2),
          topicName,
          difficulty,
        });
        throw new Error("La IA devolvió un formato inválido. Probá de nuevo.");
      }
    }

    const canonicalized = canonicalizeExercise(parsed);
    parsed = canonicalized.exercise;
    if (canonicalized.solver) {
      log.info("adaptive_exercise_canonicalized", {
        solver: canonicalized.solver,
        canonical: canonicalized.answer?.canonical,
        topicName,
        difficulty,
      });
    }

    const checkCore = (exRaw: ParsedExercise): { ok: true } | { ok: false; reason: string } => {
      // Los validadores son heurísticos sobre texto plano; el statement/explanation/hints
      // ahora traen LaTeX $...$ (para KaTeX). Validamos sobre una copia saneada a texto
      // plano, sin tocar el objeto que se muestra.
      const ex: ParsedExercise = {
        ...exRaw,
        statement: sanitizeMathText(exRaw.statement),
        explanation: sanitizeMathText(exRaw.explanation),
        hints: exRaw.hints.map((h) => sanitizeMathText(h)),
      };
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
        return {
          ok: false,
          reason: `invalid_structure: usó "${scopeRes.matched}" fuera del tema ${topicName}`,
        };
      }

      // 4) Narrativa artificial / correcciones ficticias
      const artifact = checkArtificialPatterns(combined);
      if (!artifact.ok) {
        return {
          ok: false,
          reason: `math_validation_failed: narrativa artificial "${artifact.matched}"`,
        };
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
        return {
          ok: false,
          reason: `mathematical_rationalization_detected: "${rationalization.matched}"`,
        };
      }

      // 5) Coherencia consigna ↔ respuesta + MATH > ANSWER KEY (la cuenta manda).
      const consistency = checkConsistency(ex.statement, ex.correct_answer, ex.explanation);
      if (!consistency.ok) {
        return {
          ok: false,
          reason: `math_consistency_failed: ${consistency.reason ?? "incoherencia consigna-respuesta"}`,
        };
      }

      const canonical = validateCanonicalSourceOfTruth(ex);
      if (!canonical.ok) return canonical;

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
    const validation = checkAll(parsed);
    let effectiveDifficulty = difficulty;
    if (!validation.ok) {
      retried = true;
      // Si el rechazo es por scope y estamos en dificultad alta, bajamos un escalón en el retry:
      // a difficulty 5 el modelo tiende a salirse del tema. Degradar evita el dead-end.
      const isScopeFailure = validation.reason.toLowerCase().includes("fuera del tema");
      const retryDifficulty = isScopeFailure && difficulty >= 4 ? difficulty - 1 : difficulty;
      const retryDiffLabel =
        ["muy fácil", "fácil", "intermedio", "difícil", "muy difícil"][retryDifficulty - 1] ??
        "intermedio";

      // Observabilidad: el reason ya viene con código (missing_expression,
      // numeric_sanity_failed, math_validation_failed, invalid_structure...).
      log.warn("adaptive_exercise_validation_failed_retrying", {
        reason: validation.reason,
        topicName,
        difficulty,
        retryDifficulty,
      });
      try {
        parsed = await generateOnce(
          topicName,
          retryDiffLabel,
          retryDifficulty,
          scope,
          avoid,
          validation.reason,
        );
      } catch (e) {
        await finishAIGeneration(supabase, generationLogId, {
          status: "error",
          errorMessage: e instanceof Error ? e.message : "validation_retry_failed",
        });
        if (e instanceof FatalAIError) throw e;
        log.error("adaptive_exercise_validation_retry_parse_failed", {
          ...errorFields(e),
          topicName,
          difficulty,
          retryDifficulty,
        });
        throw new Error("La IA devolvió un formato inválido. Probá de nuevo.");
      }
      // En el retry exigimos toda la validez matemática/estructural (checkCore),
      // pero NO la similitud (era best-effort). Mejor un ejercicio válido repetido
      // que dejar al alumno sin ejercicio.
      const retryCanonicalized = canonicalizeExercise(parsed);
      parsed = retryCanonicalized.exercise;
      if (retryCanonicalized.solver) {
        log.info("adaptive_exercise_canonicalized", {
          solver: retryCanonicalized.solver,
          canonical: retryCanonicalized.answer?.canonical,
          topicName,
          difficulty: retryDifficulty,
        });
      }
      const coreRetry = checkCore(parsed);
      if (!coreRetry.ok) {
        await finishAIGeneration(supabase, generationLogId, {
          status: "error",
          generatedExercise: parsed,
          errorMessage: coreRetry.reason,
        });
        log.error("adaptive_exercise_core_failed_after_retry", {
          reason: coreRetry.reason,
          topicName,
          difficulty,
          retryDifficulty,
          parsed,
        });
        throw new Error("No pudimos generar un ejercicio válido. Reintentá.");
      }
      effectiveDifficulty = retryDifficulty;
    }
    const tValidate = Date.now();
    log.info("adaptive_exercise_generated", {
      totalMs: tValidate - t0,
      generationMs: tGen - t0,
      validationMs: tValidate - tGen,
      retried,
      topicName,
      difficulty: effectiveDifficulty,
    });

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
        validation_version: CURRENT_VALIDATION_VERSION,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      await finishAIGeneration(supabase, generationLogId, {
        status: "error",
        generatedExercise: parsed,
        errorMessage: error.message,
      });
      log.error("adaptive_exercise_insert_failed", {
        error: error.message,
        topicId,
        topicName,
        difficulty: effectiveDifficulty,
      });
      throw new Error("No se pudo guardar el ejercicio.");
    }

    void finishAIGeneration(supabase, generationLogId, {
      status: "success",
      generatedExercise: parsed,
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
