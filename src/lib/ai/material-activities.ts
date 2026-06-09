import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAI, getAIConfig } from "./service";
import { buildMaterialActivitiesPrompt } from "./prompts";
import { sanitizeMathText } from "./sanitize-text";
import { checkArtificialPatterns, checkStatementMutation } from "./quality-checks";
import { checkRequiredExpression } from "./structural";
import { validateDiversity } from "./diversity";
import { assertWithinFreemiumLimit } from "@/lib/billing/usage";
import { rateLimit } from "./rate-limit";
import { classifyMaterial } from "@/lib/materials/classify";
import type { GeneratedActivities, DifficultyLevel } from "./types";

const ActivitySchema = z.object({
  titulo: z.string().min(1),
  enunciado: z.string().min(5),
});
const ResultSchema = z.object({
  tema: z.string().min(1),
  nivel: z.enum(["básico", "intermedio", "alto"]),
  actividades: z.array(ActivitySchema).min(2).max(5),
});
type Parsed = z.infer<typeof ResultSchema>;

const NIVEL_TO_DIFFICULTY: Record<DifficultyLevel, number> = {
  básico: 1, intermedio: 3, alto: 5,
};

/**
 * Validación de la tanda generada desde material. Igual que la de tandas comunes
 * PERO sin scope curricular (el material define su propio alcance).
 */
function validateMaterialBatch(parsed: Parsed) {
  for (const act of parsed.actividades) {
    const combined = `${act.titulo} ${act.enunciado}`;
    const artifact = checkArtificialPatterns(combined);
    if (!artifact.ok) return { ok: false as const, reason: `patrón artificial "${artifact.matched}"` };
    const mutation = checkStatementMutation(combined);
    if (!mutation.ok) return { ok: false as const, reason: `statement_mutation_attempt "${mutation.matched}"` };
    const expr = checkRequiredExpression(act.enunciado);
    if (!expr.ok) return { ok: false as const, reason: expr.reason };
  }
  const div = validateDiversity(parsed.actividades);
  if (!div.ok) return { ok: false as const, reason: div.reason };
  return { ok: true as const };
}

async function generateOnce(
  materialText: string,
  topicHint: string,
  nivel: DifficultyLevel,
  retryReason?: string,
): Promise<Parsed> {
  const { systemPrompt, userPrompt } = buildMaterialActivitiesPrompt(materialText, topicHint, nivel, retryReason);
  const raw = await callAI<GeneratedActivities>({
    systemPrompt,
    userPrompt,
    label: retryReason ? "generateFromMaterial:retry" : "generateFromMaterial",
  });
  const parsed = ResultSchema.parse(raw);
  // Limpiar LaTeX que el modelo a veces emite (ej. $\alpha$ → α) antes de validar.
  parsed.actividades = parsed.actividades.map((a) => ({
    titulo: sanitizeMathText(a.titulo),
    enunciado: sanitizeMathText(a.enunciado),
  }));
  return parsed;
}

export const generateFromMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { materialId: string; nivel: DifficultyLevel }) => input)
  .handler(async ({ data, context }): Promise<Parsed> => {
    const { materialId, nivel } = data;
    const { userId, supabase } = context;

    // Material-based cuenta como una tanda IA en el modelo freemium.
    await assertWithinFreemiumLimit(supabase, userId, "tanda");

    const rl = rateLimit(userId, "generate", 15);
    if (!rl.ok) throw new Error(`Estás generando muy seguido. Probá en ${rl.retryInSec}s.`);

    const { data: material } = await supabase
      .from("materials")
      .select("extracted_text, detected_topic, file_name, status")
      .eq("id", materialId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!material) throw new Error("Material no encontrado.");
    const text = material.extracted_text?.trim();
    if (!text || text.length < 40) {
      throw new Error("Este material no tiene suficiente texto para generar ejercicios.");
    }
    // Guardrail: solo generamos desde contenido que parezca matemático.
    const classification = classifyMaterial(text);
    if (!classification.isMath) {
      console.log(`[generateFromMaterial] rechazado: no es contenido matemático (score ${classification.mathScore})`);
      throw new Error("Este material no parece contener matemática. Subí una guía o ejercicios de matemática.");
    }
    const topicHint = material.detected_topic ?? "";

    let parsed: Parsed;
    try {
      parsed = await generateOnce(text, topicHint, nivel);
    } catch (e) {
      console.warn("[generateFromMaterial] parse error, retrying", e);
      parsed = await generateOnce(text, topicHint, nivel, "JSON inválido o campos faltantes — devolvé el objeto exacto del schema").catch(() => {
        throw new Error("La IA devolvió un formato inválido. Probá de nuevo.");
      });
    }

    let check = validateMaterialBatch(parsed);
    if (!check.ok) {
      console.warn("[generateFromMaterial] validación falló, reintentando:", check.reason);
      parsed = await generateOnce(text, topicHint, nivel, check.reason);
      check = validateMaterialBatch(parsed);
      if (!check.ok) {
        console.error("[generateFromMaterial] falló tras retry:", check.reason);
        throw new Error("No pudimos generar ejercicios válidos del material. Reintentá.");
      }
    }

    void supabase.from("ai_generation_log").insert({
      user_id: userId,
      topic_id: null,
      difficulty: NIVEL_TO_DIFFICULTY[nivel],
      model: getAIConfig().model,
      status: "success",
      generated_exercise: { material_id: materialId, count: parsed.actividades.length },
    });

    return parsed;
  });
