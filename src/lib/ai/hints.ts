import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAI } from "./service";
import { rateLimit } from "./rate-limit";
import { buildHintPrompt } from "./prompts";
import type { HintResult } from "./types";

const HintSchema = z.object({
  pista: z.string().min(1),
});

export const giveHint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { tema: string; enunciado: string; intento?: string }) => input,
  )
  .handler(async ({ data, context }) => {
    const { tema, enunciado, intento } = data;

    const rl = rateLimit(context.userId, "hint", 30);
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
      return HintSchema.parse(raw);
    } catch (e) {
      console.error("[giveHint] validation error", e, raw);
      throw new Error("La IA devolvió un formato inválido. Probá de nuevo.");
    }
  });
