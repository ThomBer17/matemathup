/**
 * Cómputo de métricas de producto sobre un array de eventos. Lógica pura,
 * testeable. El dashboard admin fetchea los eventos y usa estas funciones.
 */

export interface AnalyticsEvent {
  user_id: string | null;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string; // ISO
}

export function filterSince(events: AnalyticsEvent[], sinceISO: string): AnalyticsEvent[] {
  return events.filter((e) => e.created_at >= sinceISO);
}

export function countByType(events: AnalyticsEvent[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of events) out[e.event_type] = (out[e.event_type] ?? 0) + 1;
  return out;
}

export function countOf(events: AnalyticsEvent[], type: string): number {
  let n = 0;
  for (const e of events) if (e.event_type === type) n++;
  return n;
}

export function distinctActiveUsers(events: AnalyticsEvent[]): number {
  const set = new Set<string>();
  for (const e of events) if (e.user_id) set.add(e.user_id);
  return set.size;
}

/** Top valores de una clave del metadata para un tipo de evento (ej. topic más practicado). */
export function topByMetadataKey(
  events: AnalyticsEvent[],
  eventType: string,
  key: string,
  limit = 6,
): { key: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const e of events) {
    if (e.event_type !== eventType) continue;
    const v = e.metadata?.[key];
    if (typeof v === "string" && v) counts[v] = (counts[v] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([k, count]) => ({ key: k, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** Usuarios distintos que hicieron AL MENOS un evento de cada tipo (funnel por etapa). */
export function funnel(
  events: AnalyticsEvent[],
  steps: { label: string; eventTypes: string[] }[],
): { label: string; users: number }[] {
  return steps.map((step) => {
    const set = new Set<string>();
    for (const e of events) {
      if (e.user_id && step.eventTypes.includes(e.event_type)) set.add(e.user_id);
    }
    return { label: step.label, users: set.size };
  });
}

// ---- Retención ----

function dayOf(iso: string): string {
  return iso.slice(0, 10);
}
function addDaysISO(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

export interface Retention {
  d1: number | null;
  d7: number | null;
  d30: number | null;
}

/**
 * Retención Dn: de los usuarios cuya PRIMERA actividad fue hace ≥ n días
 * (elegibles), fracción que tuvo alguna actividad en una fecha ≥ primera + n.
 * Devuelve null si no hay cohorte elegible.
 */
export function retention(events: AnalyticsEvent[], today: string): Retention {
  const byUser = new Map<string, Set<string>>();
  for (const e of events) {
    if (!e.user_id) continue;
    const set = byUser.get(e.user_id) ?? new Set<string>();
    set.add(dayOf(e.created_at));
    byUser.set(e.user_id, set);
  }

  const compute = (n: number): number | null => {
    let eligible = 0;
    let retained = 0;
    for (const days of byUser.values()) {
      const sorted = [...days].sort();
      const first = sorted[0];
      if (addDaysISO(first, n) > today) continue; // no tuvo chance de volver
      eligible++;
      const target = addDaysISO(first, n);
      if (sorted.some((d) => d >= target)) retained++;
    }
    return eligible === 0 ? null : Math.round((retained / eligible) * 100);
  };

  return { d1: compute(1), d7: compute(7), d30: compute(30) };
}
