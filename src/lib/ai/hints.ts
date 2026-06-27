import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAI } from "./service";
import { persistentRateLimit } from "./rate-limit";
import { buildHintPrompt } from "./prompts";
import { errorFields, log } from "@/lib/observability/log";
import type { HintResult } from "./types";

const HintSchema = z.object({
  pista: z.string().min(1),
});

export const giveHint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tema: string; enunciado: string; intento?: string }) => input)
  .handler(async ({ data, context }) => {
    const { tema, enunciado, intento } = data;

    const rl = await persistentRateLimit(context.supabase, context.userId, "hint", 30);
    if (!rl.ok) {
      throw new Error(`Estás pidiendo pistas muy seguido. Probá en ${rl.retryInSec}s.`);
    }

    const { systemPrompt, userPrompt } = buildHintPrompt(tema, enunciado, intento);

    const raw = await callAI<HintResult>({
      systemPrompt,
      userPrompt,
      label: "giveHint",
    });

    try {
      // pista conserva su LaTeX $...$ (se renderiza con KaTeX).
      return HintSchema.parse(raw);
    } catch (e) {
      log.error("hint_validation_failed", { ...errorFields(e), raw });
      throw new Error("La IA devolvió un formato inválido. Probá de nuevo.");
    }
  });
