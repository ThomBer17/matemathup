import { describe, it, expect } from "vitest";
import { classifyMaterial } from "./classify";

describe("classifyMaterial", () => {
  it("clasifica trigonometría", () => {
    const r = classifyMaterial(
      "Guía de trigonometría: calcular el seno, coseno y tangente de un ángulo. Teorema del seno y la hipotenusa del triángulo rectángulo.",
    );
    expect(r.topic).toBe("Trigonometría");
    expect(r.confidence).toBeGreaterThan(0.5);
  });

  it("clasifica álgebra", () => {
    const r = classifyMaterial(
      "Factorizar el polinomio usando factor común y diferencia de cuadrados. Trinomio cuadrado perfecto y método de Ruffini.",
    );
    expect(r.topic).toBe("Álgebra");
  });

  it("clasifica derivadas", () => {
    const r = classifyMaterial(
      "La derivada y la recta tangente. Regla de la cadena y razón de cambio. Punto crítico y monotonía.",
    );
    expect(r.topic).toBe("Derivadas");
  });

  it("clasifica probabilidad", () => {
    const r = classifyMaterial(
      "Probabilidad de un suceso, espacio muestral, combinatoria, permutación y combinación. Media aritmética y varianza.",
    );
    expect(r.topic).toBe("Probabilidad y Estadística");
  });

  it("'Sin clasificar' si no hay señal suficiente", () => {
    expect(classifyMaterial("Hola, este es un texto cualquiera sin matemática.").topic).toBeNull();
    expect(classifyMaterial("").topic).toBeNull();
    expect(classifyMaterial("solo un tema mencionado: integral").topic).toBeNull(); // 1 hit < MIN
  });

  it("es robusto a acentos y mayúsculas", () => {
    expect(classifyMaterial("LÍMITE, ASÍNTOTA y CONTINUIDAD; el límite lateral.").topic).toBe("Límites");
  });
});
