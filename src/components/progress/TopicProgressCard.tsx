import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { TrendingUp, Minus, AlertTriangle, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { getTopicIcon, topicGradient } from "@/lib/topic-icons";
import type { TopicAggregate, Trend } from "@/lib/progress/aggregate";

const TREND_META: Record<Trend, { label: string; tone: string; Icon: typeof TrendingUp }> = {
  mejorando: { label: "Mejorando", tone: "text-emerald-600 dark:text-emerald-400", Icon: TrendingUp },
  estable: { label: "Estable", tone: "text-muted-foreground", Icon: Minus },
  refuerzo: { label: "A reforzar", tone: "text-amber-600 dark:text-amber-400", Icon: AlertTriangle },
  nuevo: { label: "Nuevo", tone: "text-primary", Icon: Sparkles },
};

export function TopicProgressCard({ aggregate, index }: { aggregate: TopicAggregate; index: number }) {
  const Icon = getTopicIcon(aggregate.topic.icon);
  const trend = TREND_META[aggregate.trend];
  const TrendIcon = trend.Icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Link
        to="/topics/$slug"
        params={{ slug: aggregate.topic.slug }}
        className="group block rounded-2xl border bg-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-glow"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${topicGradient(aggregate.topic.color)}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-base font-semibold truncate">{aggregate.topic.name}</h3>
              <p className="text-[11px] text-muted-foreground">
                {aggregate.totalAttempts} intentos · nivel {aggregate.estimatedLevel}/5
              </p>
            </div>
          </div>
          <span className={`flex shrink-0 items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-semibold ${trend.tone}`}>
            <TrendIcon className="h-3 w-3" />
            {trend.label}
          </span>
        </div>

        <div className="mt-4 space-y-2">
          <Progress value={aggregate.accuracy} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{aggregate.accuracy}%</span>
            <span>{aggregate.correctAttempts} aciertos</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
