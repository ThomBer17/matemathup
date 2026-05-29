import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, _resetForTests } from "./rate-limit";

describe("rateLimit", () => {
  beforeEach(() => _resetForTests());

  it("permite hasta el límite", () => {
    for (let i = 0; i < 5; i++) {
      const r = rateLimit("u1", "gen", 5, 60_000);
      expect(r.ok).toBe(true);
    }
  });

  it("rechaza el siguiente cuando excede", () => {
    for (let i = 0; i < 3; i++) rateLimit("u1", "gen", 3, 60_000);
    const r = rateLimit("u1", "gen", 3, 60_000);
    expect(r.ok).toBe(false);
    expect(r.retryInSec).toBeGreaterThan(0);
    expect(r.retryInSec).toBeLessThanOrEqual(60);
  });

  it("cada user tiene bucket independiente", () => {
    for (let i = 0; i < 3; i++) rateLimit("u1", "gen", 3, 60_000);
    const r = rateLimit("u2", "gen", 3, 60_000);
    expect(r.ok).toBe(true);
  });

  it("cada bucket key es independiente", () => {
    for (let i = 0; i < 3; i++) rateLimit("u1", "gen", 3, 60_000);
    const r = rateLimit("u1", "eval", 3, 60_000);
    expect(r.ok).toBe(true);
  });

  it("ventana expirada resetea el counter", () => {
    // Usar ventana ultra corta para no esperar
    for (let i = 0; i < 2; i++) rateLimit("u1", "gen", 2, 1);
    // Aguarda 5ms para superar la ventana
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const r = rateLimit("u1", "gen", 2, 1);
        expect(r.ok).toBe(true);
        resolve();
      }, 5);
    });
  });
});
