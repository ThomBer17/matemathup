/**
 * Agregaciones puras sobre intentos. Sin side-effects, fáciles de testear.
 * Diseñado para evolucionar hacia rachas, badges y plan adaptativo sin reescribir.
 */

export type Trend = "mejorando" | "estable" | "refuerzo" | "nuevo";

export interface AttemptRow {
  id: string;
  is_correct: boolean;
  status: "correct" | "partial" | "incorrect" | null;
  source: "adaptive" | "tanda";
  difficulty: number | null;
  topic_id: string | null;
  created_at: string;
}

export interface TopicMeta {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
}

export interface TopicAggregate {
  topic: TopicMeta;
  totalAttempts: number;
  correctAttempts: number;
  partialAttempts: number;
  accuracy: number; // 0-100
  lastAttemptAt: Date | null;
  trend: Trend;
  estimatedLevel: 1 | 2 | 3 | 4 | 5;
}

export interface OverallStats {
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
  activeTopics: number; // temas con ≥3 intentos en últimos 7 días
  topicsTouched: number; // temas con al menos 1 intento
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function recentSlice(attempts: AttemptRow[], windowStartMs: number, windowEndMs: number) {
  return attempts.filter((a) => {
    const t = new Date(a.created_at).getTime();
    return t >= windowStartMs && t < windowEndMs;
  });
}

function accuracyOf(attempts: AttemptRow[]): number {
  if (attempts.length === 0) return 0;
  const c = attempts.filter((a) => a.is_correct).length;
  return c / attempts.length;
}

export function computeTrend(topicAttempts: AttemptRow[]): Trend {
  if (topicAttempts.length < 3) return "nuevo";
  const now = Date.now();
  const recent = recentSlice(topicAttempts, now - WEEK_MS, now);
  if (recent.length < 3) return "estable";

  const prior = recentSlice(topicAttempts, now - 2 * WEEK_MS, now - WEEK_MS);
  const recentAcc = accuracyOf(recent);

  if (prior.length < 3) {
    if (recentAcc < 0.5) return "refuerzo";
    if (recentAcc >= 0.75) return "mejorando";
    return "estable";
  }

  const priorAcc = accuracyOf(prior);
  const delta = recentAcc - priorAcc;
  if (delta > 0.05) return "mejorando";
  if (delta < -0.05 || recentAcc < 0.5) return "refuerzo";
  return "estable";
}

function estimateLevel(accuracy: number, count: number): TopicAggregate["estimatedLevel"] {
  if (count < 3) return 1;
  if (accuracy >= 0.9 && count >= 8) return 5;
  if (accuracy >= 0.8) return 4;
  if (accuracy >= 0.65) return 3;
  if (accuracy >= 0.45) return 2;
  return 1;
}

export function aggregateByTopic(
  attempts: AttemptRow[],
  topicMetaById: Map<string, TopicMeta>,
): TopicAggregate[] {
  const grouped = new Map<string, AttemptRow[]>();
  for (const a of attempts) {
    if (!a.topic_id) continue;
    const arr = grouped.get(a.topic_id) ?? [];
    arr.push(a);
    grouped.set(a.topic_id, arr);
  }

  const result: TopicAggregate[] = [];
  for (const [topicId, list] of grouped) {
    const meta = topicMetaById.get(topicId);
    if (!meta) continue;
    const correct = list.filter((a) => a.is_correct).length;
    const partial = list.filter((a) => a.status === "partial").length;
    const last = list
      .map((a) => new Date(a.created_at))
      .reduce<Date | null>((acc, d) => (!acc || d > acc ? d : acc), null);
    const accuracyPct = list.length ? Math.round((correct / list.length) * 100) : 0;

    result.push({
      topic: meta,
      totalAttempts: list.length,
      correctAttempts: correct,
      partialAttempts: partial,
      accuracy: accuracyPct,
      lastAttemptAt: last,
      trend: computeTrend(list),
      estimatedLevel: estimateLevel(correct / list.length, list.length),
    });
  }

  return result.sort((a, b) => b.totalAttempts - a.totalAttempts);
}

export function computeOverall(attempts: AttemptRow[]): OverallStats {
  const correct = attempts.filter((a) => a.is_correct).length;
  const now = Date.now();
  const recentByTopic = new Map<string, number>();
  for (const a of attempts) {
    if (!a.topic_id) continue;
    if (now - new Date(a.created_at).getTime() > WEEK_MS) continue;
    recentByTopic.set(a.topic_id, (recentByTopic.get(a.topic_id) ?? 0) + 1);
  }
  const activeTopics = Array.from(recentByTopic.values()).filter((n) => n >= 3).length;
  const topicsTouched = new Set(attempts.map((a) => a.topic_id).filter(Boolean)).size;
  return {
    totalAttempts: attempts.length,
    correctAttempts: correct,
    accuracy: attempts.length ? Math.round((correct / attempts.length) * 100) : 0,
    activeTopics,
    topicsTouched,
  };
}

export interface Insight {
  kind: "strength" | "needs-work" | "improving" | "new-topic";
  message: string;
}

export function generateInsights(aggregates: TopicAggregate[]): Insight[] {
  const insights: Insight[] = [];

  const strong = aggregates.find((t) => t.accuracy >= 80 && t.totalAttempts >= 5);
  if (strong) {
    insights.push({ kind: "strength", message: `Mostrás buen dominio en ${strong.topic.name}.` });
  }

  const weak = aggregates.find((t) => t.accuracy < 50 && t.totalAttempts >= 3);
  if (weak) {
    insights.push({ kind: "needs-work", message: `Conviene reforzar ${weak.topic.name}.` });
  }

  const improving = aggregates.find((t) => t.trend === "mejorando");
  if (improving) {
    insights.push({ kind: "improving", message: `Tu precisión mejoró esta semana en ${improving.topic.name}.` });
  }

  const fresh = aggregates.find((t) => t.totalAttempts >= 1 && t.totalAttempts < 5);
  if (fresh && !improving) {
    insights.push({ kind: "new-topic", message: `Estás empezando ${fresh.topic.name} — seguí practicando.` });
  }

  return insights.slice(0, 4);
}
