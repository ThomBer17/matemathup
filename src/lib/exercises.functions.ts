import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAI, getAIConfig } from "@/lib/ai/service";
import { answersEqual, normalizeTrueFalse } from "@/lib/answer-normalize";
import { getTopicScope, validateInScope, type TopicScope } from "@/lib/curriculum";
import { checkArtificialPatterns } from "@/lib/ai/quality-checks";
import { mostSimilar } from "@/lib/ai/diversity";
import { rateLimit } from "@/lib/ai/rate-limit";
import { checkConsistency } from "@/lib/ai/consistency";

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
      return { ok: false, reason: `correct_answer "${ex.correct_answer}" no coincide con ninguna opción` };
    }
    if (matchCount > 1) {
      return { ok: false, reason: "correct_answer coincide con varias opciones" };
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

const BASE_SYSTEM_PROMPT = `Profesor de matemática para secundaria argentina (5°-6°). Generás UN ejercicio en JSON. Notación: x^2, sqrt(), pi. Sin LaTeX.
Reglas: multiple_choice → 4 opciones distintas, correct_answer coincide EXACTO con una opción. true_false → correct_answer es "Verdadero" o "Falso".
DIFICULTAD = profundidad DENTRO del tema, NUNCA cambiar de tema ni saltar a temas avanzados fuera del programa.

CONSISTENCIA MATEMÁTICA OBLIGATORIA:
- correct_answer DEBE ser EXACTAMENTE el resultado al que llega el razonamiento de "explanation".
- Si el cálculo concluye X, entonces correct_answer = X. Sin invertir, sin reinterpretar, sin "twist".
- En multiple_choice: la opción marcada como correcta es la que el cálculo produce, no "la que parece más razonable según la redacción".

PROHIBIDO EN explanation (la frase descalifica el ejercicio):
- "según la redacción", "según el enunciado, la respuesta es...", "según la pregunta"
- "reinterpretando", "interpretando que la respuesta sería..."
- "la respuesta buscada es", "la respuesta correcta sería" (cuando difiere del cálculo)
- "pero en realidad la respuesta es", "en realidad la respuesta sería"
- "invirtiendo el resultado/valor/cociente"
- "error intencional", correcciones ficticias

La explicación es lineal: consigna → pasos → resultado. Sin giros narrativos, sin justificación post-hoc de una respuesta distinta a la calculada.

AUTO-VERIFICACIÓN ANTES DE RESPONDER:
- Resolvé el ejercicio mentalmente y confirmá que el resultado cumple TODAS las restricciones de la consigna.
- Si la consigna pide que el resultado esté en un intervalo, conjunto o cumpla una condición → verificá que efectivamente la cumpla. Si NO la cumple, cambiá los números del enunciado para que sí.
- Nunca generes una consigna cuyo resultado correcto haga imposible cumplir lo que la propia consigna pide.`;

function buildUserPrompt(
  topicName: string,
  diffLabel: string,
  difficulty: number,
  scope: TopicScope,
  avoid: string[],
  retryReason?: string,
) {
  const retryNote = retryReason ? `\nIntento anterior falló: ${retryReason}. Corregilo manteniéndote DENTRO del tema.` : "";
  const avoidBlock = avoid.length
    ? `\nENUNCIADOS YA VISTOS (no repetir ni hacer variantes mínimas con números distintos):\n${avoid.map((s) => `- "${s}"`).join("\n")}`
    : "";

  return `Ejercicio de "${topicName}" dificultad ${diffLabel} (${difficulty}/5).
Scope: ${scope.description}
Conceptos permitidos: ${scope.concepts.join("; ")}.
NO usar: ${scope.outOfScopeKeywords.join(", ")}.${avoidBlock}
JSON: {"statement","type":"multiple_choice"|"true_false"|"open","options":["..."],"correct_answer","explanation","hints":["pista 1","pista 2"],"graph_expressions":["y=..."]}
- explanation: máx 4 pasos breves
- hints: 1 oración cada una, la primera sutil
- graph_expressions: 1-2 si hay función graficable, sino []
Variá el tipo Y el contexto DENTRO del tema.${retryNote}`;
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
  });
  return ExerciseSchema.parse(raw);
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
    const { userId } = context;

    const rl = rateLimit(userId, "generate", 15);
    if (!rl.ok) {
      throw new Error(`Estás generando muy seguido. Probá en ${rl.retryInSec}s.`);
    }

    const diffLabel =
      ["muy fácil", "fácil", "intermedio", "difícil", "muy difícil"][difficulty - 1] ?? "intermedio";

    const scope = getTopicScope(topicName);

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
      const structural = validateExercise(ex);
      if (!structural.ok) return structural;
      const combined = combinedScopeText(ex);
      const scopeRes = validateInScope(combined, scope);
      if (!scopeRes.inScope) {
        return { ok: false, reason: `usó "${scopeRes.matched}" fuera del tema ${topicName}` };
      }
      const artifact = checkArtificialPatterns(combined);
      if (!artifact.ok) {
        return { ok: false, reason: `narrativa artificial: "${artifact.matched}"` };
      }
      const consistency = checkConsistency(ex.statement, ex.correct_answer);
      if (!consistency.ok) {
        return { ok: false, reason: consistency.reason ?? "incoherencia consigna-respuesta" };
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

    let validation = checkAll(parsed);
    let effectiveDifficulty = difficulty;
    if (!validation.ok) {
      // Si el rechazo es por scope y estamos en dificultad alta, bajamos un escalón en el retry:
      // a difficulty 5 el modelo tiende a salirse del tema. Degradar evita el dead-end.
      const isScopeFailure = validation.reason.toLowerCase().includes("fuera del tema");
      const retryDifficulty = isScopeFailure && difficulty >= 4 ? difficulty - 1 : difficulty;
      const retryDiffLabel =
        ["muy fácil", "fácil", "intermedio", "difícil", "muy difícil"][retryDifficulty - 1] ?? "intermedio";

      console.warn(
        `[generateExercise] validación falló, reintentando${retryDifficulty !== difficulty ? ` con dificultad ${retryDifficulty}` : ""}:`,
        validation.reason,
      );
      try {
        parsed = await generateOnce(topicName, retryDiffLabel, retryDifficulty, scope, avoid, validation.reason);
      } catch (e) {
        console.error("AI parse error (retry)", e);
        throw new Error("La IA devolvió un formato inválido. Probá de nuevo.");
      }
      // En el retry solo exigimos consistencia estructural/scope/narrativa.
      // La similitud era best-effort en el primer intento — si el modelo no logró diversificar
      // pero el ejercicio es válido, lo aceptamos en vez de dejar al user sin ejercicio.
      const coreRetry = checkCore(parsed);
      if (!coreRetry.ok) {
        console.error("[generateExercise] core check falló tras retry:", coreRetry.reason, parsed);
        throw new Error("No pudimos generar un ejercicio consistente y en tema. Probá de nuevo.");
      }
      effectiveDifficulty = retryDifficulty;
    }

    const { supabase } = context;
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
