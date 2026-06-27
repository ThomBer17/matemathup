import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Crown } from "lucide-react";
import { useAuth } from "@/hooks/auth-context";
import { getUsageStatus } from "@/lib/billing/usage.functions";
import { cn } from "@/lib/utils";

export function PlanUsageCard({ className }: { className?: string }) {
  const { user } = useAuth();
  const statusFn = useServerFn(getUsageStatus);

  const { data } = useQuery({
    queryKey: ["usage-status", user?.id],
    enabled: !!user,
    queryFn: () => statusFn(),
    staleTime: 30_000,
  });

  if (!data) return null;

  const isPremium = data.plan === "premium";

  return (
    <div className={cn("rounded-2xl border bg-card p-5 shadow-soft", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isPremium ? (
            <Crown className="h-4 w-4 text-amber-500" />
          ) : (
            <Sparkles className="h-4 w-4 text-primary" />
          )}
          <span className="font-display text-base font-semibold">
            Plan {isPremium ? "Premium" : "Free"}
          </span>
        </div>
        {isPremium && (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
            Ilimitado
          </span>
        )}
      </div>

      {!isPremium && (
        <div className="mt-4 space-y-3">
          <UsageBar
            label="Generaciones adaptativas hoy"
            used={data.adaptiveGeneration.used}
            limit={data.adaptiveGeneration.limit}
          />
          <UsageBar label="Ejercicios hoy" used={data.adaptive.used} limit={data.adaptive.limit} />
          <UsageBar label="Tandas IA hoy" used={data.tanda.used} limit={data.tanda.limit} />
          <p className="text-[11px] text-muted-foreground">Tu uso se reinicia cada día.</p>
        </div>
      )}
    </div>
  );
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  if (limit === null) return null;
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const atLimit = used >= limit;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span
          className={cn(
            "font-semibold tabular-nums",
            atLimit && "text-amber-600 dark:text-amber-400",
          )}
        >
          {Math.min(used, limit)} / {limit}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            atLimit ? "bg-amber-500" : "bg-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
