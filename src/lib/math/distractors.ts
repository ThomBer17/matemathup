import { Rational } from "@/lib/fraction";
import { normalizeAnswerText } from "./format";
import type { CanonicalAnswer } from "./types";

function unique(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = normalizeAnswerText(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function numericDistractors(answer: CanonicalAnswer): string[] {
  const n = answer.numeric;
  if (n == null || !Number.isFinite(n)) return [];
  const base = Math.round(n * 1000) / 1000;
  const candidates = [base + 1, base - 1, -base, base + 0.5, base - 0.5]
    .filter((v) => Math.abs(v - n) > 1e-9)
    .map((v) => (Number.isInteger(v) ? String(v) : String(Number(v.toPrecision(8)))));

  const rat = Rational.parse(answer.typable);
  if (rat && rat.num !== 0 && rat.den !== 1) {
    candidates.push(
      `${rat.den}/${rat.num}`,
      `${-rat.num}/${rat.den}`,
      `${rat.num + rat.den}/${rat.den}`,
    );
  }
  return candidates;
}

function intervalDistractors(answer: CanonicalAnswer): string[] {
  const m = answer.canonical.match(/^([[(])(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)([\])])$/);
  if (!m) return [];
  const lo = Number(m[2]);
  const hi = Number(m[3]);
  return [
    `${m[1]}${lo - 1},${hi}${m[4]}`,
    `${m[1]}${lo},${hi + 1}${m[4]}`,
    `${m[1] === "[" ? "(" : "["}${lo},${hi}${m[4]}`,
  ];
}

export function buildCanonicalOptions(
  answer: CanonicalAnswer,
  previous: string[] | null | undefined,
): string[] {
  const fromPrevious = (previous ?? []).filter(
    (opt) => normalizeAnswerText(opt) !== normalizeAnswerText(answer.typable),
  );
  const generated =
    answer.kind === "interval" ? intervalDistractors(answer) : numericDistractors(answer);
  return unique([answer.typable, ...fromPrevious, ...generated]).slice(0, 4);
}
