import { describe, expect, it } from "vitest";
import { buildDailySession } from "./daily-session";
import type { Recommendation } from "./recommendations";

const rec: Recommendation = {
  reason: "refuerzo",
  topic: {
    id: "1",
    name: "Trigonometría",
    slug: "trigonometria",
    color: "cyan",
    icon: "triangle",
  },
  headline: "Reforzar Trigonometría",
  detail: "Necesita práctica.",
  suggestedDifficulty: 2,
};

describe("buildDailySession", () => {
  it("prioriza diagnóstico incompleto", () => {
    const session = buildDailySession({
      diagnosticCompleted: false,
      dueCount: 4,
      recommendation: rec,
      isNewUser: false,
    });
    expect(session.kind).toBe("diagnostic");
    expect(session.target.to).toBe("/diagnostic");
  });

  it("prioriza repaso vencido después del diagnóstico", () => {
    const session = buildDailySession({
      diagnosticCompleted: true,
      dueCount: 2,
      recommendation: rec,
      isNewUser: false,
    });
    expect(session.kind).toBe("review");
    expect(session.target.to).toBe("/review");
  });

  it("usa recomendación cuando no hay bloqueo previo", () => {
    const session = buildDailySession({
      diagnosticCompleted: true,
      dueCount: 0,
      recommendation: rec,
      isNewUser: false,
    });
    expect(session.kind).toBe("practice");
    expect(session.target).toEqual({ to: "/topics/$slug", params: { slug: "trigonometria" } });
  });
});
