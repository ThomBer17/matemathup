import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ShieldAlert, BarChart3, Loader2, Users, Filter, TrendingDown, Repeat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import {
  filterSince,
  countOf,
  distinctActiveUsers,
  topByMetadataKey,
  funnel,
  retention,
  sessionize,
  sessionMetrics,
  abandonmentByTopic,
  globalAbandonment,
  accuracyByTopic,
  activityByHour,
  buildAlerts,
  type AnalyticsEvent,
} from "@/lib/analytics/compute";
import { EV } from "@/lib/analytics/events";
import { cn } from "@/lib/utils";
import { AlertTriangle, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  component: AdminAnalyticsPage,
});

type Window = "1d" | "7d" | "30d";
const WINDOWS: { value: Window; label: string; days: number }[] = [
  { value: "1d", label: "Hoy", days: 1 },
  { value: "7d", label: "7 días", days: 7 },
  { value: "30d", label: "30 días", days: 30 },
];

function AdminAnalyticsPage() {
  const { user } = useAuth();
  const [win, setWin] = useState<Window>("7d");

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

  const { data: events = [], isPending } = useQuery({
    queryKey: ["analytics-events"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const since = new Date(Date.now() - 90 * 864e5).toISOString();
      const { data } = await supabase
        .from("analytics_events")
        .select("user_id, event_type, entity_type, entity_id, metadata, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(10000);
      return (data ?? []) as AnalyticsEvent[];
    },
  });

  const today = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);

  const view = useMemo(() => {
    const days = WINDOWS.find((w) => w.value === win)!.days;
    const since = new Date(Date.now() - days * 864e5).toISOString();
    const inWin = filterSince(events, since);

    const correct = countOf(inWin, EV.exerciseCorrect);
    const incorrect = countOf(inWin, EV.exerciseIncorrect);
    const accuracy =
      correct + incorrect > 0 ? Math.round((correct / (correct + incorrect)) * 100) : null;
    const activeUsers = distinctActiveUsers(inWin);
    const answered = countOf(inWin, EV.exerciseAnswered) + countOf(inWin, EV.tandaAnswered);

    const sessions = sessionMetrics(sessionize(inWin));
    const abandonment = abandonmentByTopic(inWin);
    const accuracyTopics = accuracyByTopic(inWin);
    const featureCounts =
      activeUsers >= 5
        ? [
            { feature: "tanda", label: "Tanda IA", count: countOf(inWin, EV.tandaGenerated) },
            {
              feature: "material",
              label: "Material propio",
              count: countOf(inWin, EV.materialUploaded),
            },
            { feature: "plan", label: "Plan de estudio", count: countOf(inWin, EV.planCreated) },
          ]
        : [];
    const alerts = buildAlerts({ abandonment, accuracy: accuracyTopics, featureCounts });

    return {
      activeUsers,
      exercisesGenerated: countOf(inWin, EV.exerciseGenerated),
      exercisesAnswered: answered,
      tandas: countOf(inWin, EV.tandaGenerated),
      materials: countOf(inWin, EV.materialUploaded),
      plans: countOf(inWin, EV.planCreated),
      reports: countOf(inWin, EV.reportSent),
      accuracy,
      perUser: activeUsers > 0 ? Math.round(answered / activeUsers) : 0,
      topTopics: topByMetadataKey(inWin, EV.exerciseAnswered, "topic"),
      reportTypes: topByMetadataKey(inWin, EV.reportSent, "type"),
      sessions,
      abandonment,
      globalAbandon: globalAbandonment(inWin),
      hours: activityByHour(inWin),
      alerts,
    };
  }, [events, win]);

  const funnelData = useMemo(
    () =>
      funnel(events, [
        { label: "Registro", eventTypes: [EV.signup] },
        { label: "1er ejercicio", eventTypes: [EV.exerciseAnswered, EV.tandaAnswered] },
        { label: "1er material", eventTypes: [EV.materialUploaded] },
        { label: "1er plan", eventTypes: [EV.planCreated] },
      ]),
    [events],
  );

  const ret = useMemo(() => retention(events, today), [events, today]);

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
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">Analytics</h1>
            <p className="mt-1 text-sm text-muted-foreground">Cómo usan MatemathUp los alumnos.</p>
          </div>
        </div>
        <Link to="/admin/reports" className="text-sm text-primary hover:underline">
          Ver reportes →
        </Link>
      </div>

      {/* Filtro de período */}
      <div className="mt-6 flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {WINDOWS.map((w) => (
          <button
            key={w.value}
            onClick={() => setWin(w.value)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all",
              win === w.value
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:border-primary/40",
            )}
          >
            {w.label}
          </button>
        ))}
      </div>

      {isPending ? (
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando eventos…
        </div>
      ) : (
        <>
          {/* Alertas automáticas */}
          {view.alerts.length > 0 && (
            <div className="mt-6 space-y-2">
              {view.alerts.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm text-amber-700 dark:text-amber-300"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {a.text}
                </div>
              ))}
            </div>
          )}

          {/* KPIs */}
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi icon={Users} label="Usuarios activos" value={view.activeUsers} />
            <Kpi label="Ejercicios generados" value={view.exercisesGenerated} />
            <Kpi label="Ejercicios resueltos" value={view.exercisesAnswered} />
            <Kpi label="% correctos" value={view.accuracy == null ? "—" : `${view.accuracy}%`} />
            <Kpi label="Tandas IA" value={view.tandas} />
            <Kpi label="Materiales subidos" value={view.materials} />
            <Kpi label="Planes creados" value={view.plans} />
            <Kpi label="Reportes" value={view.reports} />
          </div>

          {/* Sesiones + abandono global */}
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi
              icon={Clock}
              label="Duración prom. sesión"
              value={`${view.sessions.avgDurationMin} min`}
            />
            <Kpi label="Ejercicios por sesión" value={view.sessions.avgExercises} />
            <Kpi label="Sesiones por usuario" value={view.sessions.sessionsPerUser} />
            <Kpi
              label="Abandono global"
              value={view.globalAbandon == null ? "—" : `${view.globalAbandon}%`}
            />
          </div>

          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <Panel title="Temas más practicados">
              <RankList items={view.topTopics} empty="Sin datos en el período." />
            </Panel>
            <Panel title="Reportes por tipo">
              <RankList items={view.reportTypes} empty="Sin reportes en el período." />
            </Panel>
          </div>

          {/* Abandono por tema */}
          <h2 className="mt-10 flex items-center gap-2 font-display text-xl font-bold">
            <TrendingDown className="h-5 w-5 text-muted-foreground" /> Temas con mayor abandono
          </h2>
          <p className="text-xs text-muted-foreground">
            Ejercicios generados que no se completaron, peor a mejor.
          </p>
          <div className="mt-3 overflow-hidden rounded-2xl border bg-card shadow-soft">
            {view.abandonment.length === 0 ? (
              <p className="p-4 text-xs text-muted-foreground">
                Sin datos suficientes en el período.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
                  <tr>
                    <th className="p-2.5 text-left font-medium">Tema</th>
                    <th className="p-2.5 text-right font-medium">Iniciados</th>
                    <th className="p-2.5 text-right font-medium">Completados</th>
                    <th className="p-2.5 text-right font-medium">Abandono</th>
                  </tr>
                </thead>
                <tbody>
                  {view.abandonment.map((a) => (
                    <tr key={a.topic} className="border-b last:border-0">
                      <td className="p-2.5">{a.topic}</td>
                      <td className="p-2.5 text-right tabular-nums">{a.generated}</td>
                      <td className="p-2.5 text-right tabular-nums">{a.completed}</td>
                      <td className="p-2.5 text-right">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                            a.abandonPct > 50
                              ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                              : a.abandonPct > 25
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                          )}
                        >
                          {a.abandonPct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Actividad por hora */}
          <h2 className="mt-10 flex items-center gap-2 font-display text-xl font-bold">
            <Clock className="h-5 w-5 text-muted-foreground" /> Actividad por hora del día
          </h2>
          <p className="text-xs text-muted-foreground">
            Cuándo estudian los usuarios (horario de Argentina).
          </p>
          <div
            className="mt-3 flex items-end gap-1 rounded-2xl border bg-card p-4 shadow-soft"
            style={{ height: 140 }}
          >
            {(() => {
              const max = Math.max(...view.hours, 1);
              return view.hours.map((h, hour) => (
                <div
                  key={hour}
                  className="flex flex-1 flex-col items-center gap-1"
                  title={`${hour}:00 — ${h} eventos`}
                >
                  <div
                    className="w-full rounded-t bg-primary/70"
                    style={{ height: `${(h / max) * 100}%`, minHeight: h > 0 ? 2 : 0 }}
                  />
                  {hour % 3 === 0 && (
                    <span className="text-[8px] text-muted-foreground">{hour}</span>
                  )}
                </div>
              ));
            })()}
          </div>

          {/* Funnel (todo el período de 90 días) */}
          <h2 className="mt-10 flex items-center gap-2 font-display text-xl font-bold">
            <TrendingDown className="h-5 w-5 text-muted-foreground" /> Funnel de activación
          </h2>
          <p className="text-xs text-muted-foreground">
            Usuarios distintos que llegaron a cada etapa (últimos 90 días).
          </p>
          <div className="mt-3 space-y-2">
            {funnelData.map((s, i) => {
              const max = funnelData[0].users || 1;
              const pct = Math.round((s.users / max) * 100);
              return (
                <div key={s.label} className="rounded-xl border bg-card p-3 shadow-soft">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {i + 1}. {s.label}
                    </span>
                    <span className="font-semibold tabular-nums">{s.users}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Retención */}
          <h2 className="mt-10 flex items-center gap-2 font-display text-xl font-bold">
            <Repeat className="h-5 w-5 text-muted-foreground" /> Retención
          </h2>
          <p className="text-xs text-muted-foreground">
            % de usuarios que siguen activos N días después de su primera actividad.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <Kpi label="Día 1" value={ret.d1 == null ? "—" : `${ret.d1}%`} />
            <Kpi label="Día 7" value={ret.d7 == null ? "—" : `${ret.d7}%`} />
            <Kpi label="Día 30" value={ret.d30 == null ? "—" : `${ret.d30}%`} />
          </div>

          <p className="mt-6 text-[11px] text-muted-foreground">
            Promedio de ejercicios por usuario activo en el período:{" "}
            <span className="font-semibold">{view.perUser}</span>
          </p>
        </>
      )}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof Users;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-soft">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      <p className="mt-2 font-display text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-soft">
      <p className="mb-3 text-sm font-semibold">{title}</p>
      {children}
    </div>
  );
}

function RankList({ items, empty }: { items: { key: string; count: number }[]; empty: string }) {
  if (items.length === 0) return <p className="text-xs text-muted-foreground">{empty}</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((it) => (
        <li key={it.key} className="flex items-center justify-between text-sm">
          <span className="truncate">{it.key}</span>
          <span className="font-semibold tabular-nums text-muted-foreground">{it.count}</span>
        </li>
      ))}
    </ul>
  );
}
