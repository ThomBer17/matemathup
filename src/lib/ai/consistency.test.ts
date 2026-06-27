import { describe, it, expect } from "vitest";
import {
  parseNumericValue,
  parseIntervalFromStatement,
  checkIntervalConsistency,
  checkAnswerKeyConsistency,
  checkIntervalAnswerKey,
  checkSolutionSetMatch,
} from "./consistency";

// Símbolos no-ASCII vía codepoint para evitar mangling del transpiler.
const LE = String.fromCharCode(0x2264); // ≤
const CUP = String.fromCharCode(0x222a); // ∪

describe("checkSolutionSetMatch — conjunto-solución vs answer key", () => {
  it("DETECTA el caso reportado: explicación concluye [-2,4) (desigualdad) pero key es unión", () => {
    const explanation =
      `Como |x-1| ${LE} 3, entonces -3 ${LE} x-1 ${LE} 3, o sea -2 ${LE} x ${LE} 4. ` +
      `Intersectando con -2 ${LE} x < 4, por lo tanto -2 ${LE} x < 4.`;
    const r = checkSolutionSetMatch(explanation, `[-5,-1] ${CUP} [1,4]`);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("explanation_answer_mismatch");
  });

  it("DETECTA con la conclusión en corchetes [-2,4) y key unión", () => {
    const r = checkSolutionSetMatch(`Resolviendo, la solución es [-2, 4).`, `[-5,-1] ${CUP} [1,4]`);
    expect(r.ok).toBe(false);
  });

  it("acepta unión válida: explicación concluye la misma unión", () => {
    const r = checkSolutionSetMatch(
      `Por lo tanto la solución es [-5, -1] ${CUP} [1, 4].`,
      `[-5,-1] ${CUP} [1,4]`,
    );
    expect(r.ok).toBe(true);
  });

  it("acepta intervalo simple expresado como desigualdad", () => {
    const r = checkSolutionSetMatch(`Por lo tanto -2 ${LE} x < 4.`, "[-2,4)");
    expect(r.ok).toBe(true);
  });

  it("acepta intervalo simple en corchetes coincidente", () => {
    expect(checkSolutionSetMatch("La solución es [-2, 4).", "[-2,4)").ok).toBe(true);
  });

  it("no bloquea si la key no es un conjunto de intervalos (número)", () => {
    expect(checkSolutionSetMatch("el resultado es [-2, 4)", "1.5").ok).toBe(true);
  });

  it("no bloquea si la explicación no concluye un intervalo", () => {
    expect(
      checkSolutionSetMatch("Aplicamos la definición de valor absoluto.", `[-5,-1] ${CUP} [1,4]`)
        .ok,
    ).toBe(true);
  });

  it("ignora pasos intermedios y mira la conclusión tras el marcador", () => {
    // intermedio [-3,3], conclusión [-2,4] tras 'por lo tanto'
    const r = checkSolutionSetMatch(
      `x-1 en [-3, 3], por lo tanto la solución es [-2, 4].`,
      "[-2,4]",
    );
    expect(r.ok).toBe(true);
  });
});

describe("checkAnswerKeyConsistency — MATH > ANSWER KEY", () => {
  it("detecta key que no coincide con el resultado de la explicación (teorema del resto)", () => {
    const r = checkAnswerKeyConsistency(
      "Por el teorema del resto, evaluamos p(2). El resto es 0.",
      "4",
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("answer_key_mismatch");
  });

  it("acepta cuando la explicación concluye lo mismo que la key", () => {
    expect(checkAnswerKeyConsistency("Evaluamos y el resultado es 0.", "0").ok).toBe(true);
  });

  it("ignora keys no numéricas (algebraicas / texto)", () => {
    expect(checkAnswerKeyConsistency("por lo tanto x = 2", "x = 2").ok).toBe(true);
    expect(checkAnswerKeyConsistency("la respuesta es la opción B", "Opción B").ok).toBe(true);
  });

  it("no marca si la explicación no etiqueta un resultado", () => {
    expect(checkAnswerKeyConsistency("Aplicamos la fórmula y sustituimos.", "5").ok).toBe(true);
  });

  it("tolera redondeo menor", () => {
    expect(checkAnswerKeyConsistency("el resultado es 1.5", "1.5").ok).toBe(true);
  });

  it("NO falsea positivo con coeficientes tras 'entonces' (3x=6, key 2)", () => {
    expect(checkAnswerKeyConsistency("Despejamos: 3x = 6, entonces x = 2.", "2").ok).toBe(true);
  });

  it("acepta resultado final con unidades", () => {
    expect(checkAnswerKeyConsistency("Por lo tanto el resultado es 3 metros.", "3").ok).toBe(true);
  });

  it("no toma el coeficiente '3x' como resultado", () => {
    expect(checkAnswerKeyConsistency("El resultado es 3x + 1.", "5").ok).toBe(true);
  });
});

describe("checkIntervalAnswerKey — intervalos (caso MC más cercana)", () => {
  it("detecta key intervalo distinta al resultado de la explicación", () => {
    const r = checkIntervalAnswerKey("Calculando el rango obtenemos [-10, 17].", "[-7,35]");
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("answer_key_mismatch");
  });

  it("acepta cuando el intervalo coincide", () => {
    expect(checkIntervalAnswerKey("El rango es [-10, 17].", "[-10,17]").ok).toBe(true);
  });

  it("la apertura importa: (3,5) ≠ [3,5]", () => {
    expect(checkIntervalAnswerKey("el conjunto es (3, 5)", "[3,5]").ok).toBe(false);
  });

  it("ignora si la key no es intervalo", () => {
    expect(checkIntervalAnswerKey("el rango es [-10,17]", "5").ok).toBe(true);
  });
});

describe("parseNumericValue", () => {
  it("enteros y decimales", () => {
    expect(parseNumericValue("3")).toBe(3);
    expect(parseNumericValue("-1.5")).toBe(-1.5);
    expect(parseNumericValue("1,5")).toBe(1.5); // coma decimal
  });

  it("fracciones", () => {
    expect(parseNumericValue("3/2")).toBe(1.5);
    expect(parseNumericValue("-3/4")).toBe(-0.75);
  });

  it("expresiones aritméticas simples", () => {
    expect(parseNumericValue("2*(-3/4) + 3")).toBe(1.5);
    expect(parseNumericValue("-1.5 + 3")).toBe(1.5);
  });

  it("raíz cuadrada", () => {
    const sqrt = String.fromCharCode(0x221a); // √ — vía codepoint para evitar mangling del transpiler
    expect(parseNumericValue(`${sqrt}9`)).toBe(3);
    expect(parseNumericValue("sqrt(16)")).toBe(4);
  });

  it("rechaza texto no numérico", () => {
    expect(parseNumericValue("verdadero")).toBeNull();
    expect(parseNumericValue("x = 2")).toBeNull();
    expect(parseNumericValue("opción A")).toBeNull();
    expect(parseNumericValue("")).toBeNull();
  });

  it("rechaza intentos de inyección de código", () => {
    expect(parseNumericValue("process.exit(1)")).toBeNull();
    expect(parseNumericValue("alert(1)")).toBeNull();
  });
});

describe("parseIntervalFromStatement", () => {
  it("requiere la palabra 'intervalo'", () => {
    expect(parseIntervalFromStatement("el par (2, 3)")).toBeNull();
    expect(parseIntervalFromStatement("en el intervalo (2, 3)")).not.toBeNull();
  });

  it("parsea intervalo abierto", () => {
    const iv = parseIntervalFromStatement("expresá el resultado en el intervalo (-2, -1)");
    expect(iv).toEqual({ lo: -2, hi: -1, loOpen: true, hiOpen: true });
  });

  it("parsea intervalo cerrado y semiabierto", () => {
    expect(parseIntervalFromStatement("intervalo [0, 5]")).toMatchObject({
      loOpen: false,
      hiOpen: false,
    });
    expect(parseIntervalFromStatement("intervalo (0, 5]")).toMatchObject({
      loOpen: true,
      hiOpen: false,
    });
  });

  it("no confunde (-3/4) sin coma con un intervalo", () => {
    expect(parseIntervalFromStatement("calculá 2·(-3/4) en el intervalo")).toBeNull();
  });
});

describe("checkIntervalConsistency", () => {
  it("DETECTA el bug reportado: 1.5 no ∈ (-2,-1)", () => {
    const res = checkIntervalConsistency(
      "Calcule 2·(-3/4) + √9 y exprese el resultado en el intervalo (-2,-1).",
      "1.5",
    );
    expect(res.ok).toBe(false);
    expect(res.reason).toContain("no pertenece");
  });

  it("acepta cuando el resultado SÍ pertenece", () => {
    const res = checkIntervalConsistency(
      "Resolvé y verificá que el resultado esté en el intervalo (1, 2).",
      "1.5",
    );
    expect(res.ok).toBe(true);
  });

  it("respeta apertura/cierre: 2 no ∈ (1,2) pero sí ∈ (1,2]", () => {
    expect(checkIntervalConsistency("en el intervalo (1, 2)", "2").ok).toBe(false);
    expect(checkIntervalConsistency("en el intervalo (1, 2]", "2").ok).toBe(true);
  });

  it("no bloquea si no hay intervalo en la consigna", () => {
    expect(checkIntervalConsistency("Calculá 2 + 2", "4").ok).toBe(true);
  });

  it("no bloquea si la answer key no es numérica (no verificable)", () => {
    expect(checkIntervalConsistency("en el intervalo (1, 2)", "x = 3").ok).toBe(true);
  });
});
