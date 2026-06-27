import { Rational } from "@/lib/fraction";
import type { CanonicalAnswer, CanonicalAnswerKind } from "./types";

const SQRT = String.fromCharCode(0x221a);

export function canonicalFromRational(
  value: Rational,
  preferred: CanonicalAnswerKind,
): CanonicalAnswer {
  if (preferred === "decimal" && !value.isInteger()) {
    const decimal = formatDecimal(value.toNumber());
    return {
      kind: "decimal",
      canonical: decimal,
      display: decimal,
      typable: decimal,
      numeric: value.toNumber(),
    };
  }
  const canonical = value.toString();
  const kind: CanonicalAnswerKind = value.isInteger() ? "integer" : "fraction";
  const display =
    value.den === 2 && Math.abs(value.num) === 1 ? `${value.num < 0 ? "-" : ""}1/2` : canonical;
  return {
    kind,
    canonical,
    display,
    typable: canonical,
    numeric: value.toNumber(),
  };
}

export function canonicalFromDecimal(value: number): CanonicalAnswer {
  const canonical = formatDecimal(value);
  return {
    kind: Number.isInteger(value) ? "integer" : "decimal",
    canonical,
    display: canonical,
    typable: canonical,
    numeric: value,
  };
}

export function radicalTerm(coeff: Rational, radicand: number): string {
  const root = `sqrt(${radicand})`;
  if (coeff.num === 1 && coeff.den === 1) return root;
  if (coeff.num === -1 && coeff.den === 1) return `-${root}`;
  return `${coeff.toString()}*${root}`;
}

export function radicalDisplay(canonical: string): string {
  return canonical
    .replace(/\*/g, "")
    .replace(/sqrt\((\d+)\)/g, `${SQRT}$1`)
    .replace(/\+-/g, "-");
}

export function formatDecimal(value: number): string {
  if (!Number.isFinite(value)) throw new Error("invalid_number");
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toPrecision(12))).replace(/\.0+$/g, "");
}

export function normalizeAnswerText(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\\[dt]?frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, "$1/$2")
    .replace(/\\sqrt\s*\{([^{}]+)\}/g, "sqrt($1)")
    .replace(/\${1,2}/g, "")
    .replace(/\s+/g, "")
    .replaceAll(String.fromCharCode(0x2212), "-")
    .replaceAll(String.fromCharCode(0x00d7), "*")
    .replaceAll(String.fromCharCode(0x00b7), "*")
    .replaceAll(String.fromCharCode(0x00f7), "/")
    .replaceAll(String.fromCharCode(0x221a), "sqrt")
    .replace(/\bsqrt\s*(\d+)/g, "sqrt($1)")
    .replace(/^\((.*)\)$/g, "$1");
}
