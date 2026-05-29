const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-120b:free";

/** Reintentos internos ante respuestas no parseables o errores transitorios. */
const MAX_ATTEMPTS = 3;

export interface AIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export function getAIConfig(): AIConfig {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Falta AI_API_KEY en el entorno. Configurala en .env (ver .env.example).",
    );
  }
  return {
    apiKey,
    baseUrl: process.env.AI_BASE_URL ?? DEFAULT_BASE_URL,
    model: process.env.AI_MODEL ?? DEFAULT_MODEL,
  };
}

export interface AICallOptions {
  systemPrompt: string;
  userPrompt: string;
  /** Etiqueta opcional para logs de timing (ej. "generateExercise", "evaluateAnswer"). */
  label?: string;
}

export async function callAI<T>(options: AICallOptions): Promise<T> {
  const { apiKey, baseUrl, model } = getAIConfig();
  const tag = options.label ?? "callAI";
  const inputTokensEst = Math.round((options.systemPrompt.length + options.userPrompt.length) / 4);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const start = Date.now();
    try {
      const res = await fetch(baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: options.systemPrompt },
            // En reintentos, recordamos que la respuesta debe ser SOLO JSON.
            {
              role: "user",
              content:
                attempt === 1
                  ? options.userPrompt
                  : `${options.userPrompt}\n\nIMPORTANTE: respondé ÚNICAMENTE con el objeto JSON, sin texto adicional, sin markdown, sin explicaciones.`,
            },
          ],
          response_format: { type: "json_object" },
        }),
      });

      // Errores no recuperables: cortamos de inmediato.
      if (res.status === 401) throw new FatalAIError("Credenciales de IA inválidas. Revisá AI_API_KEY.");
      if (res.status === 402) throw new FatalAIError("Sin créditos de IA disponibles.");

      if (!res.ok) {
        // 429 y 5xx son transitorios → reintentamos con backoff.
        lastError = new Error(
          res.status === 429 ? "Límite de uso alcanzado." : `Error de IA (${res.status})`,
        );
        await backoff(attempt);
        continue;
      }

      const json = await res.json();
      const content = json.choices?.[0]?.message?.content ?? "";
      const elapsed = Date.now() - start;
      console.log(
        `[AI:${tag}] attempt ${attempt}/${MAX_ATTEMPTS} · ${elapsed}ms · model=${model} · in≈${inputTokensEst}tok · out=${content.length}ch`,
      );

      try {
        return JSON.parse(extractJson(content)) as T;
      } catch {
        lastError = new Error("Respuesta no parseable");
        console.warn(`[AI:${tag}] parse falló en intento ${attempt}, contenido:`, content.slice(0, 200));
        await backoff(attempt);
        continue;
      }
    } catch (e) {
      if (e instanceof FatalAIError) throw e;
      // Error de red u otro → reintentamos.
      lastError = e instanceof Error ? e : new Error(String(e));
      console.warn(`[AI:${tag}] error en intento ${attempt}:`, lastError.message);
      await backoff(attempt);
    }
  }

  console.error(`[AI:${tag}] agotó ${MAX_ATTEMPTS} intentos`, lastError);
  throw new Error("La IA no respondió correctamente. Probá de nuevo en unos segundos.");
}

class FatalAIError extends Error {}

/** Espera incremental entre reintentos: 0ms (1er retry), 400ms, 800ms. */
function backoff(attempt: number): Promise<void> {
  if (attempt >= MAX_ATTEMPTS) return Promise.resolve();
  return new Promise((r) => setTimeout(r, (attempt - 1) * 400));
}

/**
 * Algunos modelos devuelven JSON envuelto en fences markdown o con texto preámbulo.
 * Recortamos al primer { o [ y al último } o ] que cierra.
 */
function extractJson(raw: string): string {
  let s = raw.trim();
  // strip markdown fences
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const firstObj = s.indexOf("{");
  const firstArr = s.indexOf("[");
  const start = firstObj === -1 ? firstArr : firstArr === -1 ? firstObj : Math.min(firstObj, firstArr);
  if (start === -1) return s;
  const open = s[start];
  const close = open === "{" ? "}" : "]";
  const end = s.lastIndexOf(close);
  if (end === -1 || end < start) return s.slice(start);
  return s.slice(start, end + 1);
}
