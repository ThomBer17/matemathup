import { describe, it, expect } from "vitest";
import { hasMathExpression, checkRequiredExpression, validateStructure } from "./structural";

describe("hasMathExpression", () => {
  it("detecta expresiones matemáticas", () => {
    expect(hasMathExpression("x^2 - 4")).toBe(true);
    expect(hasMathExpression("2x + 3 = 7")).toBe(true);
    expect(hasMathExpression("sqrt(3)")).toBe(true);
    expect(hasMathExpression("3/4")).toBe(true);
    expect(hasMathExpression("a + b")).toBe(true);
  });
  it("texto sin expresión", () => {
    expect(hasMathExpression("Factoriza el siguiente polinomio")).toBe(false);
    expect(hasMathExpression("Elegí la opción correcta")).toBe(false);
  });
});

describe("checkRequiredExpression", () => {
  it("rechaza 'Factoriza...' sin polinomio", () => {
    const r = checkRequiredExpression("Factoriza el siguiente polinomio y elegí la forma correcta.");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("missing_expression");
  });
  it("acepta 'Factoriza x^2-4'", () => {
    expect(checkRequiredExpression("Factoriza x^2 - 4.").ok).toBe(true);
  });
  it("rechaza 'Resolvé la ecuación' sin ecuación", () => {
    expect(checkRequiredExpression("Resolvé la siguiente ecuación.").ok).toBe(false);
  });
  it("acepta 'Resolvé 2x+3=7'", () => {
    expect(checkRequiredExpression("Resolvé la ecuación 2x + 3 = 7.").ok).toBe(true);
  });
  it("no exige expresión a consignas auto-contenidas", () => {
    expect(checkRequiredExpression("Calculá el área de un triángulo de base 5 y altura 4.").ok).toBe(true);
    expect(checkRequiredExpression("Clasificá si pi es racional o irracional.").ok).toBe(true);
  });
});

describe("validateStructure", () => {
  it("rechaza enunciado vacío/corto", () => {
    expect(validateStructure({ statement: "Hola", type: "open", correct_answer: "x" }).ok).toBe(false);
  });
  it("rechaza MC sin opciones suficientes", () => {
    const r = validateStructure({
      statement: "¿Cuánto es 2 + 2 en este caso particular?",
      type: "multiple_choice",
      options: ["4"],
      correct_answer: "4",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("missing_options");
  });
  it("rechaza sin answer key", () => {
    const r = validateStructure({
      statement: "¿Cuánto es 2 + 2 en este caso particular?",
      type: "open",
      correct_answer: "",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("missing_answer_key");
  });
  it("rechaza MC 'Factoriza' sin polinomio", () => {
    const r = validateStructure({
      statement: "Factoriza el siguiente polinomio y elegí la forma correcta.",
      type: "multiple_choice",
      options: ["(x+2)(x-2)", "(x+1)(x-1)", "(x+4)(x-1)", "x(x-4)"],
      correct_answer: "(x+2)(x-2)",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("missing_expression");
  });
  it("acepta MC bien formado con polinomio", () => {
    const r = validateStructure({
      statement: "Factoriza el polinomio x^2 - 4 y elegí la forma correcta.",
      type: "multiple_choice",
      options: ["(x+2)(x-2)", "(x+1)(x-1)", "(x+4)(x-1)", "x(x-4)"],
      correct_answer: "(x+2)(x-2)",
    });
    expect(r.ok).toBe(true);
  });
  it("rechaza true_false sin afirmación", () => {
    expect(validateStructure({ statement: "¿Verdadero o falso?", type: "true_false", correct_answer: "Verdadero" }).ok).toBe(false);
  });
  it("acepta true_false con afirmación", () => {
    expect(
      validateStructure({
        statement: "Verdadero o falso: todo número entero es racional.",
        type: "true_false",
        correct_answer: "Verdadero",
      }).ok,
    ).toBe(true);
  });
});
