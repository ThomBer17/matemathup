/**
 * Sanity check numérico: verifica que las afirmaciones aritméticas dentro de
 * una explicación sean correctas, y que las aproximaciones sean coherentes.
 *
 * Detecta:
 *  - cálculos incorrectos:    "1.732 × 3.646 ≈ 4.587"  (real ≈ 6.315)
 *  - aproximaciones absurdas: "0.207 ≈ -2.144"          (signo invertido / magnitud)
 *
 * CONSERVADOR: si no puede evaluar una afirmación con certeza, NO la marca
 * (evita falsos positivos que bloqueen ejercicios válidos). Solo bloquea cuando
 * está seguro de que la cuenta escrita está mal.
 */

import { parseNumericValue } from "./consistency";

export interface SanityResult {
  ok: boolean;
  reason?: string;
}

const APPROX = "≈"; // ≈
const LETTER = /[a-zA-ZáéíóúñÁÉÍÓÚÑ]/;
const NUMERIC = /[0-9.,+\-−*/×·÷()√\s]/; // dígitos, operadores, paréntesis, √

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Extrae la expresión aritmética inmediatamente a la izquierda de un signo =/≈.
 * Camina hacia atrás juntando chars numéricos; se detiene en una letra.
 * Devuelve null si la expresión está truncada (precedida por una letra, ej. sqrt(...)
 * o una variable como 2x+3), porque en ese caso no podemos evaluarla con seguridad.
 */
function extractLeftExpr(text: string, signIndex: number): string | null {
  let i = signIndex - 1;
  while (i >= 0 && text[i] === " ") i--;
  const end = i + 1;
  while (i >= 0) {
    const ch = text[i];
    if (LETTER.test(ch)) break; // variable / palabra → corta
    if (NUMERIC.test(ch)) {
      i--;
      continue;
    }
    break; // otra puntuación → corta
  }
  // Avanzar más allá de espacios iniciales para evaluar el verdadero borde izquierdo.
  let start = i + 1;
  while (start < end && text[start] === " ") start++;
  // Si el char pegado a la izquierda es una letra, la expresión está truncada
  // (sqrt(, sin(, variable como 2x) → descartar para no falsear positivos).
  if (start > 0 && LETTER.test(text[start - 1])) return null;
  const expr = text.slice(start, end).trim();
  return expr || null;
}

/** Lee el número que aparece justo después del signo (admite signo negativo). */
function readNumberAfter(text: string, afterIndex: number): string | null {
  const m = text.slice(afterIndex).match(/^\s*(-?\s*[0-9][0-9.,]*)/);
  return m ? m[1].replace(/\s+/g, "") : null;
}

export function checkNumericSanity(text: string): SanityResult {
  if (!text) return { ok: true };
  try {
    for (let idx = 0; idx < text.length; idx++) {
      const ch = text[idx];
      if (ch !== "=" && ch !== APPROX) continue;

      const left = extractLeftExpr(text, idx);
      const rightRaw = readNumberAfter(text, idx + 1);
      if (!left || !rightRaw) continue;

      const lhs = parseNumericValue(left);
      const rhs = parseNumericValue(rightRaw);
      if (lhs === null || rhs === null) continue;

      const isApprox = ch === APPROX;
      const hasOperator = /[+\-*/×·÷√]/.test(left.replace(/^\s*-/, ""));

      // Para "=" exigimos que haya un operador (evita marcar "x = 5" o triviales).
      // Para "≈" chequeamos incluso números sueltos (caso signo invertido).
      if (!isApprox && !hasOperator) continue;

      // Signo invertido (ej: 0.207 ≈ -2.144)
      if (
        lhs !== 0 &&
        rhs !== 0 &&
        Math.sign(lhs) !== Math.sign(rhs) &&
        Math.abs(lhs - rhs) > 0.1
      ) {
        return {
          ok: false,
          reason: `numeric_sanity_failed: aproximación con signo invertido "${left} ${ch} ${rightRaw}" (real ${round(lhs)})`,
        };
      }

      const diff = Math.abs(lhs - rhs);
      const scale = Math.max(Math.abs(lhs), Math.abs(rhs), 1);
      // Tolerancia: laxa para ≈ (redondeos), estricta para = .
      const tol = isApprox ? Math.max(0.05, 0.03 * scale) : Math.max(1e-4, 1e-3 * scale);
      if (diff > tol) {
        return {
          ok: false,
          reason: `numeric_sanity_failed: cálculo incorrecto "${left} ${ch} ${rightRaw}" (real ${isApprox ? "≈ " : "= "}${round(lhs)})`,
        };
      }
    }
    return { ok: true };
  } catch {
    // Nunca bloqueamos por un bug del checker.
    return { ok: true };
  }
}
