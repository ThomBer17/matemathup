import { describe, it, expect } from "vitest";
import {
  normalizeTrueFalse,
  trueFalseLabel,
  answersEqual,
  displayCorrectAnswer,
} from "./answer-normalize";

describe("normalizeTrueFalse", () => {
  it("normaliza variantes en español a 'true'", () => {
    for (const v of ["Verdadero", "verdadero", "V", "v", "T", "Sí", "sí", "Si", "si"]) {
      expect(normalizeTrueFalse(v)).toBe("true");
    }
  });

  it("normaliza variantes en español a 'false'", () => {
    for (const v of ["Falso", "falso", "F", "f", "No", "no", "N"]) {
      expect(normalizeTrueFalse(v)).toBe("false");
    }
  });

  it("acepta inglés y numérico", () => {
    expect(normalizeTrueFalse("true")).toBe("true");
    expect(normalizeTrueFalse("TRUE")).toBe("true");
    expect(normalizeTrueFalse("1")).toBe("true");
    expect(normalizeTrueFalse("0")).toBe("false");
    expect(normalizeTrueFalse("yes")).toBe("true");
  });

  it("ignora espacios y punto final", () => {
    expect(normalizeTrueFalse("  Verdadero  ")).toBe("true");
    expect(normalizeTrueFalse("Falso.")).toBe("false");
  });

  it("devuelve null para valores no reconocidos", () => {
    expect(normalizeTrueFalse("tal vez")).toBeNull();
    expect(normalizeTrueFalse("")).toBeNull();
    expect(normalizeTrueFalse("42")).toBeNull();
  });
});

describe("trueFalseLabel", () => {
  it("siempre devuelve español capitalizado", () => {
    expect(trueFalseLabel("true")).toBe("Verdadero");
    expect(trueFalseLabel("false")).toBe("Falso");
  });
});

describe("answersEqual", () => {
  it("true_false: matchea variantes cross-idioma (el bug original)", () => {
    expect(answersEqual("true", "Verdadero", "true_false")).toBe(true);
    expect(answersEqual("verdadero", "V", "true_false")).toBe(true);
    expect(answersEqual("false", "Falso", "true_false")).toBe(true);
    expect(answersEqual("Verdadero", "Falso", "true_false")).toBe(false);
  });

  it("multiple_choice: case + espacios insensible", () => {
    expect(answersEqual("Opción A", "opción a", "multiple_choice")).toBe(true);
    expect(answersEqual("  3/4  ", "3/4", "multiple_choice")).toBe(true);
    expect(answersEqual("3/4", "4/3", "multiple_choice")).toBe(false);
  });

  it("open: comparación normalizada de espacios y case", () => {
    expect(answersEqual("x = 2", "x = 2", "open")).toBe(true);
    expect(answersEqual("X = 2", "x = 2", "open")).toBe(true);
  });

  it("open: equivalencia numérica (forma distinta, mismo valor)", () => {
    expect(answersEqual("0.5", "1/2", "open")).toBe(true);
    expect(answersEqual("2", "2.0", "open")).toBe(true);
    expect(answersEqual("3/2", "1.5", "open")).toBe(true);
    expect(answersEqual("-0.75", "-3/4", "open")).toBe(true);
  });

  it("open: valores numéricos distintos siguen incorrectos", () => {
    expect(answersEqual("0.5", "0.6", "open")).toBe(false);
    expect(answersEqual("2", "3", "open")).toBe(false);
  });

  it("multiple_choice: equivalencia numérica matchea opción en otra forma", () => {
    expect(answersEqual("1/2", "0.5", "multiple_choice")).toBe(true);
  });
});

describe("displayCorrectAnswer", () => {
  it("normaliza T/F al label canónico, no al texto crudo del modelo", () => {
    expect(displayCorrectAnswer("V", "true_false")).toBe("Verdadero");
    expect(displayCorrectAnswer("true", "true_false")).toBe("Verdadero");
    expect(displayCorrectAnswer("Falso.", "true_false")).toBe("Falso");
  });

  it("para multiple_choice y open devuelve el texto crudo", () => {
    expect(displayCorrectAnswer("3/4", "multiple_choice")).toBe("3/4");
    expect(displayCorrectAnswer("x = 2", "open")).toBe("x = 2");
  });
});
