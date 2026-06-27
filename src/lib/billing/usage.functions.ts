import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getUsageSnapshot } from "./usage";
import type { Plan } from "./plans";

export interface UsageStatus {
  plan: Plan;
  adaptive: { used: number; limit: number | null };
  adaptiveGeneration: { used: number; limit: number | null };
  tanda: { used: number; limit: number | null };
}

/** Estado de plan + uso del día para mostrar en la UI (contador + tarjeta de plan). */
export const getUsageStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UsageStatus> => {
    const { supabase, userId } = context;
    const [adaptive, adaptiveGeneration, tanda] = await Promise.all([
      getUsageSnapshot(supabase, userId, "adaptive"),
      getUsageSnapshot(supabase, userId, "adaptive_generation"),
      getUsageSnapshot(supabase, userId, "tanda"),
    ]);
    return {
      plan: adaptive.plan,
      adaptive: { used: adaptive.used, limit: adaptive.limit },
      adaptiveGeneration: { used: adaptiveGeneration.used, limit: adaptiveGeneration.limit },
      tanda: { used: tanda.used, limit: tanda.limit },
    };
  });
