import { motion } from "motion/react";
import {
  Flame,
  Trophy,
  Target,
  Zap,
  Star,
  GraduationCap,
  Telescope,
  Rocket,
  Medal,
  Award,
  Lock,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BadgeIconName, EarnedBadge } from "@/lib/gamification/badges";

const ICONS: Record<BadgeIconName, LucideIcon> = {
  flame: Flame,
  trophy: Trophy,
  target: Target,
  zap: Zap,
  star: Star,
  "graduation-cap": GraduationCap,
  telescope: Telescope,
  rocket: Rocket,
  medal: Medal,
  award: Award,
};

const TIER_STYLES: Record<1 | 2 | 3, string> = {
  1: "from-sky-500/20 to-sky-600/10 text-sky-700 dark:text-sky-300 ring-sky-500/30",
  2: "from-violet-500/20 to-violet-600/10 text-violet-700 dark:text-violet-300 ring-violet-500/30",
  3: "from-amber-500/25 to-amber-600/10 text-amber-700 dark:text-amber-300 ring-amber-500/40",
};

export function BadgeGrid({
  badges,
  showProgress = true,
}: {
  badges: EarnedBadge[];
  showProgress?: boolean;
}) {
  // ganados primero, luego por progreso descendente
  const sorted = [...badges].sort((a, b) => {
    if (a.earned !== b.earned) return a.earned ? -1 : 1;
    return b.progress - a.progress;
  });

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {sorted.map((b, i) => {
        const Icon = ICONS[b.def.icon];
        return (
          <motion.div
            key={b.def.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
            className={cn(
              "relative flex flex-col items-center gap-2 rounded-2xl border bg-card p-4 text-center transition-all",
              !b.earned && "opacity-50",
            )}
          >
            <div
              className={cn(
                "grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ring-1",
                b.earned
                  ? TIER_STYLES[b.def.tier]
                  : "from-muted to-muted/50 text-muted-foreground ring-border",
              )}
            >
              {b.earned ? <Icon className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-semibold leading-tight">{b.def.name}</p>
              <p className="text-[10px] leading-tight text-muted-foreground">{b.def.description}</p>
            </div>
            {showProgress && !b.earned && b.progress > 0 && (
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary/60 transition-all"
                  style={{ width: `${b.progress}%` }}
                />
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
