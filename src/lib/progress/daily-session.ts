import type { Recommendation } from "./recommendations";

export type DailySessionKind = "diagnostic" | "review" | "practice" | "start";

export interface DailySession {
  kind: DailySessionKind;
  eyebrow: string;
  title: string;
  detail: string;
  primaryLabel: string;
  secondaryLabel: string;
  estimate: string;
  target: {
    to: "/diagnostic" | "/review" | "/topics" | "/topics/$slug";
    params?: { slug: string };
  };
  focus: string[];
}

export function buildDailySession(input: {
  diagnosticCompleted: boolean;
  dueCount: number;
  recommendation: Recommendation | null;
  isNewUser: boolean;
}): DailySession {
  const { diagnosticCompleted, dueCount, recommendation, isNewUser } = input;

  if (!diagnosticCompleted) {
    return {
      kind: "diagnostic",
      eyebrow: "Primero calibramos tu nivel",
      title: "Completá el diagnóstico",
      detail:
        "En pocos ejercicios queda claro por dónde arrancar y qué temas conviene evitar por ahora.",
      primaryLabel: "Empezar diagnóstico",
      secondaryLabel: "Después armamos tu plan",
      estimate: "5 min",
      target: { to: "/diagnostic" },
      focus: ["Nivel inicial", "Temas fuertes", "Temas a reforzar"],
    };
  }

  if (dueCount > 0) {
    return {
      kind: "review",
      eyebrow: "Repaso espaciado",
      title: `Repasá ${dueCount} ejercicio${dueCount === 1 ? "" : "s"} pendiente${dueCount === 1 ? "" : "s"}`,
      detail:
        "Son ejercicios que ya viste y vuelven justo cuando conviene repasarlos para no olvidarlos.",
      primaryLabel: "Repasar ahora",
      secondaryLabel: "Mantiene tu racha activa",
      estimate: dueCount <= 3 ? "6 min" : "12 min",
      target: { to: "/review" },
      focus: ["Errores recientes", "Memoria a largo plazo", "Confianza"],
    };
  }

  if (recommendation) {
    return {
      kind: "practice",
      eyebrow:
        recommendation.reason === "refuerzo"
          ? "Tu mejor próxima práctica"
          : recommendation.reason === "continuar"
            ? "Seguí desde donde dejaste"
            : recommendation.reason === "mantener"
              ? "Sostené el nivel"
              : "Nuevo tema sugerido",
      title: recommendation.headline,
      detail: recommendation.detail,
      primaryLabel: "Practicar ahora",
      secondaryLabel: `Dificultad sugerida ${recommendation.suggestedDifficulty}/5`,
      estimate: "10 min",
      target: { to: "/topics/$slug", params: { slug: recommendation.topic.slug } },
      focus: [recommendation.topic.name, "Explicación paso a paso", "Progreso guardado"],
    };
  }

  return {
    kind: "start",
    eyebrow: isNewUser ? "Primer paso" : "Práctica libre",
    title: isNewUser ? "Elegí tu primera unidad" : "Elegí una unidad para practicar",
    detail:
      "Arrancá con un tema del programa. Después MatemathUp usa tus respuestas para ajustar el próximo paso.",
    primaryLabel: "Ver temas",
    secondaryLabel: "La app se adapta con tus respuestas",
    estimate: "8 min",
    target: { to: "/topics" },
    focus: ["Ejercicios guiados", "Pistas", "Nivel adaptable"],
  };
}
