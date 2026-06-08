/**
 * Generación de Plan de Estudio Inteligente. Lógica pura, sin IA ni requests.
 *
 * Distribuye los días de estudio entre los temas según el dominio actual
 * (temas débiles → más días), reserva repaso general + simulacro cerca del examen,
 * y puede replanificar si el alumno saltea días.
 */

export interface StudyTopicInput {
  slug: string;
  name: string;
  mastery: number; // 0–100
}

export interface GeneratePlanInput {
  today: string; // 'YYYY-MM-DD'
  examDate: string; // 'YYYY-MM-DD'
  dailyMinutes: number;
  topics: StudyTopicInput[];
}

export type TaskKind = "practice" | "review" | "general_review" | "simulacro";

export interface PlanTask {
  date: string; // 'YYYY-MM-DD'
  topicSlug: string | null;
  topicName: string | null;
  kind: TaskKind;
  title: string;
  objective: string;
  minutes: number;
  orderIndex: number;
}

// ---- utilidades de fecha (UTC para evitar líos de timezone) ----

function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
export function addDays(s: string, n: number): string {
  const d = parseDate(s);
  d.setUTCDate(d.getUTCDate() + n);
  return fmtDate(d);
}
export function daysBetween(from: string, to: string): number {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86400000);
}
/** Días que faltan para el examen (≥ 0). */
export function daysUntil(examDate: string, today: string): number {
  return Math.max(0, daysBetween(today, examDate));
}

/** Fecha de hoy en horario de Argentina (UTC-3), como 'YYYY-MM-DD'. */
export function todayArgentina(): string {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Días de estudio disponibles: desde hoy hasta el día anterior al examen. */
function studyDates(today: string, examDate: string): string[] {
  const out: string[] = [];
  let cur = today;
  while (daysBetween(cur, examDate) > 0) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function exerciseCount(minutes: number): number {
  return clamp(Math.round(minutes / 3), 5, 25);
}

/**
 * Asigna `n` slots de práctica a los temas, ponderando por debilidad
 * (menor dominio → más slots), e intercala para no agrupar el mismo tema.
 */
export function buildTopicSequence(topics: StudyTopicInput[], n: number): StudyTopicInput[] {
  if (topics.length === 0 || n <= 0) return [];

  const weights = topics.map((t) => Math.max(10, 100 - clamp(t.mastery, 0, 100)));
  const total = weights.reduce((a, b) => a + b, 0);

  const raw = weights.map((w) => (w / total) * n);
  const counts = raw.map((r) => Math.floor(r));
  let assigned = counts.reduce((a, b) => a + b, 0);

  // Reparte el resto por mayor fracción (largest remainder).
  const rem = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac);
  let k = 0;
  while (assigned < n) {
    counts[rem[k % rem.length].i]++;
    assigned++;
    k++;
  }

  // Si hay días para todos, garantizamos ≥1 a cada tema (los fuertes igual repasan).
  if (n >= topics.length) {
    for (let i = 0; i < counts.length; i++) {
      if (counts[i] === 0) {
        const maxIdx = counts.indexOf(Math.max(...counts));
        counts[maxIdx]--;
        counts[i]++;
      }
    }
  }

  // Intercalado: en cada paso elegimos el tema con más slots restantes.
  const remaining = counts.slice();
  const seq: StudyTopicInput[] = [];
  for (let s = 0; s < n; s++) {
    let best = 0;
    for (let i = 1; i < topics.length; i++) {
      if (remaining[i] > remaining[best]) best = i;
    }
    if (remaining[best] <= 0) break;
    seq.push(topics[best]);
    remaining[best]--;
  }
  return seq;
}

function practiceTask(date: string, topic: StudyTopicInput, order: number, minutes: number): PlanTask {
  const weak = topic.mastery < 60;
  return {
    date,
    topicSlug: topic.slug,
    topicName: topic.name,
    kind: weak ? "practice" : "review",
    title: `Resolver ${exerciseCount(minutes)} ejercicios de ${topic.name}`,
    objective: weak
      ? `Reforzar ${topic.name} (dominio ${Math.round(topic.mastery)}%)`
      : `Repasar ${topic.name} y mantener el nivel`,
    minutes,
    orderIndex: order,
  };
}

function generalReviewTask(date: string, order: number, minutes: number): PlanTask {
  return {
    date,
    topicSlug: null,
    topicName: null,
    kind: "general_review",
    title: "Repaso general",
    objective: "Repasá los temas que más te cuestan antes del examen.",
    minutes,
    orderIndex: order,
  };
}

function simulacroTask(date: string, order: number, minutes: number): PlanTask {
  return {
    date,
    topicSlug: null,
    topicName: null,
    kind: "simulacro",
    title: "Simulacro de examen",
    objective: "Resolvé ejercicios variados de todos los temas, como en el examen.",
    minutes: Math.max(minutes, 30),
    orderIndex: order,
  };
}

export function generatePlan(input: GeneratePlanInput): PlanTask[] {
  const { today, examDate, dailyMinutes, topics } = input;
  const dates = studyDates(today, examDate);
  let order = 0;

  // Examen hoy o ya pasado → un simulacro hoy.
  if (dates.length === 0) {
    return [simulacroTask(today, order++, dailyMinutes)];
  }

  const lastDate = dates[dates.length - 1];
  const reserved = new Set<string>([lastDate]); // simulacro el último día
  let reviewDate: string | null = null;
  if (dates.length >= 4) {
    reviewDate = dates[dates.length - 2]; // repaso general el anteúltimo
    reserved.add(reviewDate);
  }

  const practiceDates = dates.filter((d) => !reserved.has(d));
  const tasks: PlanTask[] = [];

  if (topics.length > 0 && practiceDates.length > 0) {
    const seq = buildTopicSequence(topics, practiceDates.length);
    practiceDates.forEach((date, i) => {
      const t = seq[i] ?? topics[0];
      tasks.push(practiceTask(date, t, order++, dailyMinutes));
    });
  }
  if (reviewDate) tasks.push(generalReviewTask(reviewDate, order++, dailyMinutes));
  tasks.push(simulacroTask(lastDate, order++, dailyMinutes));

  return tasks.sort((a, b) =>
    a.date === b.date ? a.orderIndex - b.orderIndex : a.date < b.date ? -1 : 1,
  );
}

export function computePlanProgress(tasks: { status: string }[]): {
  done: number;
  total: number;
  pct: number;
} {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

/**
 * Replanificación: las tareas no completadas se redistribuyen en los días que
 * quedan hasta el examen (empezando hoy). Las completadas no se tocan.
 * Devuelve los cambios de fecha a aplicar { id → nueva fecha }.
 */
export function replanTasks(
  tasks: { id: string; status: string; orderIndex: number }[],
  today: string,
  examDate: string,
): { id: string; date: string }[] {
  const pending = tasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => a.orderIndex - b.orderIndex);
  if (pending.length === 0) return [];

  const dates = studyDates(today, examDate);
  if (dates.length === 0) {
    // Examen hoy/pasado → todo a hoy.
    return pending.map((t) => ({ id: t.id, date: today }));
  }
  return pending.map((t, i) => ({ id: t.id, date: dates[i % dates.length] }));
}

/** Catálogo de temas para el wizard (slug ↔ nombre), alineado con el curriculum. */
export const STUDY_TOPICS: { slug: string; name: string }[] = [
  { slug: "numeros-reales", name: "Números Reales" },
  { slug: "algebra", name: "Álgebra" },
  { slug: "funciones", name: "Funciones" },
  { slug: "trigonometria", name: "Trigonometría" },
  { slug: "logaritmos", name: "Logaritmos" },
  { slug: "sistemas-de-ecuaciones", name: "Sistemas de Ecuaciones" },
  { slug: "geometria", name: "Geometría" },
  { slug: "limites", name: "Límites" },
  { slug: "derivadas", name: "Derivadas" },
  { slug: "integrales", name: "Integrales" },
  { slug: "probabilidad", name: "Probabilidad y Estadística" },
];
