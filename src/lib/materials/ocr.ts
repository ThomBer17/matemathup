import { getAIConfig } from "@/lib/ai/service";
import { errorFields, log } from "@/lib/observability/log";
import { IMAGE_OCR_RATE_LIMIT, MAX_IMAGE_OCR_BYTES } from "./ocr-constants";

export { IMAGE_OCR_RATE_LIMIT, MAX_IMAGE_OCR_BYTES };

export const IMAGE_OCR_PROMPT = `Extrae el texto matematico visible en esta imagen.
Conserva formulas, fracciones, raices, potencias, ecuaciones, inecuaciones e intervalos en notacion simple legible.
No resuelvas los ejercicios.
No inventes contenido.
Si algo no se lee, indicalo como [ilegible].
Devuelve solamente la transcripcion, sin comentarios ni markdown.`;

export interface ImageOcrInput {
  bytes: ArrayBuffer;
  mimeType: string;
  fileName?: string;
  model?: string;
}

export interface ImageOcrResult {
  text: string;
  elapsedMs: number;
  model: string;
}

export function assertSupportedImageForOcr(input: {
  mimeType: string | null | undefined;
  fileSize: number | null | undefined;
}) {
  const mime = input.mimeType ?? "";
  if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(mime)) {
    throw new Error("Formato de imagen no soportado para OCR.");
  }
  if ((input.fileSize ?? 0) > MAX_IMAGE_OCR_BYTES) {
    throw new Error("La imagen supera el limite de OCR.");
  }
}

export async function extractImageTextWithGemini(input: ImageOcrInput): Promise<ImageOcrResult> {
  assertSupportedImageForOcr({ mimeType: input.mimeType, fileSize: input.bytes.byteLength });

  const cfg = getAIConfig();
  const model = input.model ?? cfg.fastModel ?? cfg.model;
  const started = Date.now();

  try {
    const res = await fetch(cfg.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: IMAGE_OCR_PROMPT },
              {
                type: "image_url",
                image_url: {
                  url: `data:${input.mimeType};base64,${arrayBufferToBase64(input.bytes)}`,
                },
              },
            ],
          },
        ],
        max_tokens: 4096,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      log.warn("material_image_ocr_http_error", {
        status: res.status,
        body: body.slice(0, 300),
        fileName: input.fileName,
      });
      throw new Error("No pudimos extraer texto de esta imagen.");
    }

    const json = await res.json();
    const raw = extractOpenAIContent(json);
    const text = cleanOcrText(raw);
    const elapsedMs = Date.now() - started;

    log.info("material_image_ocr_completed", {
      elapsedMs,
      model,
      fileName: input.fileName,
      outputChars: text.length,
    });

    return { text, elapsedMs, model };
  } catch (e) {
    log.warn("material_image_ocr_failed", {
      ...errorFields(e),
      fileName: input.fileName,
      elapsedMs: Date.now() - started,
    });
    throw e;
  }
}

export function cleanOcrText(raw: string): string {
  return raw
    .replace(/^```(?:text|markdown)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractOpenAIContent(json: unknown): string {
  if (!json || typeof json !== "object") return "";
  const choices = (json as { choices?: unknown }).choices;
  if (!Array.isArray(choices)) return "";
  const first = choices[0] as { message?: { content?: unknown } } | undefined;
  const content = first?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (part && typeof part === "object" && "text" in part) {
          const text = (part as { text?: unknown }).text;
          return typeof text === "string" ? text : "";
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}
