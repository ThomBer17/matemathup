export const MAX_IMAGE_OCR_BYTES = 8 * 1024 * 1024;

export const IMAGE_OCR_RATE_LIMIT = {
  bucket: "material_image_ocr",
  limit: 8,
  windowMs: 60_000,
} as const;
