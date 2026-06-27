import { makePreview } from "./process";

export interface BuildFinalizeMaterialDataInput {
  materialId: string;
  storagePath: string | null;
  text: string;
  pageCount: number | null;
  detectedTopic: string | null;
}

export function buildFinalizeMaterialData(input: BuildFinalizeMaterialDataInput) {
  const text = input.text.trim();
  return {
    materialId: input.materialId,
    storagePath: input.storagePath,
    extractedText: text || null,
    preview: text ? makePreview(text) : null,
    pageCount: input.pageCount,
    detectedTopic: input.detectedTopic,
  };
}
