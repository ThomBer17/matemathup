import { describe, it, expect } from "vitest";
import { Rational, decimalToFraction, formatNumber } from "./fraction";

describe("Rational", () => {
  it("reduce y normaliza el signo", () => {
    expect(new Rational(2, 4).toString()).toBe("1/2");
    expect(new Rational(3, -6).toString()).toBe("-1/2");
    expect(new Rational(6, 3).toString()).toBe("2");
  });

  it("aritmética exacta", () => {
    expect(new Rational(1, 2).add(new Rational(1, 3)).toString()).toBe("5/6");
    expect(new Rational(3, 4).sub(new Rational(1, 4)).toString()).toBe("1/2");
    expect(new Rational(2, 3).mul(new Rational(3, 4)).toString()).toBe("1/2");
    expect(new Rational(1, 2).div(new Rational(1, 4)).toString()).toBe("2");
  });

  it("parse de strings", () => {
    expect(Rational.parse("3/4")!.toString()).toBe("3/4");
    expect(Rational.parse("1.5")!.toString()).toBe("3/2");
    expect(Rational.parse("-2")!.toString()).toBe("-2");
    expect(Rational.parse("abc")).toBeNull();
    expect(Rational.parse("1/0")).toBeNull();
  });

  it("toLatex", () => {
    expect(new Rational(3, 4).toLatex()).toBe("\\frac{3}{4}");
    expect(new Rational(-3, 4).toLatex()).toBe("-\\frac{3}{4}");
    expect(new Rational(5, 1).toLatex()).toBe("5");
  });
});

describe("decimalToFraction", () => {
  it("reconoce fracciones limpias", () => {
    expect(decimalToFraction(0.5)!.toString()).toBe("1/2");
    expect(decimalToFraction(0.75)!.toString()).toBe("3/4");
    expect(decimalToFraction(3)!.toString()).toBe("3");
  });
  it("devuelve null para irracionales", () => {
    expect(decimalToFraction(Math.sqrt(2))).toBeNull();
    expect(decimalToFraction(Math.PI)).toBeNull();
  });
});

describe("formatNumber", () => {
  it("entero plano y recorte de ruido flotante", () => {
    expect(formatNumber(4)).toBe("4");
    expect(formatNumber(0.1 + 0.2)).toBe("0.3");
  });
});
