import { describe, it, expect } from "vitest";
import { scoreQuestion, levelLabel, summarize } from "./scoring";

describe("scoreQuestion", () => {
  it("correcta → arranca en la dificultad de la pregunta, dominio medio-alto", () => {
    const r = scoreQuestion("trigonometria", 3, "correct");
    expect(r.difficulty).toBe(3);
    expect(r.masteryPct).toBe(69); // 45 + 3*8
  });

  it("incorrecta → un escalón abajo, dominio bajo", () => {
    const r = scoreQuestion("algebra", 3, "incorrect");
    expect(r.difficulty).toBe(2);
    expect(r.masteryPct).toBe(24); // 15 + 3*3
  });

  it("no sé → nivel 1, dominio muy bajo", () => {
    const r = scoreQuestion("limites", 4, "skipped");
    expect(r.difficulty).toBe(1);
    expect(r.masteryPct).toBe(10);
  });

  it("clampea dificultad entre 1 y 5", () => {
    expect(scoreQuestion("x", 1, "incorrect").difficulty).toBe(1); // no baja de 1
    expect(scoreQuestion("x", 5, "correct").difficulty).toBe(5);
  });
});

describe("levelLabel y summarize", () => {
  it("etiqueta el nivel", () => {
    expect(levelLabel(1)).toBe("Desde lo básico");
    expect(levelLabel(3)).toBe("Intermedio");
    expect(levelLabel(5)).toBe("Muy avanzado");
  });

  it("resume aciertos", () => {
    const res = summarize([
      { outcome: "correct" }, { outcome: "incorrect" }, { outcome: "correct" }, { outcome: "skipped" },
    ]);
    expect(res).toEqual({ correct: 2, total: 4 });
  });
});
