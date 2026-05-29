import { motion } from "motion/react";
import { Sparkles, TrendingUp, AlertTriangle, BookOpen } from "lucide-react";
import type { Insight } from "@/lib/progress/aggregate";

const KIND_META: Record<Insight["kind"], { Icon: typeof Sparkles; bg: string; text: string }> = {
  strength: {
    Icon: Sparkles,
    bg: "bg-emerald-500/10 border-emerald-500/30",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  "needs-work": {
    Icon: AlertTriangle,
    bg: "bg-amber-500/10 border-amber-500/30",
    text: "text-amber-700 dark:text-amber-300",
  },
  improving: {
    Icon: TrendingUp,
    bg: "bg-primary/10 border-primary/30",
    text: "text-primary",
  },
  "new-topic": {
    Icon: BookOpen,
    bg: "bg-muted border-border",
    text: "text-foreground",
  },
};

export function ProgressInsights({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Insights
      </h2>
      <div className="grid gap-2 md:grid-cols-2">
        {insights.map((ins, i) => {
          const meta = KIND_META[ins.kind];
          const Icon = meta.Icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-start gap-3 rounded-xl border p-3 ${meta.bg}`}
            >
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${meta.text}`} />
              <p className={`text-sm ${meta.text}`}>{ins.message}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
