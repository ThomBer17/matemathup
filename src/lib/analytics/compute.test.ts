import { describe, it, expect } from "vitest";
import {
  countByType, countOf, distinctActiveUsers, topByMetadataKey,
  funnel, retention, filterSince, type AnalyticsEvent,
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
