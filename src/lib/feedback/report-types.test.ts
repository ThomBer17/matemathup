import { describe, it, expect } from "vitest";
import {
  reportTypeLabel,
  statusLabel,
  buildReportMetadata,
  REPORT_TYPE_OPTIONS,
  REPORT_STATUSES,
} from "./report-types";

describe("report-types labels", () => {
  it("todos los tipos tienen label", () => {
    expect(REPORT_TYPE_OPTIONS).toHaveLength(6);
    expect(reportTypeLabel("math_error")).toBe("Error matemático");
    expect(reportTypeLabel("suggestion")).toBe("Sugerencia");
  });
  it("tipo desconocido cae al valor crudo", () => {
    expect(reportTypeLabel("xyz")).toBe("xyz");
  });
  it("estados", () => {
    expect(REPORT_STATUSES).toEqual(["open", "reviewing", "fixed", "closed"]);
    expect(statusLabel("open")).toBe("Abierto");
    expect(statusLabel("fixed")).toBe("Resuelto");
  });
});

describe("buildReportMetadata", () => {
  it("mergea contexto + entorno + timestamp + placeholder de screenshot", () => {
    const meta = buildReportMetadata(
      { metadata: { exercise_type: "open", correct_answer: "5" } },
      { userAgent: "UA", url: "https://x/y" },
    );
    expect(meta.exercise_type).toBe("open");
    expect(meta.correct_answer).toBe("5");
    expect(meta.user_agent).toBe("UA");
    expect(meta.url).toBe("https://x/y");
    expect(meta.reported_at).toBeTypeOf("string");
    expect(meta.screenshot).toBeNull(); // preparado para futuro
  });
  it("funciona sin contexto", () => {
    const meta = buildReportMetadata({});
    expect(meta.user_agent).toBeNull();
    expect(meta.screenshot).toBeNull();
  });
});
