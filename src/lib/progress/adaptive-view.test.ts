import { describe, expect, it } from "vitest";
import {
  adaptiveDifficultyToLevel,
  buildAdaptiveGraphExpressions,
  isRenderableAdaptiveExercise,
} from "./adaptive-view";

describe("adaptive view helpers", () => {
  it("validates exercises before rendering", () => {
    expect(
      isRenderableAdaptiveExercise({
        statement: "Resolver 2 + 2 y justificar.",
        correct_answer: "4",
        type: "open",
      }),
    ).toBe(true);

    expect(
      isRenderableAdaptiveExercise({
        statement: "Corto",
        correct_answer: "4",
        type: "open",
      }),
    ).toBe(false);

    expect(
      isRenderableAdaptiveExercise({
        statement: "Elegir la opcion correcta.",
        correct_answer: "A",
        type: "multiple_choice",
        options: ["A"],
      }),
    ).toBe(false);
  });

  it("maps numeric difficulty to activity levels", () => {
    expect(adaptiveDifficultyToLevel(1)).toBe("básico");
    expect(adaptiveDifficultyToLevel(3)).toBe("intermedio");
    expect(adaptiveDifficultyToLevel(5)).toBe("alto");
  });

  it("prefers AI graph expressions over detected expressions", () => {
    expect(
      buildAdaptiveGraphExpressions(["y=x"], [{ latex: "y=x^2", label: "detectada" }]),
    ).toEqual([{ id: "ai0", latex: "y=x", color: "#0EA5E9" }]);
  });

  it("builds graph expressions from detected functions", () => {
    expect(buildAdaptiveGraphExpressions([], [{ latex: "y=x^2", label: "cuadratica" }])).toEqual([
      { id: "d0", latex: "y=x^2", color: "#0EA5E9", label: "cuadratica" },
    ]);
  });
});
