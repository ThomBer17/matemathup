import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight, Sparkles, AlertTriangle, RefreshCw, Trophy, Compass } from "lucide-react";
import { getTopicIcon, topicGradient } from "@/lib/topic-icons";
import type { Recommendation, RecommendationReason } from "@/lib/progress/recommendations";

const REASON_META: Record<RecommendationReason, { Icon: typeof Sparkles; label: string; tone: string }> = {
  refuerzo: { Icon: AlertTriangle, label: "Recomendado para reforzar", tone: "text-amber-600 dark:text-amber-400" },
  continuar: { Icon: RefreshCw, label: "Seguí desde donde dejaste", tone: "text-primary" },
  mantener: { Icon: Trophy, label: "Mantené el nivel", tone: "text-emerald-600 dark:text-emerald-400" },
  explorar: { Icon: Compass, label: "Empezá algo nuevo", tone: "text-violet-600 dark:text-violet-400" },
};

export function RecommendedCard({ rec }: { rec: Recommendation }) {
  const Icon = getTopicIcon(rec.topic.icon);
  const meta = REASON_META[rec.reason];
  const ReasonIcon = meta.Icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Link
        to="/topics/$slug"
        params={{ slug: rec.topic.slug }}
        className="group block rounded-2xl border bg-gradient-to-br from-primary-soft/40 to-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-glow md:p-6"
      >
        <div className={`flex items-center gap-1.5 text-xs font-semibold ${meta.tone}`}>
          <ReasonIcon className="h-3.5 w-3.5" />
          {meta.label}
        </div>

        <div className="mt-3 flex items-start gap-4">
          <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${topicGradient(rec.topic.color)}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-semibold">{rec.headline}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{rec.detail}</p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" />
        </div>

        <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="rounded-full bg-background/60 px-2 py-0.5 font-medium">
            Dificultad sugerida: {rec.suggestedDifficulty}/5
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
