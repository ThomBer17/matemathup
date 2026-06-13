/**
 * Aritmética de fracciones exactas para la Calculadora y la herramienta Fórmulas.
 *
 * - `Rational`: fracción num/den con enteros, siempre reducida y con el signo en num.
 *   Para cómputos donde el resultado es racional exacto (pendiente, punto medio, media).
 * - `decimalToFraction`: aproxima un decimal a fracción por fracciones continuas
 *   (devuelve null si es esencialmente irracional). Para mostrar √2, π, etc. como
 *   "≈ fracción" sin denominadores gigantes.
 */

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}

export class Rational {
  readonly num: number;
  readonly den: number;

  constructor(num: number, den = 1) {
    if (den === 0) throw new Error("Denominador 0");
    if (!Number.isInteger(num) || !Number.isInteger(den)) {
      throw new Error("Rational requiere enteros");
    }
    const sign = den < 0 ? -1 : 1;
    const g = gcd(num, den);
    this.num = (sign * num) / g;
    this.den = Math.abs(den) / g;
  }

  /** Crea un Rational desde un string "3/4", "1.5" o "-2". null si no es racional simple. */
  static parse(raw: string): Rational | null {
    const s = raw.trim();
    if (!s) return null;
    const frac = s.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
    if (frac) {
      const den = Number(frac[2]);
      if (den === 0) return null;
      return new Rational(Number(frac[1]), den);
    }
    const dec = s.match(/^(-?)(\d*)(?:[.,](\d+))?$/);
    if (dec && (dec[2] || dec[3])) {
      const sign = dec[1] === "-" ? -1 : 1;
      const intPart = dec[2] || "0";
      const fracPart = dec[3] || "";
      const den = Math.pow(10, fracPart.length);
      const num = Number(intPart + fracPart);
      return new Rational(sign * num, den);
    }
    return null;
  }

  add(o: Rational): Rational {
    return new Rational(this.num * o.den + o.num * this.den, this.den * o.den);
  }
  sub(o: Rational): Rational {
    return new Rational(this.num * o.den - o.num * this.den, this.den * o.den);
  }
  mul(o: Rational): Rational {
    return new Rational(this.num * o.num, this.den * o.den);
  }
  div(o: Rational): Rational {
    if (o.num === 0) throw new Error("División por cero");
    return new Rational(this.num * o.den, this.den * o.num);
  }

  isInteger(): boolean {
    return this.den === 1;
  }
  toNumber(): number {
    return this.num / this.den;
  }
  /** "3/4", "-2", "5". */
  toString(): string {
    return this.den === 1 ? String(this.num) : `${this.num}/${this.den}`;
  }
  /** LaTeX: entero plano o \frac{}{} (con signo afuera). */
  toLatex(): string {
    if (this.den === 1) return String(this.num);
    const sign = this.num < 0 ? "-" : "";
    return `${sign}\\frac{${Math.abs(this.num)}}{${this.den}}`;
  }
}

/**
 * Aproxima un decimal a fracción por fracciones continuas. null si es irracional
 * (sin fracción "limpia" con denominador razonable).
 */
export function decimalToFraction(value: number): Rational | null {
  if (!isFinite(value)) return null;
  if (Number.isInteger(value)) return new Rational(value, 1);
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  const maxDen = 10000;
  let prevNum = 0,
    num = 1,
    prevDen = 1,
    den = 0;
  let rem = x;
  for (let i = 0; i < 64; i++) {
    const intPart = Math.floor(rem);
    const nextNum = intPart * num + prevNum;
    const nextDen = intPart * den + prevDen;
    if (nextDen > maxDen) break;
    prevNum = num;
    num = nextNum;
    prevDen = den;
    den = nextDen;
    if (Math.abs(x - num / den) < 1e-12) break;
    const frac = rem - intPart;
    if (frac < 1e-12) break;
    rem = 1 / frac;
  }
  if (den === 0 || Math.abs(x - num / den) > 1e-9) return null;
  return new Rational(sign * num, den);
}

/** Formatea un número: entero plano o decimal sin ruido de punto flotante (10 cifras). */
export function formatNumber(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toPrecision(10)));
}
