import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft, Loader2, CalendarDays, Check, Play, RotateCcw,
  Trophy, Dumbbell, BookOpen, ClipboardCheck, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { computePlanProgress, daysUntil, todayArgentina, replanTasks, type TaskKind } from "@/lib/study/plan";

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
  order_index: number;
}

const KIND_META: Record<TaskKind, { Icon: typeof Dumbbell; tone: string }> = {
  practice: { Icon: Dumbbell, tone: "text-rose-500" },
  review: { Icon: BookOpen, tone: "text-sky-500" },
  general_review: { Icon: ClipboardCheck, tone: "text-amber-500" },
  simulacro: { Icon: Trophy, tone: "text-violet-500" },
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

  const tasks = tasksQuery.data ?? [];
  const progress = computePlanProgress(tasks);
  const plan = planQuery.data;

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

  const completeTask = async (task: Task) => {
    if (task.status === "done" || !user) return;
    const { error } = await supabase
      .from("study_plan_tasks")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .eq("id", task.id);
    if (error) { toast.error("No se pudo marcar como hecha."); return; }

    // Gamificación: XP por completar tarea del plan.
    const xpGain = 15;
    const { data: prof } = await supabase.from("profiles").select("xp, level").eq("id", user.id).single();
    if (prof) {
      const newXp = (prof.xp ?? 0) + xpGain;
      await supabase.from("profiles").update({ xp: newXp, level: 1 + Math.floor(newXp / 100) }).eq("id", user.id);
      queryClient.invalidateQueries({ queryKey: ["profile-mini", user.id] });
    }
    toast.success(`¡Tarea completada! +${xpGain} XP`);
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
          const isPast = date < today;
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
                  <TaskCard key={t.id} task={t} isPast={isPast} onComplete={() => completeTask(t)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskCard({ task, isPast, onComplete }: { task: Task; isPast: boolean; onComplete: () => void }) {
  const meta = KIND_META[task.kind as TaskKind] ?? KIND_META.practice;
  const Icon = meta.Icon;
  const done = task.status === "done";

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-card p-3 shadow-soft",
        done && "opacity-60",
        !done && isPast && "border-amber-500/30",
      )}
    >
      <button
        type="button"
        onClick={onComplete}
        aria-label="Completar"
        className={cn(
          "grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-colors",
          done ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/30 hover:border-primary",
        )}
      >
        {done && <Check className="h-4 w-4" />}
      </button>

      <div className="min-w-0 flex-1">
        <p className={cn("flex items-center gap-1.5 text-sm font-medium", done && "line-through")}>
          <Icon className={cn("h-3.5 w-3.5", meta.tone)} />
          <span className="truncate">{task.title}</span>
        </p>
        {task.objective && <p className="truncate text-[11px] text-muted-foreground">{task.objective} · {task.minutes} min</p>}
      </div>

      {!done && task.topic_slug && (
        <Link
          to="/topics/$slug"
          params={{ slug: task.topic_slug }}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Play className="h-3 w-3" /> Comenzar
        </Link>
      )}
    </motion.div>
  );
}
