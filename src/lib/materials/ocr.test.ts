import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  arrayBufferToBase64,
  assertSupportedImageForOcr,
  cleanOcrText,
  extractImageTextWithGemini,
  extractOpenAIContent,
  MAX_IMAGE_OCR_BYTES,
} from "./ocr";

describe("material image OCR", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      AI_API_KEY: "test-key",
      AI_BASE_URL: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      AI_MODEL: "gemini-2.5-flash",
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = originalEnv;
  });

  it("procesa una imagen con Gemini Vision y devuelve texto limpio", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "```text\nResuelve: x^2 - 4 = 0\nIntervalo: [-2,4)\n```",
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await extractImageTextWithGemini({
      bytes: new Uint8Array([1, 2, 3]).buffer,
      mimeType: "image/png",
      fileName: "guia.png",
    });

    expect(result.text).toBe("Resuelve: x^2 - 4 = 0\nIntervalo: [-2,4)");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe("gemini-2.5-flash");
    expect(body.messages[0].content[1].image_url.url).toBe("data:image/png;base64,AQID");
  });

  it("propaga error amable si el proveedor OCR falla", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "provider down",
      }),
    );

    await expect(
      extractImageTextWithGemini({
        bytes: new Uint8Array([1]).buffer,
        mimeType: "image/jpeg",
      }),
    ).rejects.toThrow("No pudimos extraer texto de esta imagen.");
  });

  it("rechaza formatos y tamanos fuera de limite antes de llamar a la IA", () => {
    expect(() => assertSupportedImageForOcr({ mimeType: "application/pdf", fileSize: 10 })).toThrow(
      "Formato de imagen no soportado",
    );
    expect(() =>
      assertSupportedImageForOcr({ mimeType: "image/png", fileSize: MAX_IMAGE_OCR_BYTES + 1 }),
    ).toThrow("La imagen supera el limite de OCR");
  });

  it("extrae contenido compatible con respuestas OpenAI text-part", () => {
    expect(
      extractOpenAIContent({
        choices: [{ message: { content: [{ type: "text", text: "2x + 1 = 5" }] } }],
      }),
    ).toBe("2x + 1 = 5");
  });

  it("limpia fences y espacios sin tocar formulas", () => {
    expect(cleanOcrText("```markdown\n$\\sqrt{3}$  \n\n\n[ilegible]\n```")).toBe(
      "$\\sqrt{3}$\n\n[ilegible]",
    );
  });

  it("convierte bytes a base64 sin Buffer ni librerias OCR", () => {
    expect(arrayBufferToBase64(new Uint8Array([72, 105]).buffer)).toBe("SGk=");
  });
});
