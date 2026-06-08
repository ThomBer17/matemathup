import { describe, it, expect } from "vitest";
import {
  countByType, countOf, distinctActiveUsers, topByMetadataKey,
  funnel, retention, filterSince,
  sessionize, sessionMetrics, abandonmentByTopic, globalAbandonment,
  accuracyByTopic, activityByHour, buildAlerts, type AnalyticsEvent,
} from "./compute";

function ev(p: Partial<AnalyticsEvent>): AnalyticsEvent {
  return {
    user_id: "u1", event_type: "x", entity_type: null, entity_id: null,
    metadata: {}, created_at: "2026-06-01T10:00:00.000Z", ...p,
  };
}

describe("conteos", () => {
  const events = [
    ev({ event_type: "exercise_answered", user_id: "u1" }),
    ev({ event_type: "exercise_answered", user_id: "u2" }),
    ev({ event_type: "hint_requested", user_id: "u1" }),
  ];
  it("countByType / countOf", () => {
    expect(countByType(events)).toEqual({ exercise_answered: 2, hint_requested: 1 });
    expect(countOf(events, "exercise_answered")).toBe(2);
    expect(countOf(events, "nope")).toBe(0);
  });
  it("distinctActiveUsers", () => {
    expect(distinctActiveUsers(events)).toBe(2);
  });
});

describe("topByMetadataKey", () => {
  it("ranking de temas practicados", () => {
    const events = [
      ev({ event_type: "exercise_answered", metadata: { topic: "Trigonometría" } }),
      ev({ event_type: "exercise_answered", metadata: { topic: "Trigonometría" } }),
      ev({ event_type: "exercise_answered", metadata: { topic: "Álgebra" } }),
      ev({ event_type: "hint_requested", metadata: { topic: "Límites" } }), // otro tipo, no cuenta
    ];
    const top = topByMetadataKey(events, "exercise_answered", "topic");
    expect(top[0]).toEqual({ key: "Trigonometría", count: 2 });
    expect(top).toHaveLength(2);
  });
});

describe("funnel", () => {
  it("usuarios distintos por etapa", () => {
    const events = [
      ev({ event_type: "signup", user_id: "u1" }),
      ev({ event_type: "signup", user_id: "u2" }),
      ev({ event_type: "exercise_answered", user_id: "u1" }),
      ev({ event_type: "plan_created", user_id: "u1" }),
    ];
    const f = funnel(events, [
      { label: "Registro", eventTypes: ["signup"] },
      { label: "Primer ejercicio", eventTypes: ["exercise_answered"] },
      { label: "Primer plan", eventTypes: ["plan_created"] },
    ]);
    expect(f.map((s) => s.users)).toEqual([2, 1, 1]);
  });
});

describe("retention", () => {
  it("D1: vuelve al día siguiente", () => {
    const events = [
      ev({ user_id: "u1", created_at: "2026-06-01T10:00:00Z" }),
      ev({ user_id: "u1", created_at: "2026-06-02T10:00:00Z" }), // volvió D1
      ev({ user_id: "u2", created_at: "2026-06-01T10:00:00Z" }), // no volvió
    ];
    const r = retention(events, "2026-06-10");
    expect(r.d1).toBe(50); // 1 de 2 elegibles volvió
  });

  it("null si nadie es elegible todavía", () => {
    const events = [ev({ user_id: "u1", created_at: "2026-06-10T10:00:00Z" })];
    const r = retention(events, "2026-06-10");
    expect(r.d1).toBeNull(); // first==today, no tuvo chance
  });
});

describe("filterSince", () => {
  it("filtra por fecha", () => {
    const events = [
      ev({ created_at: "2026-06-01T10:00:00Z" }),
      ev({ created_at: "2026-06-05T10:00:00Z" }),
    ];
    expect(filterSince(events, "2026-06-03T00:00:00Z")).toHaveLength(1);
  });
});

describe("sessionize", () => {
  it("eventos a <30 min son una sesión; >30 min abren otra", () => {
    const evs = [
      ev({ user_id: "u1", event_type: "exercise_answered", created_at: "2026-06-01T10:00:00Z", metadata: { topic: "Álgebra" } }),
      ev({ user_id: "u1", event_type: "exercise_answered", created_at: "2026-06-01T10:10:00Z", metadata: { topic: "Funciones" } }),
      ev({ user_id: "u1", event_type: "exercise_answered", created_at: "2026-06-01T11:00:00Z", metadata: { topic: "Álgebra" } }), // gap 50 min
    ];
    const s = sessionize(evs, 30);
    expect(s).toHaveLength(2);
    expect(s[0].exercisesAnswered).toBe(2);
    expect(s[0].topics.sort()).toEqual(["Funciones", "Álgebra"]);
    expect(s[0].durationMin).toBe(10);
    expect(s[1].exercisesAnswered).toBe(1);
  });

  it("sessionMetrics promedia", () => {
    const evs = [
      ev({ user_id: "u1", event_type: "exercise_answered", created_at: "2026-06-01T10:00:00Z" }),
      ev({ user_id: "u1", event_type: "exercise_answered", created_at: "2026-06-01T10:20:00Z" }),
      ev({ user_id: "u2", event_type: "exercise_answered", created_at: "2026-06-01T10:00:00Z" }),
    ];
    const m = sessionMetrics(sessionize(evs));
    expect(m.total).toBe(2);
    expect(m.sessionsPerUser).toBe(1);
  });
});

describe("abandonmentByTopic", () => {
  it("calcula abandono y ordena peor primero", () => {
    const evs = [
      ...Array(10).fill(0).map(() => ev({ event_type: "exercise_generated", metadata: { topic: "Logaritmos" } })),
      ...Array(4).fill(0).map(() => ev({ event_type: "exercise_answered", metadata: { topic: "Logaritmos" } })),
      ...Array(5).fill(0).map(() => ev({ event_type: "exercise_generated", metadata: { topic: "Álgebra" } })),
      ...Array(5).fill(0).map(() => ev({ event_type: "exercise_answered", metadata: { topic: "Álgebra" } })),
    ];
    const r = abandonmentByTopic(evs);
    expect(r[0]).toMatchObject({ topic: "Logaritmos", generated: 10, completed: 4, abandonPct: 60 });
    expect(r[1].abandonPct).toBe(0); // Álgebra 5/5
    expect(globalAbandonment(evs)).toBe(40); // 15 gen, 9 done
  });

  it("ignora temas con poco volumen", () => {
    const evs = [ev({ event_type: "exercise_generated", metadata: { topic: "X" } })];
    expect(abandonmentByTopic(evs, 3)).toHaveLength(0);
  });
});

describe("accuracyByTopic", () => {
  it("precisión por tema, peor primero", () => {
    const evs = [
      ev({ event_type: "exercise_correct", metadata: { topic: "Funciones" } }),
      ev({ event_type: "exercise_correct", metadata: { topic: "Funciones" } }),
      ev({ event_type: "exercise_incorrect", metadata: { topic: "Funciones" } }),
      ev({ event_type: "exercise_incorrect", metadata: { topic: "Integrales" } }),
      ev({ event_type: "exercise_incorrect", metadata: { topic: "Integrales" } }),
      ev({ event_type: "exercise_correct", metadata: { topic: "Integrales" } }),
    ];
    const r = accuracyByTopic(evs);
    expect(r[0].topic).toBe("Integrales");
    expect(r[0].accuracyPct).toBe(33);
    expect(r.find((x) => x.topic === "Funciones")?.accuracyPct).toBe(67);
  });
});

describe("activityByHour", () => {
  it("buckea por hora local (AR -3)", () => {
    const buckets = activityByHour([ev({ created_at: "2026-06-01T15:30:00Z" })], -3); // 12 AR
    expect(buckets[12]).toBe(1);
    expect(buckets.reduce((a, b) => a + b, 0)).toBe(1);
  });
});

describe("buildAlerts", () => {
  it("genera alertas de abandono, precisión y bajo uso", () => {
    const alerts = buildAlerts({
      abandonment: [{ topic: "Logaritmos", generated: 10, completed: 3, abandonPct: 70 }],
      accuracy: [{ topic: "Integrales", correct: 1, total: 3, accuracyPct: 33 }],
      featureCounts: [{ feature: "material_uploaded", label: "Material propio", count: 1 }],
    });
    expect(alerts).toHaveLength(3);
    expect(alerts[0].text).toContain("70% de abandono");
    expect(alerts.some((a) => a.text.includes("33% de precisión"))).toBe(true);
    expect(alerts.some((a) => a.text.includes("se usa poco"))).toBe(true);
  });

  it("no alerta si todo está bien", () => {
    expect(buildAlerts({
      abandonment: [{ topic: "X", generated: 10, completed: 9, abandonPct: 10 }],
      accuracy: [{ topic: "Y", correct: 9, total: 10, accuracyPct: 90 }],
      featureCounts: [{ feature: "f", label: "F", count: 50 }],
    })).toHaveLength(0);
  });
});
