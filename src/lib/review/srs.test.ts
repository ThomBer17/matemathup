import { describe, it, expect } from "vitest";
import { applyReview, intervalDays, isDue, countDue, newItem, MAX_BOX } from "./srs";

const NOW = new Date("2026-06-13T12:00:00Z");

describe("intervalDays", () => {
  it("intervalos Leitner por caja", () => {
    expect(intervalDays(0)).toBe(0);
    expect(intervalDays(1)).toBe(1);
    expect(intervalDays(2)).toBe(3);
    expect(intervalDays(5)).toBe(30);
    expect(intervalDays(99)).toBe(30); // clamp
  });
});

describe("applyReview", () => {
  it("acierto sube de caja y aleja la revisión", () => {
    const r = applyReview({ box: 1, dueAt: NOW.toISOString(), reviews: 2 }, true, NOW);
    expect(r.box).toBe(2);
    expect(r.reviews).toBe(3);
    // caja 2 → 3 días
    expect(new Date(r.dueAt).getTime()).toBe(NOW.getTime() + 3 * 86400000);
  });

  it("falla resetea a caja 0 y revisa pronto (mismo día)", () => {
    const r = applyReview({ box: 4, dueAt: NOW.toISOString(), reviews: 5 }, false, NOW);
    expect(r.box).toBe(0);
    expect(new Date(r.dueAt).getTime()).toBeLessThan(NOW.getTime() + 86400000);
  });

  it("no supera la caja máxima", () => {
    const r = applyReview({ box: MAX_BOX, dueAt: NOW.toISOString(), reviews: 9 }, true, NOW);
    expect(r.box).toBe(MAX_BOX);
  });
});

describe("isDue / countDue / newItem", () => {
  it("newItem arranca vencido en caja 0", () => {
    const item = newItem(NOW);
    expect(item.box).toBe(0);
    expect(isDue(item.dueAt, NOW)).toBe(true);
  });

  it("isDue compara contra ahora", () => {
    expect(isDue("2026-06-13T11:00:00Z", NOW)).toBe(true);
    expect(isDue("2026-06-14T12:00:00Z", NOW)).toBe(false);
  });

  it("countDue cuenta los vencidos", () => {
    const items = [
      { due_at: "2026-06-12T12:00:00Z" },
      { due_at: "2026-06-20T12:00:00Z" },
      { due_at: "2026-06-13T11:59:00Z" },
    ];
    expect(countDue(items, NOW)).toBe(2);
  });
});
