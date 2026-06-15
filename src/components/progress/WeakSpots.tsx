import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { getTopicIcon, topicGradient } from "@/lib/topic-icons";
import { Progress } from "@/components/ui/progress";
import type { TopicAggregate } from "@/lib/progress/aggregate";

/**
 * "Qué me falta": los temas más flojos primero, para enfocar el repaso.
 * Considera flojo un tema con ≥3 intentos y baja precisión o en tendencia de
 * refuerzo. No renderiza nada si no hay puntos débiles claros.
 */
export function WeakSpots({ aggregates }: { aggregates: TopicAggregate[] }) {
  const weak = aggregates
    .filter((a) => a.totalAttempts >= 3 && (a.accuracy < 65 || a.trend === "refuerzo"))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3);

  if (weak.length === 0) return null;

  return (
    <div className="mt-10">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <h2 className="font-display text-xl font-bold">Reforzá esto</h2>
      </div>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Tus temas más flojos — enfocá el repaso acá.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {weak.map((a, i) => {
          const Icon = getTopicIcon(a.topic.icon);
          return (
            <motion.div
              key={a.topic.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.03 * i }}
            >
              <Link
                to="/topics/$slug"
                params={{ slug: a.topic.slug }}
                className="group block rounded-2xl border bg-card p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-glow"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${topicGradient(a.topic.color)}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{a.topic.name}</p>
                    <p className="text-[11px] tabular-nums text-muted-foreground">
                      {a.accuracy}% de aciertos · nivel {a.estimatedLevel}/5
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" />
                </div>
                <div className="mt-3">
                  <Progress value={a.accuracy} className="h-1.5" />
                </div>
                <p className="mt-2 text-xs font-medium text-primary">Practicar y reforzar</p>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
