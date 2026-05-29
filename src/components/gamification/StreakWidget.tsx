import { useQuery } from "@tanstack/react-query";
import { Flame, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function StreakWidget() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile-mini", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("current_streak, xp, level")
        .eq("id", user!.id)
        .single();
      return data;
    },
  });

  if (!profile) return null;

  const xpInLevel = (profile.xp ?? 0) % 100;
  const streak = profile.current_streak ?? 0;
  const level = profile.level ?? 1;

  return (
    <div className="space-y-2 rounded-xl border bg-card p-3 group-data-[collapsible=icon]:hidden">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Flame className={`h-3.5 w-3.5 ${streak > 0 ? "text-rose-500" : "text-muted-foreground"}`} />
          <span className="text-xs font-semibold">{streak} día{streak === 1 ? "" : "s"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Star className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-xs font-semibold">Nv {level}</span>
        </div>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all"
          style={{ width: `${xpInLevel}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">{xpInLevel}/100 XP al próximo nivel</p>
    </div>
  );
}
