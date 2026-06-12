/**
 * Repaso espaciado (SRS) estilo Leitner. Lógica pura y testeable.
 *
 * Cada ítem tiene una "caja" (0..5). Al repasarlo:
 *  - "lo entendí"  → sube de caja y la próxima revisión se aleja según el intervalo.
 *  - "todavía no"  → vuelve a la caja 0 y se revisa pronto.
 */

export const MAX_BOX = 5;

/** Días hasta la próxima revisión según la caja (índice = caja). */
const INTERVALS_DAYS = [0, 1, 3, 7, 14, 30];

export function intervalDays(box: number): number {
  const b = Math.max(0, Math.min(MAX_BOX, box));
  return INTERVALS_DAYS[b];
}

const DAY_MS = 24 * 60 * 60 * 1000;

export interface SrsState {
  box: number;
  dueAt: string; // ISO
  reviews: number;
}

/** Aplica el resultado de un repaso y devuelve el nuevo estado. */
export function applyReview(prev: SrsState, knewIt: boolean, now = new Date()): SrsState {
  const box = knewIt ? Math.min(MAX_BOX, prev.box + 1) : 0;
  // Caja 0 → repasar pronto (en ~10 min, mismo día); resto, según intervalo.
  const ms = box === 0 ? 10 * 60 * 1000 : intervalDays(box) * DAY_MS;
  return {
    box,
    dueAt: new Date(now.getTime() + ms).toISOString(),
    reviews: prev.reviews + 1,
  };
}

/** Estado inicial al encolar un ejercicio recién fallado: caja 0, due ahora. */
export function newItem(now = new Date()): SrsState {
  return { box: 0, dueAt: now.toISOString(), reviews: 0 };
}

/** ¿El ítem está vencido (toca repasar)? */
export function isDue(dueAt: string, now = new Date()): boolean {
  return new Date(dueAt).getTime() <= now.getTime();
}

/** Cuántos ítems están vencidos. */
export function countDue(items: { due_at: string }[], now = new Date()): number {
  return items.filter((i) => isDue(i.due_at, now)).length;
}
