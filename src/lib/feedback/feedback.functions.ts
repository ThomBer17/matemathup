import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { log } from "@/lib/observability/log";
import {
  REPORT_STATUSES,
  REPORT_TYPE_OPTIONS,
  type ReportStatus,
  type ReportType,
} from "./report-types";

interface SubmitFeedbackReportInput {
  type: ReportType;
  message: string;
  topic: string | null;
  exerciseId: string | null;
  difficulty: number | null;
  metadata: Record<string, unknown>;
}

interface UpdateFeedbackReportStatusInput {
  reportId: string;
  status: ReportStatus;
}

function isReportType(type: string): type is ReportType {
  return REPORT_TYPE_OPTIONS.some((option) => option.value === type);
}

function isReportStatus(status: string): status is ReportStatus {
  return REPORT_STATUSES.includes(status as ReportStatus);
}

export const submitFeedbackReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SubmitFeedbackReportInput) => input)
  .handler(async ({ data, context }) => {
    if (!isReportType(data.type)) throw new Error("Tipo de reporte inválido.");
    if (!data.message.trim()) throw new Error("La descripción es obligatoria.");

    const { data: id, error } = await context.supabase.rpc("submit_feedback_report", {
      p_type: data.type,
      p_message: data.message.trim(),
      p_topic: data.topic,
      p_exercise_id: data.exerciseId,
      p_difficulty: data.difficulty,
      p_metadata: JSON.parse(JSON.stringify(data.metadata)),
    });

    if (error || !id) {
      log.error("feedback_report_insert_failed", { error: error?.message ?? "missing_report" });
      throw new Error("No se pudo enviar el reporte.");
    }

    return { id };
  });

export const updateFeedbackReportStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: UpdateFeedbackReportStatusInput) => input)
  .handler(async ({ data, context }) => {
    if (!isReportStatus(data.status)) throw new Error("Estado de reporte inválido.");

    const { data: role } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Acceso restringido.");

    const { error } = await context.supabase.rpc("update_feedback_report_status", {
      p_report_id: data.reportId,
      p_status: data.status,
    });

    if (error) {
      log.error("feedback_report_status_update_failed", {
        error: error.message,
        reportId: data.reportId,
        status: data.status,
      });
      throw new Error("No se pudo actualizar el reporte.");
    }

    return { updated: true };
  });
