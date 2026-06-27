import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { ShieldAlert, Inbox, Flag, TrendingUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import {
  REPORT_TYPE_OPTIONS,
  REPORT_STATUS_META,
  REPORT_STATUSES,
  reportTypeLabel,
  statusLabel,
  type ReportStatus,
} from "@/lib/feedback/report-types";
import { updateFeedbackReportStatus } from "@/lib/feedback/feedback.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: AdminReportsPage,
});

interface ReportRow {
  id: string;
  user_id: string | null;
  type: string;
  message: string;
  topic: string | null;
  exercise_id: string | null;
  difficulty: number | null;
  metadata: Record<string, unknown> | null;
  status: string;
  created_at: string;
}

function AdminReportsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const updateFeedbackReportStatusFn = useServerFn(updateFeedbackReportStatus);

  const { data: isAdmin, isPending: roleLoading } = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
  });

  const { data: reports = [], isPending } = useQuery({
    queryKey: ["feedback-reports"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data } = await supabase
        .from("feedback_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      return (data ?? []) as ReportRow[];
    },
  });

  const [statusFilter, setStatusFilter] = useState<"all" | ReportStatus>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<"all" | "7d" | "30d">("all");

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoff =
      dateFilter === "7d" ? now - 7 * 864e5 : dateFilter === "30d" ? now - 30 * 864e5 : 0;
    return reports.filter(
      (r) =>
        (statusFilter === "all" || r.status === statusFilter) &&
        (typeFilter === "all" || r.type === typeFilter) &&
        (cutoff === 0 || new Date(r.created_at).getTime() >= cutoff),
    );
  }, [reports, statusFilter, typeFilter, dateFilter]);

  const analytics = useMemo(() => computeAnalytics(reports), [reports]);

  const updateStatus = async (id: string, status: ReportStatus) => {
    try {
      await updateFeedbackReportStatusFn({ data: { reportId: id, status } });
      queryClient.invalidateQueries({ queryKey: ["feedback-reports"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo actualizar el reporte.";
      toast.error(msg);
    }
  };

  if (roleLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground" />
        <h1 className="mt-4 font-display text-xl font-bold">Acceso restringido</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta sección es solo para administradores.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:py-12">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-600">
          <Flag className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold">Reportes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Feedback de usuarios para mejora continua.
          </p>
        </div>
      </div>

      {/* Analytics */}
      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total reportes" value={analytics.total} />
        <Stat label="Abiertos" value={analytics.byStatus.open ?? 0} />
        <Stat label="En revisión" value={analytics.byStatus.reviewing ?? 0} />
        <Stat label="Resueltos" value={analytics.byStatus.fixed ?? 0} />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Panel title="Temas más reportados" icon={TrendingUp}>
          {analytics.topTopics.length === 0 ? (
            <Empty />
          ) : (
            <ul className="space-y-1.5">
              {analytics.topTopics.map((t) => (
                <li key={t.key} className="flex items-center justify-between text-sm">
                  <span className="truncate">{t.key}</span>
                  <span className="font-semibold tabular-nums text-muted-foreground">
                    {t.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Por tipo de problema" icon={Inbox}>
          {analytics.byTypeList.length === 0 ? (
            <Empty />
          ) : (
            <ul className="space-y-1.5">
              {analytics.byTypeList.map((t) => (
                <li key={t.key} className="flex items-center justify-between text-sm">
                  <span className="truncate">{reportTypeLabel(t.key)}</span>
                  <span className="font-semibold tabular-nums text-muted-foreground">
                    {t.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Filtros */}
      <div className="mt-8 flex flex-wrap items-center gap-2">
        <FilterSelect
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as "all" | ReportStatus)}
          options={[
            ["all", "Todos los estados"],
            ...REPORT_STATUSES.map((s) => [s, statusLabel(s)] as [string, string]),
          ]}
        />
        <FilterSelect
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            ["all", "Todos los tipos"],
            ...REPORT_TYPE_OPTIONS.map((o) => [o.value, o.label] as [string, string]),
          ]}
        />
        <FilterSelect
          value={dateFilter}
          onChange={(v) => setDateFilter(v as "all" | "7d" | "30d")}
          options={[
            ["all", "Todo el período"],
            ["7d", "Últimos 7 días"],
            ["30d", "Últimos 30 días"],
          ]}
        />
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} reporte(s)</span>
      </div>

      {/* Lista */}
      <div className="mt-4 space-y-3">
        {isPending ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando reportes…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground shadow-soft">
            No hay reportes con estos filtros.
          </div>
        ) : (
          filtered.map((r) => <ReportCard key={r.id} report={r} onStatus={updateStatus} />)
        )}
      </div>
    </div>
  );
}

function ReportCard({
  report,
  onStatus,
}: {
  report: ReportRow;
  onStatus: (id: string, s: ReportStatus) => void;
}) {
  const meta = report.metadata ?? {};
  const tone =
    REPORT_STATUS_META[report.status as ReportStatus]?.tone ?? "bg-muted text-muted-foreground";
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold">
            {reportTypeLabel(report.type)}
          </span>
          {report.topic && (
            <span className="text-[11px] text-muted-foreground">· {report.topic}</span>
          )}
          {report.difficulty != null && (
            <span className="text-[11px] text-muted-foreground">· dif {report.difficulty}/5</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", tone)}>
            {statusLabel(report.status)}
          </span>
          <select
            value={report.status}
            onChange={(e) => onStatus(report.id, e.target.value as ReportStatus)}
            className="rounded-md border bg-background px-2 py-1 text-xs"
          >
            {REPORT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-2 whitespace-pre-line text-sm">{report.message}</p>

      {Boolean(meta.statement || meta.correct_answer || meta.user_answer) && (
        <div className="mt-3 space-y-1 rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
          {meta.statement != null && (
            <p>
              <span className="font-medium">Enunciado:</span> {String(meta.statement)}
            </p>
          )}
          {meta.correct_answer != null && (
            <p>
              <span className="font-medium">Correcta:</span> {String(meta.correct_answer)}
            </p>
          )}
          {meta.user_answer != null && String(meta.user_answer).trim() !== "" && (
            <p>
              <span className="font-medium">Respuesta del usuario:</span> {String(meta.user_answer)}
            </p>
          )}
          {meta.source != null && (
            <p>
              <span className="font-medium">Origen:</span> {String(meta.source)}
            </p>
          )}
        </div>
      )}

      <p className="mt-2 text-[10px] text-muted-foreground">
        {new Date(report.created_at).toLocaleString("es-AR")}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-soft">
      <p className="font-display text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Inbox;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-soft">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {title}
      </div>
      {children}
    </div>
  );
}

function Empty() {
  return <p className="text-xs text-muted-foreground">Sin datos todavía.</p>;
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border bg-background px-3 py-1.5 text-xs font-medium"
    >
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

function computeAnalytics(reports: ReportRow[]) {
  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const byTopic: Record<string, number> = {};
  const byExercise: Record<string, number> = {};
  for (const r of reports) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    byType[r.type] = (byType[r.type] ?? 0) + 1;
    if (r.topic) byTopic[r.topic] = (byTopic[r.topic] ?? 0) + 1;
    if (r.exercise_id) byExercise[r.exercise_id] = (byExercise[r.exercise_id] ?? 0) + 1;
  }
  const toSorted = (rec: Record<string, number>) =>
    Object.entries(rec)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);
  return {
    total: reports.length,
    byStatus,
    topTopics: toSorted(byTopic).slice(0, 5),
    byTypeList: toSorted(byType),
    topExercises: toSorted(byExercise).slice(0, 5),
  };
}
