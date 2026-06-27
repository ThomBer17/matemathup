import { trackAnalyticsEvent } from "./events.functions";

/**
 * Catálogo de eventos de producto. Constantes para evitar typos y tener
 * un único lugar donde ver todo lo que se mide.
 */
export const EV = {
  // Auth / funnel
  signup: "signup",
  // Práctica adaptativa
  exerciseGenerated: "exercise_generated",
  exerciseAnswered: "exercise_answered",
  exerciseCorrect: "exercise_correct",
  exerciseIncorrect: "exercise_incorrect",
  hintRequested: "hint_requested",
  explanationOpened: "explanation_opened",
  // Tanda IA
  tandaGenerated: "tanda_generated",
  tandaAnswered: "tanda_answered",
  // Material propio
  materialUploaded: "material_uploaded",
  materialProcessed: "material_processed",
  materialDeleted: "material_deleted",
  materialExerciseGenerated: "material_exercise_generated",
  materialSessionStarted: "material_session_started",
  // Plan de estudio
  planCreated: "plan_created",
  taskStarted: "task_started",
  taskAutoCompleted: "task_auto_completed",
  taskManualCompleted: "task_manual_completed",
  replanUsed: "replan_used",
  // Gamificación
  xpGained: "xp_gained",
  levelUp: "level_up",
  // Feedback
  reportSent: "report_sent",
} as const;

export type EventType = (typeof EV)[keyof typeof EV];

interface TrackOptions {
  entityType?: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Registra un evento de forma ASÍNCRONA. Nunca bloquea ni lanza al caller:
 * dispara una server function fire-and-forget. La RPC server-side fija user_id.
 */
export function track(eventType: EventType, opts: TrackOptions = {}): void {
  try {
    void trackAnalyticsEvent({
      data: {
        eventType,
        entityType: opts.entityType ?? null,
        entityId: opts.entityId ?? null,
        metadata: opts.metadata,
      },
    }).catch(() => {});
  } catch (e) {
    console.debug("[analytics] track error", e);
  }
}
