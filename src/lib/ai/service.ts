const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-120b:free";

/** Reintentos internos por defecto ante respuestas no parseables o errores transitorios. */
const DEFAULT_MAX_ATTEMPTS = 3;

export interface AIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  /** Modelo rápido opcional (AI_MODEL_FAST) para flujos sensibles a latencia. */
  fastModel: string;
}

export function getAIConfig(): AIConfig {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Falta AI_API_KEY en el entorno. Configurala en .env (ver .env.example).",
    );
  }
  const model = process.env.AI_MODEL ?? DEFAULT_MODEL;
  return {
    apiKey,
    baseUrl: process.env.AI_BASE_URL ?? DEFAULT_BASE_URL,
    model,
    fastModel: process.env.AI_MODEL_FAST ?? model,
  };
}

export interface AICallOptions {
  systemPrompt: string;
  userPrompt: string;
  /** Etiqueta opcional para logs de timing (ej. "generateExercise", "evaluateAnswer"). */
  label?: string;
  /** Override del modelo (ej. el fastModel para práctica adaptativa). */
  model?: string;
  /** Esfuerzo de razonamiento. "low" acelera mucho en modelos de reasoning (gpt-oss). */
  reasoningEffort?: "low" | "medium" | "high";
  /** Máximo de intentos internos. Default 3; bajalo para fallar rápido. */
  maxAttempts?: number;
}

export async function callAI<T>(options: AICallOptions): Promise<T> {
  const cfg = getAIConfig();
  const { apiKey, baseUrl } = cfg;
  const model = options.model ?? cfg.model;
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const tag = options.label ?? "callAI";
  const inputTokensEst = Math.round((options.systemPrompt.length + options.userPrompt.length) / 4);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const start = Date.now();
    try {
      const body: Record<string, unknown> = {
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
      };
      // Control de razonamiento. El campo `reasoning` es específico de OpenRouter.
      if (options.reasoningEffort && baseUrl.includes("openrouter")) {
        body.reasoning = { effort: options.reasoningEffort };
      }
      // Gemini 2.5 Flash es un modelo "thinking": razona antes de responder, lo que
      // consume el presupuesto de salida (deja el JSON truncado → "formato inválido")
      // y agrega latencia. Lo desactivamos y damos MARGEN AMPLIO de tokens: si el
      // thinking igual consume algo, 4096 evita que se trunque el JSON del ejercicio.
      if (baseUrl.includes("generativelanguage.googleapis.com")) {
        body.reasoning_effort = "none";
        body.max_tokens = 4096;
      }

      const res = await fetch(baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      // Errores no recuperables: cortamos de inmediato.
      if (res.status === 401) throw new FatalAIError("Credenciales de IA inválidas. Revisá AI_API_KEY.");
      if (res.status === 402) throw new FatalAIError("Sin créditos de IA disponibles.");

      if (!res.ok) {
        // 429 y 5xx son transitorios → reintentamos con backoff.
        lastError = new Error(
          res.status === 429 ? "Límite de uso alcanzado." : `Error de IA (${res.status})`,
        );
        await backoff(attempt, maxAttempts);
        continue;
      }

      const json = await res.json();
      const content = json.choices?.[0]?.message?.content ?? "";
      const finishReason = json.choices?.[0]?.finish_reason ?? "?";
      const elapsed = Date.now() - start;
      console.log(
        `[AI:${tag}] attempt ${attempt}/${maxAttempts} · ${elapsed}ms · model=${model} · in≈${inputTokensEst}tok · out=${content.length}ch · finish=${finishReason}`,
      );

      // Respuesta vacía (a veces Gemini devuelve content "" con finish="length"
      // porque el thinking consumió todo el presupuesto) → reintentamos.
      if (!content.trim()) {
        lastError = new Error("Respuesta vacía de la IA");
        console.warn(`[AI:${tag}] content vacío en intento ${attempt} · finish=${finishReason}`);
        await backoff(attempt, maxAttempts);
        continue;
      }

      try {
        return JSON.parse(extractJson(content)) as T;
      } catch {
        // Segundo intento: reparar JSON truncado/con comas colgantes (típico cuando
        // finish_reason="length"). Si aún falla, reintentamos la llamada.
        try {
          return JSON.parse(repairJson(extractJson(content))) as T;
        } catch {
          lastError = new Error("Respuesta no parseable");
          console.warn(
            `[AI:${tag}] parse falló en intento ${attempt} · finish=${finishReason} · contenido:`,
            content.slice(0, 200),
          );
          await backoff(attempt, maxAttempts);
          continue;
        }
      }
    } catch (e) {
      if (e instanceof FatalAIError) throw e;
      // Error de red u otro → reintentamos.
      lastError = e instanceof Error ? e : new Error(String(e));
      console.warn(`[AI:${tag}] error en intento ${attempt}:`, lastError.message);
      await backoff(attempt, maxAttempts);
    }
  }

  console.error(`[AI:${tag}] agotó ${maxAttempts} intentos`, lastError);
  throw new Error("La IA no respondió correctamente. Probá de nuevo en unos segundos.");
}

class FatalAIError extends Error {}

/** Espera incremental entre reintentos: 0ms (1er retry), 400ms, 800ms. */
function backoff(attempt: number, maxAttempts: number): Promise<void> {
  if (attempt >= maxAttempts) return Promise.resolve();
  return new Promise((r) => setTimeout(r, (attempt - 1) * 400));
}

/**
 * Algunos modelos devuelven JSON envuelto en fences markdown o con texto preámbulo.
 * Recortamos al primer { o [ y al último } o ] que cierra.
 */
export function extractJson(raw: string): string {
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

/**
 * Repara JSON casi-válido: quita comas colgantes y cierra strings/llaves/corchetes
 * que quedaron abiertos por truncado (finish_reason="length"). Best-effort: si el
 * corte fue muy profundo igual puede fallar y caemos al reintento de la llamada.
 */
export function repairJson(raw: string): string {
  let s = raw.trim();
  // Comas colgantes antes de } o ]: {"a":1,} → {"a":1}
  s = s.replace(/,\s*([}\]])/g, "$1");

  // Recorrido para detectar string sin cerrar y profundidad de llaves/corchetes.
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  for (const ch of s) {
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") stack.pop();
  }
  if (inString) s += '"'; // cerramos el string truncado
  // Quitamos una posible coma final tras cerrar el string y cerramos contenedores.
  s = s.replace(/,\s*$/, "");
  while (stack.length) {
    s += stack.pop() === "{" ? "}" : "]";
  }
  return s;
}
