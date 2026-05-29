import { describe, it, expect } from "vitest";
import { recommendNext } from "./recommendations";
import type { TopicAggregate, TopicMeta } from "./aggregate";

const T1: TopicMeta = { id: "t1", name: "Números Reales", slug: "numeros-reales", color: "sky", icon: "Sigma" };
const T2: TopicMeta = { id: "t2", name: "Trigonometría", slug: "trigonometria", color: "violet", icon: "Triangle" };

function agg(meta: TopicMeta, overrides: Partial<TopicAggregate>): TopicAggregate {
  return {
    topic: meta,
    totalAttempts: 0, correctAttempts: 0, partialAttempts: 0,
    accuracy: 0, lastAttemptAt: null, trend: "nuevo", estimatedLevel: 1,
    ...overrides,
  };
}

describe("recommendNext", () => {
  it("sin topics → null", () => {
    expect(recommendNext([], [])).toBeNull();
  });

  it("tema con trend=refuerzo gana prioridad", () => {
    const aggs = [
      agg(T1, { totalAttempts: 10, accuracy: 30, trend: "refuerzo", estimatedLevel: 2 }),
      agg(T2, { totalAttempts: 10, accuracy: 90, trend: "mejorando", estimatedLevel: 4 }),
    ];
    const rec = recommendNext(aggs, [T1, T2]);
    expect(rec?.reason).toBe("refuerzo");
    expect(rec?.topic.id).toBe(T1.id);
    expect(rec?.suggestedDifficulty).toBeLessThan(2);
  });

  it("sin refuerzo, prioriza tema con pocos intentos", () => {
    const aggs = [
      agg(T1, { totalAttempts: 2, accuracy: 100, trend: "nuevo", estimatedLevel: 1 }),
      agg(T2, { totalAttempts: 50, accuracy: 90, trend: "mejorando", estimatedLevel: 5 }),
    ];
    const rec = recommendNext(aggs, [T1, T2]);
    expect(rec?.reason).toBe("continuar");
    expect(rec?.topic.id).toBe(T1.id);
  });

  it("tema dominado reciente → 'mantener' con difficulty+1", () => {
    const aggs = [
      agg(T1, {
        totalAttempts: 20, accuracy: 85, trend: "estable", estimatedLevel: 4,
        lastAttemptAt: new Date(),
      }),
    ];
    const rec = recommendNext(aggs, [T1, T2]);
    expect(rec?.reason).toBe("mantener");
    expect(rec?.suggestedDifficulty).toBeGreaterThan(4);
  });

  it("user fresco → 'explorar' primer topic", () => {
    const rec = recommendNext([], [T1, T2]);
    expect(rec?.reason).toBe("explorar");
    expect(rec?.topic.id).toBe(T1.id);
  });

  it("explorar prefiere temas no tocados", () => {
    const aggs = [
      agg(T1, { totalAttempts: 50, accuracy: 70, trend: "estable", estimatedLevel: 3, lastAttemptAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) }),
    ];
    const rec = recommendNext(aggs, [T1, T2]);
    expect(rec?.topic.id).toBe(T2.id);
  });
});
