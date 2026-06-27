import { describe, expect, it } from "vitest";
import { buildFinalizeMaterialData } from "./finalize";

describe("buildFinalizeMaterialData", () => {
  it("guarda texto OCR extraido en el payload del material", () => {
    expect(
      buildFinalizeMaterialData({
        materialId: "mat-1",
        storagePath: "user/mat-1.png",
        text: "  Resolver x^2 - 4 = 0  ",
        pageCount: null,
        detectedTopic: "Algebra",
      }),
    ).toEqual({
      materialId: "mat-1",
      storagePath: "user/mat-1.png",
      extractedText: "Resolver x^2 - 4 = 0",
      preview: "Resolver x^2 - 4 = 0",
      pageCount: null,
      detectedTopic: "Algebra",
    });
  });

  it("permite finalizar el material sin texto si OCR falla", () => {
    expect(
      buildFinalizeMaterialData({
        materialId: "mat-2",
        storagePath: "user/mat-2.png",
        text: "",
        pageCount: null,
        detectedTopic: null,
      }),
    ).toMatchObject({
      extractedText: null,
      preview: null,
      storagePath: "user/mat-2.png",
    });
  });
});
