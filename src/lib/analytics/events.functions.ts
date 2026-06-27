import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { log } from "@/lib/observability/log";
import type { EventType } from "./events";

interface TrackAnalyticsEventInput {
  eventType: EventType;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

export const trackAnalyticsEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: TrackAnalyticsEventInput) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { data: id, error } = await context.supabase.rpc("track_analytics_event", {
      p_event_type: data.eventType,
      p_entity_type: data.entityType ?? null,
      p_entity_id: data.entityId ?? null,
      p_metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : {},
    });

    if (error || !id) {
      log.warn("analytics_event_track_failed", {
        error: error?.message ?? "missing_event_id",
        eventType: data.eventType,
      });
      throw new Error("No se pudo registrar el evento.");
    }

    return { id };
  });
