import { describe, it, expect } from "vitest";
import { computeBadges, badgeStats, type BadgeContext } from "./badges";

function ctx(overrides: Partial<BadgeContext>): BadgeContext {
  return {
    overall: {
      totalAttempts: 0,
      correctAttempts: 0,
      accuracy: 0,
      activeTopics: 0,
      topicsTouched: 0,
    },
    aggregates: [],
    profile: { current_streak: 0, longest_streak: 0, xp: 0, level: 1 },
    totalTopics: 11,
    ...overrides,
  };
}

describe("computeBadges", () => {
  it("user fresco → ningún badge ganado, primer-paso con progress 0", () => {
    const badges = computeBadges(ctx({}));
    expect(badges.every((b) => !b.earned)).toBe(true);
    const firstSteps = badges.find((b) => b.def.id === "first-steps")!;
    expect(firstSteps.progress).toBe(0);
  });

  it("primer ejercicio → first-steps ganado", () => {
    const badges = computeBadges(
      ctx({
        overall: {
          totalAttempts: 1,
          correctAttempts: 1,
          accuracy: 100,
          activeTopics: 1,
          topicsTouched: 1,
        },
      }),
    );
    expect(badges.find((b) => b.def.id === "first-steps")!.earned).toBe(true);
  });

  it("racha 7 días → streak-3 y streak-7 ganados, streak-30 no", () => {
    const badges = computeBadges(
      ctx({
        profile: { current_streak: 7, longest_streak: 7, xp: 0, level: 1 },
      }),
    );
    expect(badges.find((b) => b.def.id === "streak-3")!.earned).toBe(true);
    expect(badges.find((b) => b.def.id === "streak-7")!.earned).toBe(true);
    expect(badges.find((b) => b.def.id === "streak-30")!.earned).toBe(false);
  });

  it("sharp solo cuenta con ≥20 intentos", () => {
    // 95% pero solo 10 attempts → no califica
    const a = computeBadges(
      ctx({
        overall: {
          totalAttempts: 10,
          correctAttempts: 9,
          accuracy: 95,
          activeTopics: 1,
          topicsTouched: 1,
        },
      }),
    );
    expect(a.find((b) => b.def.id === "sharp")!.earned).toBe(false);

    // 95% con 25 attempts → califica
    const b = computeBadges(
      ctx({
        overall: {
          totalAttempts: 25,
          correctAttempts: 24,
          accuracy: 95,
          activeTopics: 2,
          topicsTouched: 2,
        },
      }),
    );
    expect(b.find((b) => b.def.id === "sharp")!.earned).toBe(true);
  });

  it("progress nunca excede 100", () => {
    const badges = computeBadges(
      ctx({
        overall: {
          totalAttempts: 1000,
          correctAttempts: 1000,
          accuracy: 100,
          activeTopics: 5,
          topicsTouched: 11,
        },
        profile: { current_streak: 100, longest_streak: 100, xp: 99999, level: 999 },
      }),
    );
    for (const b of badges) {
      expect(b.progress).toBeLessThanOrEqual(100);
      expect(b.progress).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("badgeStats", () => {
  it("cuenta ganados y total", () => {
    const badges = computeBadges(
      ctx({
        overall: {
          totalAttempts: 1,
          correctAttempts: 1,
          accuracy: 100,
          activeTopics: 0,
          topicsTouched: 1,
        },
      }),
    );
    const { earned, total } = badgeStats(badges);
    expect(total).toBeGreaterThan(0);
    expect(earned).toBeGreaterThanOrEqual(1); // al menos first-steps
  });
});
