import { Rational } from "@/lib/fraction";
import { canonicalFromRational, radicalDisplay, radicalTerm } from "./format";
import type { CanonicalAnswer } from "./types";

type Operator = "+" | "-" | "*" | "/" | "^";

type Token =
  | { type: "num"; value: string }
  | { type: "id"; value: "sqrt" | "abs" }
  | { type: "op"; value: Operator }
  | { type: "paren"; value: "(" | ")" }
  | { type: "bar"; value: "|" }
  | { type: "eof" };

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

function squareFactor(n: number): { outside: number; inside: number } {
  let outside = 1;
  let inside = n;
  for (let d = 2; d * d <= inside; d++) {
    while (inside % (d * d) === 0) {
      outside *= d;
      inside /= d * d;
    }
  }
  return { outside, inside };
}

function decimalToRationalLiteral(raw: string): Rational {
  const parsed = Rational.parse(raw);
  if (!parsed) throw new Error("invalid_number");
  return parsed;
}

export class ExactValue {
  readonly terms: Map<number, Rational>;

  constructor(terms?: Map<number, Rational>) {
    this.terms = new Map();
    for (const [radicand, coeff] of terms ?? []) {
      if (coeff.num !== 0) this.terms.set(radicand, coeff);
    }
  }

  static rational(value: Rational): ExactValue {
    return new ExactValue(new Map([[1, value]]));
  }

  static radical(radicand: Rational): ExactValue {
    if (radicand.num < 0) throw new Error("negative_radical");
    const numRoot = Math.sqrt(radicand.num);
    const denRoot = Math.sqrt(radicand.den);
    if (Number.isInteger(numRoot) && Number.isInteger(denRoot)) {
      return ExactValue.rational(new Rational(numRoot, denRoot));
    }
    if (radicand.den !== 1) {
      const combined = radicand.num * radicand.den;
      const reduced = squareFactor(combined);
      return new ExactValue(
        new Map([[reduced.inside, new Rational(reduced.outside, radicand.den)]]),
      );
    }
    const reduced = squareFactor(radicand.num);
    return new ExactValue(new Map([[reduced.inside, new Rational(reduced.outside, 1)]]));
  }

  add(other: ExactValue): ExactValue {
    const terms = new Map(this.terms);
    for (const [radicand, coeff] of other.terms) {
      const prev = terms.get(radicand) ?? new Rational(0);
      terms.set(radicand, prev.add(coeff));
    }
    return new ExactValue(terms);
  }

  neg(): ExactValue {
    return new ExactValue(
      new Map([...this.terms].map(([r, c]) => [r, new Rational(-c.num, c.den)])),
    );
  }

  sub(other: ExactValue): ExactValue {
    return this.add(other.neg());
  }

  mul(other: ExactValue): ExactValue {
    let out = new ExactValue();
    for (const [ra, ca] of this.terms) {
      for (const [rb, cb] of other.terms) {
        const coeff = ca.mul(cb);
        const radicand = ra * rb;
        const reduced = squareFactor(radicand);
        const term = new ExactValue(
          new Map([[reduced.inside, coeff.mul(new Rational(reduced.outside))]]),
        );
        out = out.add(term);
      }
    }
    return out;
  }

  div(other: ExactValue): ExactValue {
    const rational = other.asRational();
    if (!rational || rational.num === 0) throw new Error("unsupported_division");
    return this.mul(ExactValue.rational(new Rational(rational.den, rational.num)));
  }

  pow(exp: number): ExactValue {
    if (!Number.isInteger(exp) || exp < 0 || exp > 6) throw new Error("unsupported_power");
    let out = ExactValue.rational(new Rational(1));
    for (let i = 0; i < exp; i++) out = out.mul(this);
    return out;
  }

  abs(): ExactValue {
    const numeric = this.toNumber();
    if (numeric === null) throw new Error("unsupported_abs");
    return numeric < 0 ? this.neg() : this;
  }

  asRational(): Rational | null {
    if (this.terms.size === 0) return new Rational(0);
    if (this.terms.size === 1 && this.terms.has(1)) return this.terms.get(1) ?? null;
    return null;
  }

  toNumber(): number | null {
    let total = 0;
    for (const [radicand, coeff] of this.terms) {
      total += coeff.toNumber() * Math.sqrt(radicand);
    }
    return Number.isFinite(total) ? total : null;
  }

  toCanonicalAnswer(preferred: "integer" | "decimal" | "fraction" | "radical"): CanonicalAnswer {
    const rational = this.asRational();
    if (rational) return canonicalFromRational(rational, preferred);

    const pieces = [...this.terms]
      .sort(([a], [b]) => a - b)
      .map(([radicand, coeff]) => radicalTerm(coeff, radicand));
    const canonical = pieces.join("+").replace(/\+-/g, "-");
    return {
      kind: "radical",
      canonical,
      display: radicalDisplay(canonical),
      typable: canonical,
      numeric: this.toNumber() ?? undefined,
    };
  }
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  for (let i = 0; i < input.length; ) {
    const ch = input[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    const num = input.slice(i).match(/^\d+(?:\.\d+)?/);
    if (num) {
      tokens.push({ type: "num", value: num[0] });
      i += num[0].length;
      continue;
    }
    const id = input.slice(i).match(/^(sqrt|abs)\b/);
    if (id) {
      tokens.push({ type: "id", value: id[1] as "sqrt" | "abs" });
      i += id[1].length;
      continue;
    }
    if ("+-*/^".includes(ch)) {
      tokens.push({ type: "op", value: ch as Operator });
      i++;
      continue;
    }
    if (ch === "(" || ch === ")") {
      tokens.push({ type: "paren", value: ch });
      i++;
      continue;
    }
    if (ch === "|") {
      tokens.push({ type: "bar", value: "|" });
      i++;
      continue;
    }
    throw new Error("invalid_token");
  }
  tokens.push({ type: "eof" });
  return tokens;
}

class Parser {
  private pos = 0;
  constructor(private readonly tokens: Token[]) {}

  parse(): ExactValue {
    const out = this.expression();
    if (this.peek().type !== "eof") throw new Error("unexpected_token");
    return out;
  }

  private peek(): Token {
    return this.tokens[this.pos] ?? { type: "eof" };
  }

  private take(): Token {
    return this.tokens[this.pos++] ?? { type: "eof" };
  }

  private matchOp(op: Operator): boolean {
    const t = this.peek();
    if (t.type === "op" && t.value === op) {
      this.take();
      return true;
    }
    return false;
  }

  private expression(): ExactValue {
    let out = this.term();
    while (true) {
      if (this.matchOp("+")) out = out.add(this.term());
      else if (this.matchOp("-")) out = out.sub(this.term());
      else break;
    }
    return out;
  }

  private term(): ExactValue {
    let out = this.power();
    while (true) {
      if (this.matchOp("*")) out = out.mul(this.power());
      else if (this.matchOp("/")) out = out.div(this.power());
      else break;
    }
    return out;
  }

  private power(): ExactValue {
    let out = this.unary();
    if (this.matchOp("^")) {
      const exp = this.unary().asRational();
      if (!exp || !exp.isInteger()) throw new Error("unsupported_power");
      out = out.pow(exp.num);
    }
    return out;
  }

  private unary(): ExactValue {
    if (this.matchOp("+")) return this.unary();
    if (this.matchOp("-")) return this.unary().neg();
    return this.primary();
  }

  private primary(): ExactValue {
    const t = this.take();
    if (t.type === "num") return ExactValue.rational(decimalToRationalLiteral(t.value));
    if (t.type === "paren" && t.value === "(") {
      const out = this.expression();
      const close = this.take();
      if (close.type !== "paren" || close.value !== ")") throw new Error("missing_paren");
      return out;
    }
    if (t.type === "bar") {
      const out = this.expression().abs();
      const close = this.take();
      if (close.type !== "bar") throw new Error("missing_abs_bar");
      return out;
    }
    if (t.type === "id") {
      const open = this.take();
      if (open.type !== "paren" || open.value !== "(") throw new Error("missing_function_paren");
      const value = this.expression();
      const close = this.take();
      if (close.type !== "paren" || close.value !== ")") throw new Error("missing_function_close");
      if (t.value === "sqrt") {
        const rational = value.asRational();
        if (!rational) throw new Error("unsupported_radical");
        return ExactValue.radical(rational);
      }
      return value.abs();
    }
    throw new Error("unexpected_primary");
  }
}

function insertImplicitMultiplication(expr: string): string {
  return expr.replace(/(\d|\))(?=sqrt|abs|\()/g, "$1*").replace(/(\))(?=\d)/g, "$1*");
}

export function evaluateExactExpression(input: string): ExactValue {
  const expr = insertImplicitMultiplication(input.replace(/\*\*/g, "^"));
  return new Parser(tokenize(expr)).parse();
}

export function arithmeticProfile(expr: string): {
  hasFraction: boolean;
  hasDecimal: boolean;
  hasRadical: boolean;
} {
  return {
    hasFraction: /\/\(?\d/.test(expr),
    hasDecimal: /\d+\.\d+/.test(expr),
    hasRadical: /sqrt\s*\(/.test(expr),
  };
}
