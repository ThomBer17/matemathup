/**
 * Definición de planes y límites. Lógica pura, sin side-effects.
 * Punto único de verdad para el modelo freemium — fácil de extender
 * cuando se agreguen tiers o se conecten pagos.
 */

export type Plan = "free" | "premium";

export interface PlanLimits {
  /** Ejercicios de práctica adaptativa respondidos por día. null = ilimitado. */
  adaptivePerDay: number | null;
  /** Tandas IA generadas por día. null = ilimitado. */
  tandaPerDay: number | null;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    adaptivePerDay: 20,
    tandaPerDay: 3,
  },
  premium: {
    adaptivePerDay: null, // ilimitado
    tandaPerDay: null,
  },
};

export type UsageKind = "adaptive" | "tanda";

/** Códigos de error estables para que el cliente abra el paywall (no toast técnico). */
export const FREEMIUM_LIMIT_ERROR: Record<UsageKind, string> = {
  adaptive: "FREEMIUM_LIMIT_ADAPTIVE",
  tanda: "FREEMIUM_LIMIT_TANDA",
};

export function isFreemiumLimitError(message: string): UsageKind | null {
  if (message === FREEMIUM_LIMIT_ERROR.adaptive) return "adaptive";
  if (message === FREEMIUM_LIMIT_ERROR.tanda) return "tanda";
  return null;
}

export function limitFor(plan: Plan, kind: UsageKind): number | null {
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
  return kind === "adaptive" ? limits.adaptivePerDay : limits.tandaPerDay;
}

/** true si todavía está por debajo del límite (o ilimitado). */
export function withinLimit(plan: Plan, kind: UsageKind, usedToday: number): boolean {
  const limit = limitFor(plan, kind);
  if (limit === null) return true; // ilimitado
  return usedToday < limit;
}

export function normalizePlan(value: string | null | undefined): Plan {
  return value === "premium" ? "premium" : "free";
}

/**
 * Inicio del día en horario de Argentina (UTC-3), como ISO UTC.
 * Se usa para contar el uso "de hoy" y para el reset diario.
 */
export function startOfArgentinaDay(now: Date = new Date()): string {
  // Argentina = UTC-3. 00:00 AR == 03:00 UTC.
  const arMs = now.getTime() - 3 * 60 * 60 * 1000;
  const ar = new Date(arMs);
  const y = ar.getUTCFullYear();
  const m = ar.getUTCMonth();
  const d = ar.getUTCDate();
  // 00:00 AR de ese día = 03:00 UTC
  return new Date(Date.UTC(y, m, d, 3, 0, 0, 0)).toISOString();
}
