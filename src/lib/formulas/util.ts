import { decimalToFraction, formatNumber } from "@/lib/fraction";
import type { FormulaResult, Step } from "./types";

/** Formatea un número (entero plano o decimal sin ruido flotante). */
export const fmt = formatNumber;

/** Envuelve negativos en paréntesis para sustituciones LaTeX claras. */
export function p(x: number): string {
  return x < 0 ? `(${fmt(x)})` : fmt(x);
}

export function step(label: string, latex: string): Step {
  return { label, latex };
}

/** Representación exacta-o-decimal de UN valor (latex + texto copiable). */
export function valueForms(value: number, exact?: boolean): { latex: string; copy: string } {
  if (exact) {
    const f = decimalToFraction(value);
    if (f) return { latex: f.toLatex(), copy: f.toString() };
  }
  const d = fmt(value);
  return { latex: d, copy: d };
}

/** Resultado estándar para una fórmula que produce UN número. */
export function numberResult(
  steps: Step[],
  value: number,
  opts: { exact?: boolean },
  note?: string,
): FormulaResult {
  const decimal = fmt(value);
  let exactLatex: string | undefined;
  let copyText = decimal;
  if (opts.exact) {
    const f = decimalToFraction(value);
    if (f && f.den !== 1) {
      exactLatex = f.toLatex();
      copyText = f.toString();
    }
  }
  return { steps, decimal, exactLatex, copyText, note };
}

/** Resultado para fórmulas con resultado de la forma k·π. `coeff` es el k numérico. */
export function piResult(
  steps: Step[],
  coeff: number,
  value: number,
  opts: { exact?: boolean },
): FormulaResult {
  const decimal = fmt(value);
  let exactLatex: string | undefined;
  let copyText = decimal;
  if (opts.exact) {
    const f = decimalToFraction(coeff);
    if (f) {
      const c = f.toLatex();
      exactLatex = c === "1" ? "\\pi" : c === "-1" ? "-\\pi" : `${c}\\pi`;
      copyText = (f.toString() === "1" ? "" : `${f.toString()}·`) + "π";
    }
  }
  return { steps, decimal, exactLatex, copyText };
}

export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;
