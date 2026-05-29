/**
 * Sistema de badges. Definidos como reglas puras sobre el estado del usuario.
 * Diseñado para extender fácilmente: agregar un objeto a BADGES y aparece en la UI.
 */

import type { TopicAggregate, OverallStats } from "@/lib/progress/aggregate";

export type BadgeIconName =
  | "flame" | "trophy" | "target" | "zap" | "star"
  | "graduation-cap" | "telescope" | "rocket" | "medal" | "award";

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: BadgeIconName;
  /** Tier visual: cuanto más alto, más brilla. */
  tier: 1 | 2 | 3;
  /** Devuelve `{ earned, progress?: 0-100 }` */
  check: (ctx: BadgeContext) => { earned: boolean; progress?: number };
}

export interface BadgeContext {
  overall: OverallStats;
  aggregates: TopicAggregate[];
  profile: { current_streak: number; longest_streak: number; xp: number; level: number } | null;
  totalTopics: number;
}

export interface EarnedBadge {
  def: BadgeDefinition;
  earned: boolean;
  progress: number; // 0-100
}

function clamp01(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export const BADGES: BadgeDefinition[] = [
  // --- Volumen ---
  {
    id: "first-steps", name: "Primeros pasos", description: "Resolvé 1 ejercicio.",
    icon: "rocket", tier: 1,
    check: ({ overall }) => ({
      earned: overall.totalAttempts >= 1,
      progress: clamp01((overall.totalAttempts / 1) * 100),
    }),
  },
  {
    id: "warmed-up", name: "Calentando motores", description: "Resolvé 10 ejercicios.",
    icon: "zap", tier: 1,
    check: ({ overall }) => ({
      earned: overall.totalAttempts >= 10,
      progress: clamp01((overall.totalAttempts / 10) * 100),
    }),
  },
  {
    id: "centurion", name: "Centurión", description: "Resolvé 100 ejercicios.",
    icon: "medal", tier: 2,
    check: ({ overall }) => ({
      earned: overall.totalAttempts >= 100,
      progress: clamp01((overall.totalAttempts / 100) * 100),
    }),
  },
  {
    id: "marathoner", name: "Maratonista", description: "Resolvé 250 ejercicios.",
    icon: "award", tier: 3,
    check: ({ overall }) => ({
      earned: overall.totalAttempts >= 250,
      progress: clamp01((overall.totalAttempts / 250) * 100),
    }),
  },

  // --- Rachas ---
  {
    id: "streak-3", name: "Constancia", description: "Practicá 3 días seguidos.",
    icon: "flame", tier: 1,
    check: ({ profile }) => ({
      earned: (profile?.longest_streak ?? 0) >= 3,
      progress: clamp01(((profile?.longest_streak ?? 0) / 3) * 100),
    }),
  },
  {
    id: "streak-7", name: "Semana imparable", description: "Practicá 7 días seguidos.",
    icon: "flame", tier: 2,
    check: ({ profile }) => ({
      earned: (profile?.longest_streak ?? 0) >= 7,
      progress: clamp01(((profile?.longest_streak ?? 0) / 7) * 100),
    }),
  },
  {
    id: "streak-30", name: "Mes de hierro", description: "Practicá 30 días seguidos.",
    icon: "flame", tier: 3,
    check: ({ profile }) => ({
      earned: (profile?.longest_streak ?? 0) >= 30,
      progress: clamp01(((profile?.longest_streak ?? 0) / 30) * 100),
    }),
  },

  // --- Dominio ---
  {
    id: "mastered-first", name: "Tema dominado", description: "Llegá a ≥80% en algún tema.",
    icon: "trophy", tier: 1,
    check: ({ aggregates }) => {
      const best = aggregates.reduce((m, a) => Math.max(m, a.accuracy), 0);
      return { earned: best >= 80, progress: clamp01((best / 80) * 100) };
    },
  },
  {
    id: "mastered-three", name: "Triple corona", description: "Dominá 3 temas con ≥80%.",
    icon: "trophy", tier: 2,
    check: ({ aggregates }) => {
      const n = aggregates.filter((a) => a.accuracy >= 80 && a.totalAttempts >= 5).length;
      return { earned: n >= 3, progress: clamp01((n / 3) * 100) };
    },
  },
  {
    id: "scholar", name: "Erudito", description: "Dominá todos los temas con ≥80%.",
    icon: "graduation-cap", tier: 3,
    check: ({ aggregates, totalTopics }) => {
      if (totalTopics === 0) return { earned: false, progress: 0 };
      const n = aggregates.filter((a) => a.accuracy >= 80 && a.totalAttempts >= 5).length;
      return { earned: n >= totalTopics, progress: clamp01((n / totalTopics) * 100) };
    },
  },

  // --- Exploración ---
  {
    id: "explorer", name: "Explorador", description: "Probá 3 temas distintos.",
    icon: "telescope", tier: 1,
    check: ({ overall }) => ({
      earned: overall.topicsTouched >= 3,
      progress: clamp01((overall.topicsTouched / 3) * 100),
    }),
  },
  {
    id: "polymath", name: "Polímata", description: "Probá 5 temas distintos.",
    icon: "telescope", tier: 2,
    check: ({ overall }) => ({
      earned: overall.topicsTouched >= 5,
      progress: clamp01((overall.topicsTouched / 5) * 100),
    }),
  },

  // --- Calidad ---
  {
    id: "sharp", name: "Filoso", description: "Alcanzá 90% de precisión global con ≥20 intentos.",
    icon: "target", tier: 2,
    check: ({ overall }) => {
      if (overall.totalAttempts < 20) {
        return { earned: false, progress: clamp01((overall.totalAttempts / 20) * 100) };
      }
      return { earned: overall.accuracy >= 90, progress: clamp01((overall.accuracy / 90) * 100) };
    },
  },
  {
    id: "rising-star", name: "Estrella en ascenso", description: "Llegá al nivel 5 (500 XP).",
    icon: "star", tier: 2,
    check: ({ profile }) => ({
      earned: (profile?.level ?? 1) >= 5,
      progress: clamp01(((profile?.level ?? 1) / 5) * 100),
    }),
  },
];

export function computeBadges(ctx: BadgeContext): EarnedBadge[] {
  return BADGES.map((def) => {
    const result = def.check(ctx);
    return {
      def,
      earned: result.earned,
      progress: result.progress ?? (result.earned ? 100 : 0),
    };
  });
}

export function badgeStats(badges: EarnedBadge[]): { earned: number; total: number } {
  return { earned: badges.filter((b) => b.earned).length, total: badges.length };
}
