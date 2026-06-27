import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { motion } from "motion/react";
import { LineChart, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { ProgressOverview } from "@/components/progress/ProgressOverview";
import { TopicProgressCard } from "@/components/progress/TopicProgressCard";
import { ProgressInsights } from "@/components/progress/ProgressInsights";
import { RecommendedCard } from "@/components/progress/RecommendedCard";
import { BadgeGrid } from "@/components/gamification/BadgeGrid";
import {
  aggregateByTopic,
  computeOverall,
  generateInsights,
  type AttemptRow,
  type TopicMeta,
} from "@/lib/progress/aggregate";
import { recommendNext } from "@/lib/progress/recommendations";
import { computeBadges, badgeStats } from "@/lib/gamification/badges";

export const Route = createFileRoute("/_authenticated/progress")({
  component: ProgressPage,
});

function ProgressPage() {
  const { user } = useAuth();

  const attemptsQuery = useQuery({
    queryKey: ["my-attempts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercise_attempts")
        .select("id, is_correct, status, source, difficulty, topic_id, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as AttemptRow[];
    },
  });

  const topicsQuery = useQuery({
    queryKey: ["all-topics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topics")
        .select("id, name, slug, color, icon")
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as TopicMeta[];
    },
  });

  const profileQuery = useQuery({
    queryKey: ["profile-progress", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("current_streak, longest_streak, xp, level")
        .eq("id", user!.id)
        .single();
      return data;
    },
  });

  const { aggregates, overall, insights, recommendation, badges, badgeCount } = useMemo(() => {
    const attempts = attemptsQuery.data ?? [];
    const topics = topicsQuery.data ?? [];
    const metaById = new Map(topics.map((t) => [t.id, t]));
    const aggs = aggregateByTopic(attempts, metaById);
    const ctx = {
      overall: computeOverall(attempts),
      aggregates: aggs,
      profile: profileQuery.data ?? null,
      totalTopics: topics.length,
    };
    const computedBadges = computeBadges(ctx);
    return {
      aggregates: aggs,
      overall: ctx.overall,
      insights: generateInsights(aggs),
      recommendation: recommendNext(aggs, topics),
      badges: computedBadges,
      badgeCount: badgeStats(computedBadges),
    };
  }, [attemptsQuery.data, topicsQuery.data, profileQuery.data]);

  const isLoading = attemptsQuery.isPending || topicsQuery.isPending;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:py-12">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
          <LineChart className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold">Mi progreso</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Seguí tu evolución por tema y descubrí dónde reforzar.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Calculando tu progreso…
        </div>
      ) : attemptsQuery.isError || topicsQuery.isError ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-10 rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center shadow-soft"
        >
          <p className="font-display text-lg font-semibold text-destructive">
            No se pudo cargar tu progreso
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {(attemptsQuery.error as Error | null)?.message ??
              (topicsQuery.error as Error | null)?.message ??
              "Error desconocido"}
          </p>
        </motion.div>
      ) : overall.totalAttempts === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-10 rounded-2xl border bg-card p-10 text-center shadow-soft"
        >
          <p className="font-display text-lg font-semibold">Todavía no resolviste ejercicios</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Andá a un tema y resolvé tu primera práctica adaptativa o tanda IA. Tu progreso aparece
            acá automáticamente.
          </p>
        </motion.div>
      ) : (
        <>
          <div className="mt-8">
            <ProgressOverview stats={overall} />
          </div>

          {recommendation && (
            <div className="mt-6">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Recomendado para hoy
              </h2>
              <RecommendedCard rec={recommendation} />
            </div>
          )}

          {insights.length > 0 && (
            <div className="mt-6">
              <ProgressInsights insights={insights} />
            </div>
          )}

          <div className="mt-8 space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-xl font-semibold">Progreso por tema</h2>
              <span className="text-xs text-muted-foreground">
                {aggregates.length} tema{aggregates.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {aggregates.map((agg, i) => (
                <TopicProgressCard key={agg.topic.id} aggregate={agg} index={i} />
              ))}
            </div>
          </div>

          <div className="mt-10 space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-xl font-semibold">Logros</h2>
              <span className="text-xs text-muted-foreground">
                {badgeCount.earned}/{badgeCount.total} desbloqueados
              </span>
            </div>
            <BadgeGrid badges={badges} />
          </div>
        </>
      )}
    </div>
  );
}
