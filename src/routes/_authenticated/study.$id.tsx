import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft, Loader2, CalendarDays, Check, Play, RotateCcw,
  Trophy, Dumbbell, BookOpen, ClipboardCheck, Trash2, Clock, Hand, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  computePlanProgress, daysUntil, todayArgentina, replanTasks,
  deriveTaskState, shouldAutoComplete, canCompleteTask, toArgentinaDate,
  type TaskKind, type TaskViewState,
} from "@/lib/study/plan";
import { track, EV } from "@/lib/analytics/events";

export const Route = createFileRoute("/_authenticated/study/$id")({
  component: StudyPlanDetail,
});

interface Task {
  id: string;
  date: string;
  topic_slug: string | null;
  topic_name: string | null;
  kind: string;
  title: string;
  objective: string | null;
  minutes: number;
  status: string;
  completion_type: string | null;
  order_index: number;
}

const AUTO_XP = 15;

const KIND_META: Record<TaskKind, { Icon: typeof Dumbbell; tone: string }> = {
  practice: { Icon: Dumbbell, tone: "text-rose-500" },
  review: { Icon: BookOpen, tone: "text-sky-500" },
  general_review: { Icon: ClipboardCheck, tone: "text-amber-500" },
  simulacro: { Icon: Trophy, tone: "text-violet-500" },
};

const STATE_BADGE: Record<TaskViewState, { label: string; cls: string }> = {
  upcoming: { label: "Próxima", cls: "bg-muted text-muted-foreground" },
  pending: { label: "Pendiente", cls: "bg-muted text-muted-foreground" },
  in_progress: { label: "En progreso", cls: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  done_auto: { label: "Completada", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  done_manual: { label: "Marcada a mano", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
};

function StudyPlanDetail() {
  const { id } = useParams({ from: "/_authenticated/study/$id" });
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = todayArgentina();

  const planQuery = useQuery({
    queryKey: ["study-plan", id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("study_plans").select("*").eq("id", id).eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const tasksQuery = useQuery({
    queryKey: ["study-plan-tasks", id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("study_plan_tasks")
        .select("*")
        .eq("plan_id", id)
        .order("date", { ascending: true })
        .order("order_index", { ascending: true });
      return (data ?? []) as Task[];
    },
  });

  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const plan = planQuery.data;

  // La fecha más temprana del plan acota cuántos intentos traemos (estudio "del plan").
  const earliestDate = useMemo(
    () => (tasks.length ? tasks.reduce((m, t) => (t.date < m ? t.date : m), tasks[0].date) : today),
    [tasks, today],
  );

  // Mapa slug → topic_id, para contar intentos por tema.
  const topicsQuery = useQuery({
    queryKey: ["topics-slug-id"],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("topics").select("id, slug");
      const map: Record<string, string> = {};
      for (const t of data ?? []) if (t.slug) map[t.slug] = t.id;
      return map;
    },
  });
  const slugToId = topicsQuery.data ?? {};

  // Intentos CORRECTOS desde el inicio del plan (para medir estudio real).
  const attemptsQuery = useQuery({
    queryKey: ["plan-correct-attempts", user?.id, earliestDate],
    enabled: !!user && tasks.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("exercise_attempts")
        .select("topic_id, created_at")
        .eq("user_id", user!.id)
        .eq("is_correct", true)
        .gte("created_at", earliestDate + "T00:00:00");
      return (data ?? []) as { topic_id: string | null; created_at: string }[];
    },
  });

  // correctos por tarea = intentos correctos del tema (o de cualquier tema para
  // repaso general/simulacro) hechos EN o DESPUÉS de la fecha de la tarea.
  const correctByTask = useMemo(() => {
    const map = new Map<string, number>();
    const attempts = attemptsQuery.data ?? [];
    for (const t of tasks) {
      const topicId = t.topic_slug ? slugToId[t.topic_slug] : null;
      let n = 0;
      for (const a of attempts) {
        if (toArgentinaDate(a.created_at) < t.date) continue;
        if (topicId && a.topic_id !== topicId) continue; // tareas de tema: solo ese tema
        n++;
      }
      map.set(t.id, n);
    }
    return map;
  }, [tasks, attemptsQuery.data, slugToId]);

  const progress = computePlanProgress(tasks);

  const overdue = useMemo(
    () => tasks.filter((t) => t.status !== "done" && t.date < today).length,
    [tasks, today],
  );

  const byDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      const arr = map.get(t.date) ?? [];
      arr.push(t);
      map.set(t.date, arr);
    }
    return Array.from(map.entries());
  }, [tasks]);

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["study-plan-tasks", id] });
    queryClient.invalidateQueries({ queryKey: ["study-plans", user?.id] });
  };

  // --- Auto-completado por estudio real (idempotente vía update condicional) ---
  const autoTried = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!user || tasks.length === 0 || !attemptsQuery.data) return;
    for (const t of tasks) {
      const correct = correctByTask.get(t.id) ?? 0;
      if (shouldAutoComplete(t, today, correct) && !autoTried.current.has(t.id)) {
        autoTried.current.add(t.id);
        void autoComplete(t);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, correctByTask, attemptsQuery.data, user, today]);

  const autoComplete = async (task: Task) => {
    if (!user) return;
    // Solo marca si SEGUÍA pendiente: evita doble XP ante carreras/recargas.
    const { data: updated } = await supabase
      .from("study_plan_tasks")
      .update({ status: "done", completion_type: "auto", completed_at: new Date().toISOString() })
      .eq("id", task.id)
      .eq("status", "pending")
      .select();
    if (!updated || updated.length === 0) return; // ya estaba hecha → sin XP

    const { data: prof } = await supabase.from("profiles").select("xp").eq("id", user.id).single();
    if (prof) {
      const newXp = (prof.xp ?? 0) + AUTO_XP;
      await supabase.from("profiles").update({ xp: newXp, level: 1 + Math.floor(newXp / 100) }).eq("id", user.id);
      queryClient.invalidateQueries({ queryKey: ["profile-mini", user.id] });
    }
    track(EV.taskAutoCompleted, { entityType: "task", entityId: task.id, metadata: { kind: task.kind, topic: task.topic_name } });
    track(EV.xpGained, { metadata: { amount: AUTO_XP, source: "study_task_auto" } });
    toast.success(`¡Tarea completada estudiando! +${AUTO_XP} XP`);
    refetch();
  };

  // --- Override manual: confirma, NO da XP, queda registrado aparte ---
  const completeManually = async (task: Task) => {
    if (!user || task.status === "done") return;
    if (!canCompleteTask(task.date, today)) return; // nunca futuras
    const ok = window.confirm(
      "Marcar como completada manualmente NO suma XP (el XP es solo por estudio real). ¿Continuar?",
    );
    if (!ok) return;
    const { error } = await supabase
      .from("study_plan_tasks")
      .update({ status: "done", completion_type: "manual", completed_at: new Date().toISOString() })
      .eq("id", task.id);
    if (error) { toast.error("No se pudo marcar como hecha."); return; }
    track(EV.taskManualCompleted, { entityType: "task", entityId: task.id, metadata: { kind: task.kind, topic: task.topic_name } });
    toast.success("Tarea marcada a mano (sin XP).");
    refetch();
  };

  const replan = async () => {
    if (!plan) return;
    const updates = replanTasks(
      tasks.map((t) => ({ id: t.id, status: t.status, orderIndex: t.order_index })),
      today,
      plan.exam_date,
    );
    for (const u of updates) {
      await supabase.from("study_plan_tasks").update({ date: u.date }).eq("id", u.id);
    }
    track(EV.replanUsed, { entityType: "plan", entityId: id });
    toast.success("Plan replanificado. Redistribuimos lo que quedaba.");
    refetch();
  };

  const deletePlan = async () => {
    if (!window.confirm("¿Eliminar este plan?")) return;
    await supabase.from("study_plans").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["study-plans", user?.id] });
    window.history.back();
  };

  if (planQuery.isPending || tasksQuery.isPending) {
    return <div className="grid min-h-[50vh] place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }
  if (!plan) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <p className="font-display text-lg font-semibold">Plan no encontrado</p>
        <Link to="/study" className="mt-4 inline-block text-sm text-primary hover:underline">Volver</Link>
      </div>
    );
  }

  const left = daysUntil(plan.exam_date, today);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 md:py-12">
      <Link to="/study" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Mis planes
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">{plan.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <CalendarDays className="mr-1 inline h-3.5 w-3.5" />
            {new Date(plan.exam_date + "T00:00:00").toLocaleDateString("es-AR")} ·{" "}
            {left === 0 ? "es hoy o ya pasó" : `faltan ${left} día${left === 1 ? "" : "s"}`}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={deletePlan} className="gap-1.5 text-destructive hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" /> Eliminar
        </Button>
      </div>

      {/* Resumen */}
      <div className="mt-6 rounded-2xl border bg-card p-5 shadow-soft">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Progreso del plan</span>
          <span className="font-semibold tabular-nums">{progress.pct}%</span>
        </div>
        <Progress value={progress.pct} className="mt-2 h-2" />
        <p className="mt-2 text-xs text-muted-foreground">{progress.done} de {progress.total} tareas completadas</p>
        <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" />
          Las tareas se completan solas cuando resolvés los ejercicios del tema. El XP es solo por estudio real.
        </p>

        {overdue > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Tenés {overdue} tarea{overdue === 1 ? "" : "s"} atrasada{overdue === 1 ? "" : "s"}. Podemos reacomodar el plan.
            </p>
            <Button size="sm" variant="outline" onClick={replan} className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" /> Replanificar
            </Button>
          </div>
        )}
      </div>

      {/* Calendario */}
      <div className="mt-8 space-y-4">
        {byDate.map(([date, dayTasks]) => {
          const isToday = date === today;
          return (
            <div key={date}>
              <div className="mb-2 flex items-center gap-2">
                <span className={cn("text-sm font-semibold capitalize", isToday && "text-primary")}>
                  {new Date(date + "T00:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "short" })}
                </span>
                {isToday && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">Hoy</span>}
              </div>
              <div className="space-y-2">
                {dayTasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    today={today}
                    correct={correctByTask.get(t.id) ?? 0}
                    onManual={() => completeManually(t)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskCard({
  task, today, correct, onManual,
}: {
  task: Task;
  today: string;
  correct: number;
  onManual: () => void;
}) {
  const meta = KIND_META[task.kind as TaskKind] ?? KIND_META.practice;
  const Icon = meta.Icon;
  const { state, target, progress } = deriveTaskState(task, today, correct);
  const done = state === "done_auto" || state === "done_manual";
  const badge = STATE_BADGE[state];

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-card p-3 shadow-soft",
        done && "opacity-70",
        state === "upcoming" && "opacity-60",
        state === "in_progress" && "border-sky-500/30",
        !done && task.date < today && "border-amber-500/30",
      )}
    >
      {/* Indicador de estado */}
      <div
        className={cn(
          "grid h-7 w-7 shrink-0 place-items-center rounded-full border-2",
          state === "done_auto" && "border-emerald-500 bg-emerald-500 text-white",
          state === "done_manual" && "border-amber-500 bg-amber-500 text-white",
          state === "upcoming" && "border-muted-foreground/20 text-muted-foreground/50",
          (state === "pending" || state === "in_progress") && "border-muted-foreground/30",
        )}
      >
        {done && <Check className="h-4 w-4" />}
        {state === "upcoming" && <Clock className="h-3.5 w-3.5" />}
      </div>

      <div className="min-w-0 flex-1">
        <p className={cn("flex items-center gap-1.5 text-sm font-medium", done && "line-through")}>
          <Icon className={cn("h-3.5 w-3.5", meta.tone)} />
          <span className="truncate">{task.title}</span>
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", badge.cls)}>{badge.label}</span>
          {(state === "pending" || state === "in_progress") && (
            <span className="text-[11px] text-muted-foreground tabular-nums">{progress}/{target} ejercicios correctos</span>
          )}
          {task.objective && state !== "in_progress" && state !== "pending" && (
            <span className="truncate text-[11px] text-muted-foreground">{task.objective}</span>
          )}
        </div>
      </div>

      {/* Acciones */}
      {state === "upcoming" && (
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {new Date(task.date + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
        </span>
      )}
      {(state === "pending" || state === "in_progress") && (
        <div className="flex shrink-0 items-center gap-1.5">
          {task.topic_slug && (
            <Link
              to="/topics/$slug"
              params={{ slug: task.topic_slug }}
              onClick={() => track(EV.taskStarted, { entityType: "task", entityId: task.id, metadata: { kind: task.kind, topic: task.topic_name } })}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Play className="h-3 w-3" /> Comenzar
            </Link>
          )}
          <button
            type="button"
            onClick={onManual}
            title="Marcar como completada manualmente (no suma XP)"
            className="inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-muted"
          >
            <Hand className="h-3 w-3" /> A mano
          </button>
        </div>
      )}
    </motion.div>
  );
}
