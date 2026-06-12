/**
 * Meta diaria de ejercicios. Lógica pura.
 * Cuenta los intentos de HOY (horario Argentina) y los compara con la meta.
 */
import { toArgentinaDate, todayArgentina } from "@/lib/study/plan";

export const DEFAULT_DAILY_GOAL = 3;
export const GOAL_OPTIONS = [3, 5, 10];

/** Cuántos ejercicios respondió hoy (cualquier fuente). */
export function countToday(
  attempts: { created_at: string }[],
  today: string = todayArgentina(),
): number {
  return attempts.filter((a) => toArgentinaDate(a.created_at) === today).length;
}

export interface GoalProgress {
  done: number;
  goal: number;
  remaining: number;
  pct: number;
  met: boolean;
}

export function goalProgress(doneToday: number, goal: number): GoalProgress {
  const g = Math.max(1, goal);
  const met = doneToday >= g;
  return {
    done: doneToday,
    goal: g,
    remaining: Math.max(0, g - doneToday),
    pct: Math.min(100, Math.round((doneToday / g) * 100)),
    met,
  };
}

/** Mensaje motivador según el progreso. */
export function goalMessage(p: GoalProgress): string {
  if (p.met) return "¡Meta diaria cumplida! 🎉 Seguí sumando si querés.";
  if (p.done === 0) return `Arrancá tu día: ${p.goal} ejercicios para cumplir la meta.`;
  return `Te falta${p.remaining === 1 ? "" : "n"} ${p.remaining} para tu meta de hoy. ¡Dale!`;
}

/**
 * ¿Mostrar el recordatorio de racha? Cuando todavía no cumplió la meta y se está
 * haciendo tarde (después de cierta hora local), para no perder la racha.
 */
export function shouldNudgeStreak(p: GoalProgress, hourLocal: number): boolean {
  return !p.met && hourLocal >= 18;
}

/** Hora local de Argentina (0-23). */
export function hourArgentina(now: number = Date.now()): number {
  return new Date(now - 3 * 60 * 60 * 1000).getUTCHours();
}
