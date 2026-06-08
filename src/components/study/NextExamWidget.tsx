import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CalendarClock, Play, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Progress } from "@/components/ui/progress";
import { computePlanProgress, daysUntil, todayArgentina } from "@/lib/study/plan";

/** Widget de dashboard: el examen más próximo + próxima tarea pendiente. */
export function NextExamWidget() {
  const { user } = useAuth();
  const today = todayArgentina();

  const { data } = useQuery({
    queryKey: ["next-exam", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: plans } = await supabase
        .from("study_plans")
        .select("*")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .gte("exam_date", today)
        .order("exam_date", { ascending: true })
        .limit(1);
      const plan = plans?.[0];
      if (!plan) return null;
      const { data: tasks } = await supabase
        .from("study_plan_tasks")
        .select("id, date, title, topic_slug, minutes, status, order_index")
        .eq("plan_id", plan.id)
        .order("date", { ascending: true })
        .order("order_index", { ascending: true });
      return { plan, tasks: tasks ?? [] };
    },
  });

  if (!data) return null;

  const { plan, tasks } = data;
  const progress = computePlanProgress(tasks);
  const left = daysUntil(plan.exam_date, today);
  const next = tasks.find((t) => t.status !== "done");

  return (
    <Link
      to="/study/$id"
      params={{ id: plan.id }}
      className="group block rounded-2xl border bg-gradient-to-br from-emerald-500/10 to-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-glow"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <CalendarClock className="h-3.5 w-3.5" /> Próximo examen
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
      </div>

      <h3 className="mt-2 font-display text-lg font-semibold">📅 {plan.name}</h3>
      <p className="text-xs text-muted-foreground">
        {left === 0 ? "¡Es hoy!" : `Faltan ${left} día${left === 1 ? "" : "s"}`}
      </p>

      <div className="mt-3 flex items-center gap-3">
        <Progress value={progress.pct} className="h-1.5 flex-1" />
        <span className="text-xs font-medium text-muted-foreground">{progress.pct}%</span>
      </div>

      {next && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border bg-background/60 p-2.5">
          <Play className="h-3.5 w-3.5 shrink-0 text-primary" />
          <p className="min-w-0 flex-1 truncate text-xs font-medium">{next.title}</p>
          <span className="shrink-0 text-[10px] text-muted-foreground">{next.minutes} min</span>
        </div>
      )}
    </Link>
  );
}
