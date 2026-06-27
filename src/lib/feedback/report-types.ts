/**
 * Tipos y etiquetas del sistema de feedback. Lógica pura (sin side-effects).
 * Punto único de verdad para los enums de tipo/estado y sus labels en español.
 */

export type ReportType =
  | "math_error"
  | "wrong_evaluation"
  | "incomplete_exercise"
  | "ui_problem"
  | "suggestion"
  | "other";

export type ReportStatus = "open" | "reviewing" | "fixed" | "closed";

export const REPORT_TYPE_OPTIONS: { value: ReportType; label: string; emoji: string }[] = [
  { value: "math_error", label: "Error matemático", emoji: "➗" },
  { value: "wrong_evaluation", label: "Respuesta marcada incorrectamente", emoji: "❌" },
  { value: "incomplete_exercise", label: "Ejercicio incompleto", emoji: "🧩" },
  { value: "ui_problem", label: "Problema visual", emoji: "🖥️" },
  { value: "suggestion", label: "Sugerencia", emoji: "💡" },
  { value: "other", label: "Otro", emoji: "📝" },
];

export function reportTypeLabel(type: string): string {
  return REPORT_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

export const REPORT_STATUS_META: Record<ReportStatus, { label: string; tone: string }> = {
  open: { label: "Abierto", tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  reviewing: { label: "En revisión", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  fixed: { label: "Resuelto", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  closed: { label: "Cerrado", tone: "bg-muted text-muted-foreground" },
};

export const REPORT_STATUSES: ReportStatus[] = ["open", "reviewing", "fixed", "closed"];

export function statusLabel(status: string): string {
  return REPORT_STATUS_META[status as ReportStatus]?.label ?? status;
}

/** Contexto que se adjunta automáticamente al reporte (no lo escribe el usuario). */
export interface ReportContext {
  topic?: string | null;
  exerciseId?: string | null;
  difficulty?: number | null;
  /** datos extra: tipo de ejercicio, respuesta correcta, respuesta del usuario, origen, enunciado */
  metadata?: Record<string, unknown>;
}

/** Construye el metadata final mergeando contexto + datos de entorno + timestamp. */
export function buildReportMetadata(
  context: ReportContext,
  env: { userAgent?: string; url?: string } = {},
): Record<string, unknown> {
  return {
    ...(context.metadata ?? {}),
    user_agent: env.userAgent ?? null,
    url: env.url ?? null,
    reported_at: new Date().toISOString(),
    // Preparado para captura automática de screenshot a futuro (no implementado aún).
    screenshot: null,
  };
}
