import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAI } from "./service";
import { rateLimit } from "./rate-limit";
import { buildEvaluateAnswerPrompt } from "./prompts";
import type { EvaluationResult } from "./types";

const EvaluationSchema = z.object({
  estado: z.enum(["correcta", "incorrecta", "parcial"]),
  feedback: z.string().min(1),
  explicacion: z.string().min(1),
});

export const evaluateAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { tema: string; enunciado: string; respuesta: string }) => input,
  )
  .handler(async ({ data, context }) => {
    const { tema, enunciado, respuesta } = data;
    if (!respuesta.trim()) {
      throw new Error("Escribí una respuesta antes de enviar.");
    }

    const rl = rateLimit(context.userId, "evaluate", 40);
    if (!rl.ok) {
      throw new Error(`Estás evaluando muy seguido. Probá en ${rl.retryInSec}s.`);
    }

    const { systemPrompt, userPrompt } = buildEvaluateAnswerPrompt(
      tema,
      enunciado,
      respuesta,
    );

    const raw = await callAI<EvaluationResult>({
      systemPrompt,
      userPrompt,
      label: "evaluateAnswer",
    });

    try {
      // feedback/explicacion conservan su LaTeX $...$ (se renderizan con KaTeX).
      return EvaluationSchema.parse(raw);
    } catch (e) {
      console.error("[evaluateAnswer] validation error", e, raw);
      throw new Error("La IA devolvió un formato inválido. Probá de nuevo.");
    }
  });
