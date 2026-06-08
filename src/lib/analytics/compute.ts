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

// ---- Sesiones (derivadas del stream, gap de 30 min) ----

const ANSWER_EVENTS = ["exercise_answered", "tanda_answered"];

export interface Session {
  userId: string;
  start: string;
  end: string;
  durationMin: number;
  exercisesAnswered: number;
  topics: string[];
}

/**
 * Sesioniza los eventos por usuario: una sesión se corta cuando pasan más de
 * `gapMin` minutos sin actividad. La siguiente actividad abre una nueva sesión.
 */
export function sessionize(events: AnalyticsEvent[], gapMin = 30): Session[] {
  const byUser = new Map<string, AnalyticsEvent[]>();
  for (const e of events) {
    if (!e.user_id) continue;
    const arr = byUser.get(e.user_id) ?? [];
    arr.push(e);
    byUser.set(e.user_id, arr);
  }

  const sessions: Session[] = [];
  for (const [userId, evs] of byUser) {
    evs.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
    let cur: { start: string; end: string; answered: number; topics: Set<string> } | null = null;

    const flush = () => {
      if (!cur) return;
      sessions.push({
        userId,
        start: cur.start,
        end: cur.end,
        durationMin: Math.round((Date.parse(cur.end) - Date.parse(cur.start)) / 60000),
        exercisesAnswered: cur.answered,
        topics: [...cur.topics],
      });
    };

    for (const e of evs) {
      const t = Date.parse(e.created_at);
      if (cur && t - Date.parse(cur.end) > gapMin * 60000) {
        flush();
        cur = null;
      }
      if (!cur) cur = { start: e.created_at, end: e.created_at, answered: 0, topics: new Set() };
      cur.end = e.created_at;
      if (ANSWER_EVENTS.includes(e.event_type)) cur.answered++;
      const topic = e.metadata?.topic;
      if (typeof topic === "string" && topic) cur.topics.add(topic);
    }
    flush();
  }
  return sessions;
}

export interface SessionMetrics {
  total: number;
  avgDurationMin: number;
  avgExercises: number;
  avgTopics: number;
  sessionsPerUser: number;
}

export function sessionMetrics(sessions: Session[]): SessionMetrics {
  const total = sessions.length;
  if (total === 0) return { total: 0, avgDurationMin: 0, avgExercises: 0, avgTopics: 0, sessionsPerUser: 0 };
  const users = new Set(sessions.map((s) => s.userId)).size;
  const avg = (f: (s: Session) => number) => sessions.reduce((a, s) => a + f(s), 0) / total;
  return {
    total,
    avgDurationMin: Math.round(avg((s) => s.durationMin)),
    avgExercises: Math.round(avg((s) => s.exercisesAnswered) * 10) / 10,
    avgTopics: Math.round(avg((s) => s.topics.length) * 10) / 10,
    sessionsPerUser: Math.round((total / users) * 10) / 10,
  };
}

// ---- Abandono y precisión por tema ----

export interface TopicAbandon {
  topic: string;
  generated: number;
  completed: number;
  abandonPct: number;
}

/**
 * Abandono por tema: de los ejercicios generados, cuántos NO se respondieron.
 * Solo temas con volumen mínimo (para no rankear ruido). Peor → mejor.
 */
export function abandonmentByTopic(events: AnalyticsEvent[], minGenerated = 3): TopicAbandon[] {
  const gen: Record<string, number> = {};
  const done: Record<string, number> = {};
  for (const e of events) {
    const topic = e.metadata?.topic;
    if (typeof topic !== "string" || !topic) continue;
    if (e.event_type === "exercise_generated") gen[topic] = (gen[topic] ?? 0) + 1;
    else if (e.event_type === "exercise_answered") done[topic] = (done[topic] ?? 0) + 1;
  }
  return Object.entries(gen)
    .filter(([, g]) => g >= minGenerated)
    .map(([topic, generated]) => {
      const completed = Math.min(done[topic] ?? 0, generated);
      const abandonPct = Math.round(((generated - completed) / generated) * 100);
      return { topic, generated, completed, abandonPct };
    })
    .sort((a, b) => b.abandonPct - a.abandonPct);
}

/** Tasa global de abandono (todos los temas juntos). */
export function globalAbandonment(events: AnalyticsEvent[]): number | null {
  let gen = 0;
  let done = 0;
  for (const e of events) {
    if (e.event_type === "exercise_generated") gen++;
    else if (e.event_type === "exercise_answered") done++;
  }
  if (gen === 0) return null;
  return Math.round(((gen - Math.min(done, gen)) / gen) * 100);
}

export interface TopicAccuracy {
  topic: string;
  correct: number;
  total: number;
  accuracyPct: number;
}

export function accuracyByTopic(events: AnalyticsEvent[], minAttempts = 3): TopicAccuracy[] {
  const correct: Record<string, number> = {};
  const total: Record<string, number> = {};
  for (const e of events) {
    const topic = e.metadata?.topic;
    if (typeof topic !== "string" || !topic) continue;
    if (e.event_type === "exercise_correct") { correct[topic] = (correct[topic] ?? 0) + 1; total[topic] = (total[topic] ?? 0) + 1; }
    else if (e.event_type === "exercise_incorrect") { total[topic] = (total[topic] ?? 0) + 1; }
  }
  return Object.entries(total)
    .filter(([, t]) => t >= minAttempts)
    .map(([topic, t]) => ({ topic, correct: correct[topic] ?? 0, total: t, accuracyPct: Math.round(((correct[topic] ?? 0) / t) * 100) }))
    .sort((a, b) => a.accuracyPct - b.accuracyPct);
}

/** Actividad por hora del día (0–23), ajustada a un offset horario (AR = -3). */
export function activityByHour(events: AnalyticsEvent[], tzOffsetHours = -3): number[] {
  const buckets = new Array(24).fill(0);
  for (const e of events) {
    const t = Date.parse(e.created_at);
    if (Number.isNaN(t)) continue;
    const local = new Date(t + tzOffsetHours * 3600 * 1000);
    buckets[local.getUTCHours()]++;
  }
  return buckets;
}

// ---- Alertas automáticas ----

export interface Alert {
  level: "warning";
  text: string;
}

export function buildAlerts(args: {
  abandonment: TopicAbandon[];
  accuracy: TopicAccuracy[];
  featureCounts: { feature: string; label: string; count: number }[];
  lowUsageThreshold?: number;
}): Alert[] {
  const out: Alert[] = [];
  for (const a of args.abandonment) {
    if (a.abandonPct > 50) out.push({ level: "warning", text: `${a.topic} tiene ${a.abandonPct}% de abandono` });
  }
  for (const a of args.accuracy) {
    if (a.accuracyPct < 40) out.push({ level: "warning", text: `${a.topic} tiene ${a.accuracyPct}% de precisión` });
  }
  const th = args.lowUsageThreshold ?? 3;
  for (const f of args.featureCounts) {
    if (f.count < th) out.push({ level: "warning", text: `${f.label} se usa poco (${f.count} usos)` });
  }
  return out;
}
