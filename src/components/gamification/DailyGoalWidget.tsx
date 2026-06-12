import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Target, Flame, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  countToday, goalProgress, goalMessage, shouldNudgeStreak, hourArgentina, GOAL_OPTIONS,
} from "@/lib/goals/daily";

/**
 * Meta diaria de ejercicios. Cuenta los intentos de hoy, muestra el progreso y
 * deja cambiar la meta. Si se hace tarde y no la cumpliste, avisa para no perder
 * la racha (recordatorio in-app).
 */
export function DailyGoalWidget({
  userId,
  goal,
  attempts,
  streak,
}: {
  userId: string;
  goal: number;
  attempts: { created_at: string }[];
  streak: number;
}) {
  const queryClient = useQueryClient();
  const done = useMemo(() => countToday(attempts), [attempts]);
  const p = goalProgress(done, goal);
  const nudge = shouldNudgeStreak(p, hourArgentina()) && streak > 0;

  const setGoal = (g: number) => {
    if (g === goal) return;
    void supabase
      .from("profiles")
      .update({ daily_goal: g })
      .eq("id", userId)
      .then(({ error }) => {
        if (!error) {
          queryClient.invalidateQueries({ queryKey: ["profile", userId] });
          queryClient.invalidateQueries({ queryKey: ["profile-mini", userId] });
        }
      });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl border bg-card p-5 shadow-soft",
        nudge && "border-amber-500/40 bg-amber-500/5",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            "grid h-9 w-9 place-items-center rounded-lg",
            p.met ? "bg-success/15 text-success" : "bg-primary/10 text-primary",
          )}>
            {p.met ? <Check className="h-4 w-4" /> : <Target className="h-4 w-4" />}
          </div>
          <div>
            <p className="text-sm font-semibold">Meta diaria</p>
            <p className="text-[11px] text-muted-foreground tabular-nums">
              {p.done} / {p.goal} ejercicios hoy
            </p>
          </div>
        </div>
        {/* Selector de meta */}
        <div className="flex items-center gap-1 rounded-lg border bg-background p-0.5 text-[11px] font-semibold">
          {GOAL_OPTIONS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGoal(g)}
              className={cn(
                "rounded-md px-2 py-0.5 tabular-nums transition-colors",
                goal === g ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Barra de progreso (segmentos) */}
      <div className="mt-4 flex gap-1.5">
        {Array.from({ length: p.goal }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-2 flex-1 rounded-full transition-colors",
              i < p.done ? (p.met ? "bg-success" : "bg-primary") : "bg-muted",
            )}
          />
        ))}
      </div>

      <p className={cn("mt-3 text-xs", nudge ? "font-medium text-amber-700 dark:text-amber-300" : "text-muted-foreground")}>
        {nudge ? (
          <span className="inline-flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5" />
            ¡No pierdas tu racha de {streak}! {goalMessage(p)}
          </span>
        ) : (
          goalMessage(p)
        )}
      </p>
    </motion.div>
  );
}
