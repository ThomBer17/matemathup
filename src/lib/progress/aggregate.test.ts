import { describe, it, expect } from "vitest";
import {
  computeOverall,
  computeTrend,
  aggregateByTopic,
  generateInsights,
  type AttemptRow,
  type TopicMeta,
} from "./aggregate";

const META: TopicMeta = {
  id: "topic-1",
  name: "Trigonometría",
  slug: "trigonometria",
  color: "violet",
  icon: "Triangle",
};
const META2: TopicMeta = { ...META, id: "topic-2", name: "Funciones", slug: "funciones" };

function attempt(overrides: Partial<AttemptRow>): AttemptRow {
  return {
    id: crypto.randomUUID(),
    is_correct: true,
    status: "correct",
    source: "adaptive",
    difficulty: 3,
    topic_id: META.id,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

describe("computeOverall", () => {
  it("array vacío → todos los stats en 0", () => {
    const o = computeOverall([]);
    expect(o.totalAttempts).toBe(0);
    expect(o.correctAttempts).toBe(0);
    expect(o.accuracy).toBe(0);
    expect(o.activeTopics).toBe(0);
    expect(o.topicsTouched).toBe(0);
  });

  it("calcula accuracy y temas correctamente", () => {
    const attempts: AttemptRow[] = [
      attempt({ is_correct: true }),
      attempt({ is_correct: true }),
      attempt({ is_correct: false }),
      attempt({ topic_id: META2.id, is_correct: true }),
    ];
    const o = computeOverall(attempts);
    expect(o.totalAttempts).toBe(4);
    expect(o.correctAttempts).toBe(3);
    expect(o.accuracy).toBe(75);
    expect(o.topicsTouched).toBe(2);
  });

  it("activeTopics cuenta solo los con ≥3 intentos en últimos 7d", () => {
    const recent: AttemptRow[] = [
      attempt({ topic_id: META.id, created_at: daysAgo(1) }),
      attempt({ topic_id: META.id, created_at: daysAgo(2) }),
      attempt({ topic_id: META.id, created_at: daysAgo(3) }),
      // META2 con 1 solo intento reciente → no activo
      attempt({ topic_id: META2.id, created_at: daysAgo(1) }),
    ];
    const o = computeOverall(recent);
    expect(o.activeTopics).toBe(1);
  });

  it("ignora intentos con topic_id null en topicsTouched", () => {
    const attempts: AttemptRow[] = [
      attempt({ topic_id: META.id }),
      attempt({ topic_id: null }),
    ];
    const o = computeOverall(attempts);
    expect(o.topicsTouched).toBe(1);
  });
});

describe("computeTrend", () => {
  it("menos de 3 intentos → 'nuevo'", () => {
    expect(computeTrend([attempt({}), attempt({})])).toBe("nuevo");
  });

  it("mejora >5pp en última semana → 'mejorando'", () => {
    const prior = Array.from({ length: 4 }, () =>
      attempt({ is_correct: false, created_at: daysAgo(10) }),
    );
    const recent = Array.from({ length: 4 }, () =>
      attempt({ is_correct: true, created_at: daysAgo(2) }),
    );
    expect(computeTrend([...prior, ...recent])).toBe("mejorando");
  });

  it("accuracy reciente <50% → 'refuerzo'", () => {
    const attempts = [
      attempt({ is_correct: false, created_at: daysAgo(1) }),
      attempt({ is_correct: false, created_at: daysAgo(2) }),
      attempt({ is_correct: true, created_at: daysAgo(3) }),
      attempt({ is_correct: false, created_at: daysAgo(4) }),
    ];
    expect(computeTrend(attempts)).toBe("refuerzo");
  });

  it("performance pareja → 'estable'", () => {
    const attempts = Array.from({ length: 6 }, (_, i) =>
      attempt({ is_correct: i % 3 !== 0, created_at: daysAgo(i + 1) }),
    );
    const trend = computeTrend(attempts);
    expect(["estable", "mejorando"]).toContain(trend);
  });
});

describe("aggregateByTopic", () => {
  it("agrupa por topic_id y deriva métricas", () => {
    const attempts: AttemptRow[] = [
      attempt({ topic_id: META.id, is_correct: true }),
      attempt({ topic_id: META.id, is_correct: true }),
      attempt({ topic_id: META.id, is_correct: false, status: "incorrect" }),
      attempt({ topic_id: META2.id, is_correct: true }),
    ];
    const meta = new Map([[META.id, META], [META2.id, META2]]);
    const aggs = aggregateByTopic(attempts, meta);
    expect(aggs).toHaveLength(2);

    const trig = aggs.find((a) => a.topic.id === META.id)!;
    expect(trig.totalAttempts).toBe(3);
    expect(trig.correctAttempts).toBe(2);
    expect(trig.accuracy).toBe(67);
  });

  it("ordena por totalAttempts desc", () => {
    const attempts: AttemptRow[] = [
      attempt({ topic_id: META.id }),
      attempt({ topic_id: META2.id }),
      attempt({ topic_id: META2.id }),
      attempt({ topic_id: META2.id }),
    ];
    const meta = new Map([[META.id, META], [META2.id, META2]]);
    const aggs = aggregateByTopic(attempts, meta);
    expect(aggs[0].topic.id).toBe(META2.id);
  });

  it("ignora attempts cuyo topic_id no está en el meta map", () => {
    const attempts: AttemptRow[] = [
      attempt({ topic_id: "topic-fantasma" }),
      attempt({ topic_id: META.id }),
    ];
    const meta = new Map([[META.id, META]]);
    const aggs = aggregateByTopic(attempts, meta);
    expect(aggs).toHaveLength(1);
    expect(aggs[0].topic.id).toBe(META.id);
  });
});

describe("generateInsights", () => {
  it("sin agregados → sin insights", () => {
    expect(generateInsights([])).toEqual([]);
  });

  it("genera 'strength' para tema con ≥80% y ≥5 intentos", () => {
    const aggs = [{
      topic: META,
      totalAttempts: 10,
      correctAttempts: 9,
      partialAttempts: 0,
      accuracy: 90,
      lastAttemptAt: new Date(),
      trend: "estable" as const,
      estimatedLevel: 4 as const,
    }];
    const insights = generateInsights(aggs);
    expect(insights.some((i) => i.kind === "strength")).toBe(true);
  });

  it("genera 'needs-work' para tema con <50% y ≥3 intentos", () => {
    const aggs = [{
      topic: META,
      totalAttempts: 5,
      correctAttempts: 1,
      partialAttempts: 0,
      accuracy: 20,
      lastAttemptAt: new Date(),
      trend: "refuerzo" as const,
      estimatedLevel: 1 as const,
    }];
    const insights = generateInsights(aggs);
    expect(insights.some((i) => i.kind === "needs-work")).toBe(true);
  });

  it("limita a 4 insights máx", () => {
    const aggs = Array.from({ length: 10 }, (_, i) => ({
      topic: { ...META, id: `t${i}`, name: `Tema ${i}` },
      totalAttempts: 6,
      correctAttempts: 5,
      partialAttempts: 0,
      accuracy: 85,
      lastAttemptAt: new Date(),
      trend: "mejorando" as const,
      estimatedLevel: 4 as const,
    }));
    expect(generateInsights(aggs).length).toBeLessThanOrEqual(4);
  });
});
