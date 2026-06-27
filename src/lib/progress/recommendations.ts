/**
 * Plan de estudio adaptativo — funciones puras que deciden "qué practicar ahora".
 * Sin IA: lógica determinista sobre los agregados de progreso.
 */

import type { TopicAggregate, TopicMeta } from "./aggregate";

export type RecommendationReason =
  | "refuerzo" // tema con trend "refuerzo"
  | "continuar" // tema con pocos intentos
  | "mantener" // mejor tema, mantener nivel
  | "explorar"; // sin actividad reciente, sugerir explorar

export interface Recommendation {
  topic: TopicMeta;
  reason: RecommendationReason;
  headline: string;
  detail: string;
  /** Dificultad sugerida 1-5 basada en el estimatedLevel del tema, o default 2 para temas nuevos */
  suggestedDifficulty: number;
}

const ONE_DAY = 24 * 60 * 60 * 1000;

export function recommendNext(
  aggregates: TopicAggregate[],
  allTopics: TopicMeta[],
): Recommendation | null {
  if (allTopics.length === 0) return null;

  // 1) Prioridad: refuerzo. Si hay algún tema con trend="refuerzo" → ese.
  const needsWork = aggregates.find((a) => a.trend === "refuerzo");
  if (needsWork) {
    return {
      topic: needsWork.topic,
      reason: "refuerzo",
      headline: `Reforzar ${needsWork.topic.name}`,
      detail: `Llevás ${needsWork.accuracy}% de aciertos en este tema. Una sesión corta puede recuperar el ritmo.`,
      suggestedDifficulty: Math.max(1, needsWork.estimatedLevel - 1),
    };
  }

  // 2) Continuar: tema empezado con pocos intentos (<5)
  const halfDone = aggregates.find((a) => a.totalAttempts >= 1 && a.totalAttempts < 5);
  if (halfDone) {
    return {
      topic: halfDone.topic,
      reason: "continuar",
      headline: `Seguir con ${halfDone.topic.name}`,
      detail: `Empezaste este tema hace poco. Sumá más práctica para consolidar.`,
      suggestedDifficulty: halfDone.estimatedLevel,
    };
  }

  // 3) Mantener: tema dominado con actividad reciente → seguir afilando
  const dominant = aggregates.find(
    (a) =>
      a.accuracy >= 75 &&
      a.totalAttempts >= 5 &&
      a.lastAttemptAt &&
      Date.now() - a.lastAttemptAt.getTime() < 3 * ONE_DAY,
  );
  if (dominant) {
    return {
      topic: dominant.topic,
      reason: "mantener",
      headline: `Mantener ${dominant.topic.name}`,
      detail: `Vas muy bien (${dominant.accuracy}%). Una sesión sostiene el nivel y desafía con casos nuevos.`,
      suggestedDifficulty: Math.min(5, dominant.estimatedLevel + 1),
    };
  }

  // 4) Explorar: ningún tema activo → sugerir uno no probado, o el primero del programa
  const touchedIds = new Set(aggregates.map((a) => a.topic.id));
  const fresh = allTopics.find((t) => !touchedIds.has(t.id)) ?? allTopics[0];
  return {
    topic: fresh,
    reason: "explorar",
    headline: `Probar ${fresh.name}`,
    detail: `Todavía no exploraste este tema. Empezá con ejercicios básicos.`,
    suggestedDifficulty: 2,
  };
}
