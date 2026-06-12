import { describe, it, expect } from "vitest";
import { countToday, goalProgress, goalMessage, shouldNudgeStreak, hourArgentina } from "./daily";

describe("countToday", () => {
  it("cuenta solo los intentos de hoy (hora Argentina)", () => {
    const today = "2026-06-14";
    const attempts = [
      { created_at: "2026-06-14T15:00:00Z" }, // hoy
      { created_at: "2026-06-14T02:00:00Z" }, // 14 a las 23 AR del 13 → ojo
      { created_at: "2026-06-13T20:00:00Z" }, // ayer
    ];
    // 2026-06-14T02:00Z → AR (UTC-3) = 2026-06-13T23:00 → cuenta como día 13
    expect(countToday(attempts, today)).toBe(1);
  });
});

describe("goalProgress", () => {
  it("calcula progreso y meta cumplida", () => {
    expect(goalProgress(3, 3)).toEqual({ done: 3, goal: 3, remaining: 0, pct: 100, met: true });
    expect(goalProgress(1, 3)).toEqual({ done: 1, goal: 3, remaining: 2, pct: 33, met: false });
    expect(goalProgress(5, 3).met).toBe(true);
  });

  it("nunca pasa de 100% ni meta menor a 1", () => {
    expect(goalProgress(10, 3).pct).toBe(100);
    expect(goalProgress(0, 0).goal).toBe(1);
  });
});

describe("goalMessage / shouldNudgeStreak", () => {
  it("mensaje según estado", () => {
    expect(goalMessage(goalProgress(3, 3))).toContain("cumplida");
    expect(goalMessage(goalProgress(0, 3))).toContain("Arrancá");
    expect(goalMessage(goalProgress(2, 3))).toContain("falta");
  });

  it("nudge solo si no cumplió y es tarde", () => {
    expect(shouldNudgeStreak(goalProgress(1, 3), 20)).toBe(true);
    expect(shouldNudgeStreak(goalProgress(1, 3), 10)).toBe(false);
    expect(shouldNudgeStreak(goalProgress(3, 3), 22)).toBe(false);
  });

  it("hourArgentina devuelve 0-23", () => {
    const h = hourArgentina(Date.parse("2026-06-14T01:30:00Z")); // AR = 22:30 del 13
    expect(h).toBe(22);
  });
});
