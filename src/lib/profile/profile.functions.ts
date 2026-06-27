import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { GOAL_OPTIONS } from "@/lib/goals/daily";
import { log } from "@/lib/observability/log";

interface UpdateDailyGoalInput {
  dailyGoal: number;
}

export const updateDailyGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: UpdateDailyGoalInput) => input)
  .handler(async ({ data, context }): Promise<{ dailyGoal: number }> => {
    if (!GOAL_OPTIONS.includes(data.dailyGoal)) {
      throw new Error("Meta diaria inválida.");
    }

    const { data: dailyGoal, error } = await context.supabase.rpc("update_daily_goal", {
      p_daily_goal: data.dailyGoal,
    });

    if (error) {
      log.error("daily_goal_update_failed", { error: error.message });
      throw new Error("No se pudo actualizar la meta diaria.");
    }

    return { dailyGoal: dailyGoal ?? data.dailyGoal };
  });
