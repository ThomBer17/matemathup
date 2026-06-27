import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { persistentRateLimit } from "@/lib/ai/rate-limit";
import { finishAIGeneration, reserveAIGeneration } from "@/lib/billing/usage";
import { log } from "@/lib/observability/log";
import type { MaterialKind } from "./process";
import {
  assertSupportedImageForOcr,
  extractImageTextWithGemini,
  IMAGE_OCR_RATE_LIMIT,
} from "./ocr";

interface CreateMaterialInput {
  fileName: string;
  fileType: MaterialKind;
  mimeType: string | null;
  fileSize: number;
}

interface FinalizeMaterialInput {
  materialId: string;
  storagePath: string | null;
  extractedText: string | null;
  preview: string | null;
  pageCount: number | null;
  detectedTopic: string | null;
}

interface MarkMaterialErrorInput {
  materialId: string;
  errorMessage: string;
}

interface DeleteMaterialInput {
  materialId: string;
}

interface ExtractImageOcrInput {
  materialId: string;
  storagePath: string;
}

export const createMaterialRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CreateMaterialInput) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { data: id, error } = await context.supabase.rpc("create_material_record", {
      p_file_name: data.fileName,
      p_file_type: data.fileType,
      p_mime_type: data.mimeType,
      p_file_size: data.fileSize,
    });

    if (error || !id) {
      log.error("material_create_failed", { error: error?.message ?? "missing_material" });
      throw new Error("No se pudo registrar el material.");
    }

    return { id };
  });

export const finalizeMaterialRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: FinalizeMaterialInput) => input)
  .handler(async ({ data, context }): Promise<{ updated: boolean }> => {
    const { data: updated, error } = await context.supabase.rpc("finalize_material_record", {
      p_material_id: data.materialId,
      p_storage_path: data.storagePath,
      p_extracted_text: data.extractedText,
      p_preview: data.preview,
      p_page_count: data.pageCount,
      p_detected_topic: data.detectedTopic,
    });

    if (error) {
      log.error("material_finalize_failed", { error: error.message, materialId: data.materialId });
      throw new Error("No se pudo guardar el material procesado.");
    }

    return { updated: updated ?? false };
  });

export const markMaterialError = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: MarkMaterialErrorInput) => input)
  .handler(async ({ data, context }): Promise<{ updated: boolean }> => {
    const { data: updated, error } = await context.supabase.rpc("mark_material_error", {
      p_material_id: data.materialId,
      p_error_message: data.errorMessage,
    });

    if (error) {
      log.error("material_mark_error_failed", {
        error: error.message,
        materialId: data.materialId,
      });
      throw new Error("No se pudo marcar el material con error.");
    }

    return { updated: updated ?? false };
  });

export const extractImageOcr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ExtractImageOcrInput) => input)
  .handler(async ({ data, context }): Promise<{ text: string }> => {
    if (!data.storagePath.startsWith(`${context.userId}/`)) {
      throw new Error("Ruta de archivo invalida.");
    }

    const { data: material, error: materialError } = await context.supabase
      .from("materials")
      .select("id,file_name,file_type,mime_type,file_size")
      .eq("id", data.materialId)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (materialError || !material) {
      log.warn("material_image_ocr_missing_material", {
        materialId: data.materialId,
        error: materialError?.message,
      });
      throw new Error("Material no encontrado.");
    }

    if (material.file_type !== "image") {
      throw new Error("El material no es una imagen.");
    }
    assertSupportedImageForOcr({
      mimeType: material.mime_type,
      fileSize: material.file_size,
    });

    const rl = await persistentRateLimit(
      context.supabase,
      context.userId,
      IMAGE_OCR_RATE_LIMIT.bucket,
      IMAGE_OCR_RATE_LIMIT.limit,
      IMAGE_OCR_RATE_LIMIT.windowMs,
    );
    if (!rl.ok) {
      throw new Error(
        `Demasiadas imagenes procesadas. Espera ${rl.retryInSec ?? 60} segundos y proba de nuevo.`,
      );
    }

    const generationId = await reserveAIGeneration(context.supabase, {
      userId: context.userId,
      topicId: null,
      difficulty: null,
      model: null,
      metadata: {
        kind: "material_image_ocr",
        materialId: data.materialId,
        fileSize: material.file_size,
        mimeType: material.mime_type,
      },
    });

    try {
      const { data: blob, error: downloadError } = await context.supabase.storage
        .from("materials")
        .download(data.storagePath);

      if (downloadError || !blob) {
        throw new Error(downloadError?.message ?? "No se pudo leer la imagen.");
      }

      const result = await extractImageTextWithGemini({
        bytes: await blob.arrayBuffer(),
        mimeType: material.mime_type ?? "image/jpeg",
        fileName: material.file_name,
      });

      await finishAIGeneration(context.supabase, generationId, {
        status: "success",
        generatedExercise: {
          kind: "material_image_ocr",
          materialId: data.materialId,
          outputChars: result.text.length,
          elapsedMs: result.elapsedMs,
          model: result.model,
        },
      });

      return { text: result.text };
    } catch (e) {
      await finishAIGeneration(context.supabase, generationId, {
        status: "error",
        errorMessage: e instanceof Error ? e.message : "material_image_ocr_failed",
      });
      throw e;
    }
  });

export const deleteMaterialRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: DeleteMaterialInput) => input)
  .handler(async ({ data, context }): Promise<{ deleted: boolean }> => {
    const { data: result, error } = await context.supabase.rpc("delete_material_record", {
      p_material_id: data.materialId,
    });
    const row = Array.isArray(result) ? result[0] : null;

    if (error) {
      log.error("material_delete_failed", { error: error.message, materialId: data.materialId });
      throw new Error("No se pudo eliminar el material.");
    }

    if (row?.storage_path) {
      const { error: storageError } = await context.supabase.storage
        .from("materials")
        .remove([row.storage_path]);
      if (storageError) {
        log.warn("material_storage_delete_failed", {
          error: storageError.message,
          materialId: data.materialId,
        });
      }
    }

    return { deleted: row?.deleted ?? false };
  });
