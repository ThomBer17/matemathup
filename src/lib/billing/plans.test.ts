import { describe, it, expect } from "vitest";
import {
  limitFor,
  withinLimit,
  normalizePlan,
  isFreemiumLimitError,
  FREEMIUM_LIMIT_ERROR,
  startOfArgentinaDay,
} from "./plans";

describe("limitFor", () => {
  it("free tiene límites finitos", () => {
    expect(limitFor("free", "adaptive")).toBe(20);
    expect(limitFor("free", "tanda")).toBe(3);
  });
  it("premium es ilimitado (null)", () => {
    expect(limitFor("premium", "adaptive")).toBeNull();
    expect(limitFor("premium", "tanda")).toBeNull();
  });
});

describe("withinLimit", () => {
  it("free bloquea al alcanzar el límite", () => {
    expect(withinLimit("free", "adaptive", 19)).toBe(true);
    expect(withinLimit("free", "adaptive", 20)).toBe(false);
    expect(withinLimit("free", "adaptive", 21)).toBe(false);
  });
  it("free tanda", () => {
    expect(withinLimit("free", "tanda", 2)).toBe(true);
    expect(withinLimit("free", "tanda", 3)).toBe(false);
  });
  it("premium nunca bloquea", () => {
    expect(withinLimit("premium", "adaptive", 9999)).toBe(true);
    expect(withinLimit("premium", "tanda", 9999)).toBe(true);
  });
});

describe("normalizePlan", () => {
  it("default a free", () => {
    expect(normalizePlan(null)).toBe("free");
    expect(normalizePlan(undefined)).toBe("free");
    expect(normalizePlan("cualquiera")).toBe("free");
    expect(normalizePlan("free")).toBe("free");
  });
  it("reconoce premium", () => {
    expect(normalizePlan("premium")).toBe("premium");
  });
});

describe("isFreemiumLimitError", () => {
  it("detecta los códigos de límite", () => {
    expect(isFreemiumLimitError(FREEMIUM_LIMIT_ERROR.adaptive)).toBe("adaptive");
    expect(isFreemiumLimitError(FREEMIUM_LIMIT_ERROR.tanda)).toBe("tanda");
  });
  it("ignora otros mensajes", () => {
    expect(isFreemiumLimitError("Error de red")).toBeNull();
    expect(isFreemiumLimitError("")).toBeNull();
  });
});

describe("startOfArgentinaDay", () => {
  it("00:00 AR es 03:00 UTC del mismo día", () => {
    // 2026-05-30 15:00 UTC = 12:00 AR → inicio del día AR = 2026-05-30 03:00 UTC
    const iso = startOfArgentinaDay(new Date("2026-05-30T15:00:00Z"));
    expect(iso).toBe("2026-05-30T03:00:00.000Z");
  });
  it("antes de las 03:00 UTC cuenta como el día AR anterior", () => {
    // 2026-05-30 01:00 UTC = 2026-05-29 22:00 AR → inicio del día AR = 2026-05-29 03:00 UTC
    const iso = startOfArgentinaDay(new Date("2026-05-30T01:00:00Z"));
    expect(iso).toBe("2026-05-29T03:00:00.000Z");
  });
});
