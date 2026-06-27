/**
 * Definicion de planes y limites. Logica pura, sin side-effects.
 * Punto unico de verdad para el modelo freemium.
 */

export type Plan = "free" | "premium";

export interface PlanLimits {
  /** Ejercicios de practica adaptativa respondidos por dia. null = ilimitado. */
  adaptivePerDay: number | null;
  /** Generaciones IA adaptativas por dia. null = ilimitado. */
  adaptiveGenerationPerDay: number | null;
  /** Tandas IA generadas por dia. null = ilimitado. */
  tandaPerDay: number | null;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    adaptivePerDay: 20,
    adaptiveGenerationPerDay: 20,
    tandaPerDay: 3,
  },
  premium: {
    adaptivePerDay: null,
    adaptiveGenerationPerDay: null,
    tandaPerDay: null,
  },
};

export type UsageKind = "adaptive" | "adaptive_generation" | "tanda";

/** Codigos de error estables para que el cliente abra el paywall. */
export const FREEMIUM_LIMIT_ERROR: Record<UsageKind, string> = {
  adaptive: "FREEMIUM_LIMIT_ADAPTIVE",
  adaptive_generation: "FREEMIUM_LIMIT_ADAPTIVE_GENERATION",
  tanda: "FREEMIUM_LIMIT_TANDA",
};

export function isFreemiumLimitError(message: string): UsageKind | null {
  if (message === FREEMIUM_LIMIT_ERROR.adaptive) return "adaptive";
  if (message === FREEMIUM_LIMIT_ERROR.adaptive_generation) return "adaptive_generation";
  if (message === FREEMIUM_LIMIT_ERROR.tanda) return "tanda";
  return null;
}

export function limitFor(plan: Plan, kind: UsageKind): number | null {
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
  if (kind === "adaptive") return limits.adaptivePerDay;
  if (kind === "adaptive_generation") return limits.adaptiveGenerationPerDay;
  return limits.tandaPerDay;
}

/** true si todavia esta por debajo del limite, o si es ilimitado. */
export function withinLimit(plan: Plan, kind: UsageKind, usedToday: number): boolean {
  const limit = limitFor(plan, kind);
  if (limit === null) return true;
  return usedToday < limit;
}

export function normalizePlan(value: string | null | undefined): Plan {
  return value === "premium" ? "premium" : "free";
}

/**
 * Inicio del dia en horario de Argentina (UTC-3), como ISO UTC.
 * Se usa para contar el uso "de hoy" y para el reset diario.
 */
export function startOfArgentinaDay(now: Date = new Date()): string {
  const arMs = now.getTime() - 3 * 60 * 60 * 1000;
  const ar = new Date(arMs);
  const y = ar.getUTCFullYear();
  const m = ar.getUTCMonth();
  const d = ar.getUTCDate();
  return new Date(Date.UTC(y, m, d, 3, 0, 0, 0)).toISOString();
}
