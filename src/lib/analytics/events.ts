import { supabase } from "@/integrations/supabase/client";

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
  taskCompleted: "task_completed",
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
 * lee la sesión local (sin red) y dispara el insert fire-and-forget.
 */
export function track(eventType: EventType, opts: TrackOptions = {}): void {
  try {
    void supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id;
      if (!uid) return; // sin sesión no registramos (RLS lo exigiría igual)
      void supabase
        .from("analytics_events")
        .insert({
          user_id: uid,
          event_type: eventType,
          entity_type: opts.entityType ?? null,
          entity_id: opts.entityId ?? null,
          metadata: opts.metadata ? JSON.parse(JSON.stringify(opts.metadata)) : {},
        })
        .then(({ error }) => {
          if (error) console.debug("[analytics] insert falló:", error.message);
        });
    });
  } catch (e) {
    console.debug("[analytics] track error", e);
  }
}
