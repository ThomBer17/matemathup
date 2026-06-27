/**
 * Validación de diversidad pedagógica en una tanda de actividades.
 * Detecta duplicados literales y near-duplicates (Jaccard de tokens > umbral).
 */

import type { Activity } from "./types";

const STOPWORDS = new Set([
  "el",
  "la",
  "los",
  "las",
  "un",
  "una",
  "unos",
  "unas",
  "de",
  "del",
  "en",
  "a",
  "al",
  "y",
  "o",
  "u",
  "que",
  "es",
  "se",
  "su",
  "sus",
  "lo",
  "le",
  "les",
  "para",
  "con",
  "por",
  "como",
  "si",
  "más",
  "menos",
  "este",
  "esta",
  "estos",
  "estas",
  "ese",
  "esa",
  "eso",
  "ser",
  "ha",
  "han",
  "no",
  "sí",
]);

export function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w)),
  );
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const x of a) if (b.has(x)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

const NEAR_DUP_THRESHOLD = 0.6;

/**
 * Devuelve el item de `pool` con mayor similitud Jaccard contra `text`.
 * Útil para chequear si una nueva generación es parecida a ejercicios pasados.
 */
export function mostSimilar(text: string, pool: string[]): { text: string; score: number } | null {
  if (pool.length === 0) return null;
  const t = tokenize(text);
  let best: { text: string; score: number } | null = null;
  for (const candidate of pool) {
    const score = jaccard(t, tokenize(candidate));
    if (!best || score > best.score) best = { text: candidate, score };
  }
  return best;
}

export function validateDiversity(
  activities: Activity[],
): { ok: true } | { ok: false; reason: string } {
  // Duplicados literales en título o enunciado
  const seenTitles = new Set<string>();
  const seenEnunciados = new Set<string>();
  for (const a of activities) {
    const t = a.titulo.trim().toLowerCase();
    const e = a.enunciado.trim().toLowerCase();
    if (seenTitles.has(t)) return { ok: false, reason: `título duplicado "${a.titulo}"` };
    if (seenEnunciados.has(e)) return { ok: false, reason: "enunciado duplicado" };
    seenTitles.add(t);
    seenEnunciados.add(e);
  }

  // Near-duplicates en el enunciado (Jaccard de tokens)
  const tokenSets = activities.map((a) => tokenize(`${a.titulo} ${a.enunciado}`));
  for (let i = 0; i < tokenSets.length; i++) {
    for (let j = i + 1; j < tokenSets.length; j++) {
      const sim = jaccard(tokenSets[i], tokenSets[j]);
      if (sim >= NEAR_DUP_THRESHOLD) {
        return {
          ok: false,
          reason: `actividades ${i + 1} y ${j + 1} son casi idénticas (${Math.round(sim * 100)}% solapamiento)`,
        };
      }
    }
  }

  return { ok: true };
}
