import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAI, getAIConfig, FatalAIError } from "./service";
import { buildGenerateActivitiesPrompt } from "./prompts";
import { sanitizeMathText } from "./sanitize-text";
import { getTopicScope, validateInScope } from "@/lib/curriculum";
import { checkArtificialPatterns, checkStatementMutation } from "./quality-checks";
import { checkRequiredExpression } from "./structural";
import { validateDiversity, mostSimilar } from "./diversity";
import { persistentRateLimit } from "./rate-limit";
import {
  assertWithinFreemiumLimit,
  finishAIGeneration,
  reserveAIGeneration,
} from "@/lib/billing/usage";
import { errorFields, log } from "@/lib/observability/log";
import type { GeneratedActivities, DifficultyLevel } from "./types";

const SIMILARITY_THRESHOLD = 0.7;

const ActivitySchema = z.object({
  titulo: z.string().min(1),
  enunciado: z.string().min(5),
});

const GeneratedActivitiesSchema = z.object({
  tema: z.string().min(1),
  nivel: z.enum(["básico", "intermedio", "alto"]),
  actividades: z.array(ActivitySchema).min(3).max(5),
});

type Parsed = z.infer<typeof GeneratedActivitiesSchema>;

const NIVEL_TO_DIFFICULTY: Record<DifficultyLevel, number> = {
  básico: 1,
  intermedio: 3,
  alto: 5,
};

const CACHE_TTL_MS = 2 * 60 * 1000;
const cache = new Map<string, { data: GeneratedActivities; ts: number }>();

function cacheKey(tema: string, nivel: DifficultyLevel) {
  return `${tema.trim().toLowerCase()}::${nivel}`;
}

function validateCore(parsed: Parsed, scope: ReturnType<typeof getTopicScope>) {
  for (const actRaw of parsed.actividades) {
    // El enunciado trae LaTeX $...$ (para KaTeX); los validadores son heurísticos
    // sobre texto plano, así que validamos una copia saneada.
    const act = {
      titulo: sanitizeMathText(actRaw.titulo),
      enunciado: sanitizeMathText(actRaw.enunciado),
    };
    const combined = `${act.titulo} ${act.enunciado}`;
    const scopeRes = validateInScope(combined, scope);
    if (!scopeRes.inScope) {
      return { ok: false as const, reason: `usó "${scopeRes.matched}" fuera del tema` };
    }
    const artifact = checkArtificialPatterns(combined);
    if (!artifact.ok) {
      return { ok: false as const, reason: `patrón artificial "${artifact.matched}"` };
    }
    const mutation = checkStatementMutation(combined);
    if (!mutation.ok) {
      return { ok: false as const, reason: `statement_mutation_attempt "${mutation.matched}"` };
    }
    // Objeto matemático requerido: "Factorizá..." sin polinomio = irresoluble.
    const expr = checkRequiredExpression(act.enunciado);
    if (!expr.ok) {
      return { ok: false as const, reason: expr.reason };
    }
  }
  const div = validateDiversity(parsed.actividades);
  if (!div.ok) return { ok: false as const, reason: div.reason };
  return { ok: true as const };
}

function validateBatch(parsed: Parsed, scope: ReturnType<typeof getTopicScope>, avoid: string[]) {
  const core = validateCore(parsed, scope);
  if (!core.ok) return core;
  if (avoid.length) {
    for (const act of parsed.actividades) {
      const sim = mostSimilar(act.enunciado, avoid);
      if (sim && sim.score >= SIMILARITY_THRESHOLD) {
        return {
          ok: false as const,
          reason: `enunciado muy parecido al previo (${Math.round(sim.score * 100)}% solapamiento)`,
        };
      }
    }
  }
  return { ok: true as const };
}

async function generateOnce(
  tema: string,
  nivel: DifficultyLevel,
  scope: ReturnType<typeof getTopicScope>,
  avoid: string[],
  retryReason?: string,
): Promise<Parsed> {
  const { systemPrompt, userPrompt } = buildGenerateActivitiesPrompt(
    tema,
    nivel,
    scope,
    avoid,
    retryReason,
  );
  const raw = await callAI<GeneratedActivities>({
    systemPrompt,
    userPrompt,
    label: retryReason ? "generateActivities:retry" : "generateActivities",
  });
  // titulo/enunciado conservan su LaTeX $...$ (se renderizan con KaTeX en la UI).
  return GeneratedActivitiesSchema.parse(raw);
}

export const generateActivities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tema: string; nivel: DifficultyLevel; force?: boolean }) => input)
  .handler(async ({ data, context }) => {
    const { tema, nivel, force } = data;
    const { userId, supabase } = context;
    const key = cacheKey(tema, nivel);

    const cached = cache.get(key);
    const cacheFresh = cached && Date.now() - cached.ts < CACHE_TTL_MS;

    // Cache hit: re-lectura de una tanda ya contada → no consume cuota.
    if (!force && cacheFresh) {
      return cached.data;
    }

    // Freemium: bloquea si ya generó su cuota diaria de tandas IA.
    await assertWithinFreemiumLimit(supabase, userId, "tanda");

    // Rate limit: 15 generaciones por minuto por user (es la operación más cara)
    const rl = await persistentRateLimit(supabase, userId, "generate", 15);
    if (!rl.ok) {
      throw new Error(`Estás generando muy seguido. Probá en ${rl.retryInSec}s.`);
    }

    // Cuando regenerás con force, la tanda cacheada se usa como "no repitas estos enunciados".
    const avoid = force && cached ? cached.data.actividades.map((a) => a.enunciado) : [];

    const scope = getTopicScope(tema);
    const generationLogId = await reserveAIGeneration(supabase, {
      userId,
      topicId: null,
      difficulty: NIVEL_TO_DIFFICULTY[nivel],
      model: getAIConfig().model,
      metadata: { tema, nivel, kind: "tanda" },
    });

    let parsed: Parsed;
    try {
      parsed = await generateOnce(tema, nivel, scope, avoid);
    } catch (e) {
      await finishAIGeneration(supabase, generationLogId, {
        status: "error",
        errorMessage: e instanceof Error ? e.message : "generate_activities_failed",
      });
      if (e instanceof FatalAIError) throw e; // cuota/credenciales: mensaje real
      log.warn("activities_parse_failed_retrying", { ...errorFields(e), tema, nivel });
      try {
        parsed = await generateOnce(
          tema,
          nivel,
          scope,
          avoid,
          "JSON inválido o campos faltantes — devolvé el objeto exacto del schema",
        );
      } catch (e2) {
        await finishAIGeneration(supabase, generationLogId, {
          status: "error",
          errorMessage: e2 instanceof Error ? e2.message : "generate_activities_retry_failed",
        });
        if (e2 instanceof FatalAIError) throw e2;
        log.error("activities_parse_failed_after_retry", { ...errorFields(e2), tema, nivel });
        throw new Error("La IA devolvió un formato inválido. Probá de nuevo.");
      }
    }

    const check = validateBatch(parsed, scope, avoid);
    if (!check.ok) {
      log.warn("activities_validation_failed_retrying", { reason: check.reason, tema, nivel });
      try {
        parsed = await generateOnce(tema, nivel, scope, avoid, check.reason);
      } catch (e) {
        await finishAIGeneration(supabase, generationLogId, {
          status: "error",
          errorMessage: e instanceof Error ? e.message : "generate_activities_validation_failed",
        });
        if (e instanceof FatalAIError) throw e;
        log.error("activities_validation_retry_parse_failed", { ...errorFields(e), tema, nivel });
        throw new Error("La IA devolvió un formato inválido. Probá de nuevo.");
      }
      // En el retry, la similitud es best-effort: solo exigimos consistencia core.
      const coreRetry = validateCore(parsed, scope);
      if (!coreRetry.ok) {
        await finishAIGeneration(supabase, generationLogId, {
          status: "error",
          generatedExercise: parsed,
          errorMessage: coreRetry.reason,
        });
        log.error("activities_core_failed_after_retry", { reason: coreRetry.reason, tema, nivel });
        throw new Error("La IA generó una tanda inconsistente. Probá de nuevo.");
      }
    }

    cache.set(key, { data: parsed, ts: Date.now() });

    void finishAIGeneration(supabase, generationLogId, {
      status: "success",
      generatedExercise: { tema, nivel, count: parsed.actividades.length },
    });

    return parsed;
  });
