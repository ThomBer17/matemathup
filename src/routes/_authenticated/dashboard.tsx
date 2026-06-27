import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { motion } from "motion/react";
import {
  Flame,
  Trophy,
  Target,
  BookOpen,
  ArrowRight,
  Sparkles,
  TrendingUp,
  RotateCcw,
  Star,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { Progress } from "@/components/ui/progress";
import { getTopicIcon, topicGradient } from "@/lib/topic-icons";
import { RecommendedCard } from "@/components/progress/RecommendedCard";
import { WeakSpots } from "@/components/progress/WeakSpots";
import {
  aggregateByTopic,
  computeOverall,
  type AttemptRow,
  type TopicMeta,
} from "@/lib/progress/aggregate";
import { recommendNext } from "@/lib/progress/recommendations";
import { computeBadges, badgeStats } from "@/lib/gamification/badges";
import { ReportProblem } from "@/components/feedback/ReportProblem";
import { MyMaterials } from "@/components/materials/MyMaterials";
import { NextExamWidget } from "@/components/study/NextExamWidget";
import { StatCardsSkeleton, TopicGridSkeleton } from "@/components/CardSkeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { DailyGoalWidget } from "@/components/gamification/DailyGoalWidget";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      return data;
    },
  });

  const { data: topics = [], isPending: topicsPending } = useQuery({
    queryKey: ["topics"],
    queryFn: async () => {
      const { data } = await supabase.from("topics").select("*").order("order_index");
      return data ?? [];
    },
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["progress", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("user_progress").select("*").eq("user_id", user!.id);
      return data ?? [];
    },
  });

  const { data: attempts = [], isLoading: attemptsLoading } = useQuery({
    queryKey: ["my-attempts-dash", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("exercise_attempts")
        .select("id, is_correct, status, source, difficulty, topic_id, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(500);
      return (data ?? []) as AttemptRow[];
    },
  });

  const loadingCore = topicsPending || attemptsLoading;

  // Cantidad de ejercicios vencidos para repasar (SRS).
  const { data: dueCount = 0 } = useQuery({
    queryKey: ["srs-due", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase
        .from("srs_items")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .lte("due_at", new Date().toISOString());
      return count ?? 0;
    },
  });

  const { recommendation, badgeCount, recentTopicAggs, aggregates } = useMemo(() => {
    const metaById = new Map(
      topics.map((t) => [
        t.id,
        { id: t.id, name: t.name, slug: t.slug, color: t.color, icon: t.icon } as TopicMeta,
      ]),
    );
    const aggs = aggregateByTopic(attempts, metaById);
    const overall = computeOverall(attempts);
    const ctx = {
      overall,
      aggregates: aggs,
      profile: profile ?? null,
      totalTopics: topics.length,
    };
    const badges = computeBadges(ctx);
    return {
      recommendation: recommendNext(aggs, Array.from(metaById.values())),
      badgeCount: badgeStats(badges),
      recentTopicAggs: aggs.slice(0, 3),
      aggregates: aggs,
    };
  }, [attempts, topics, profile]);

  const progressMap = new Map(progress.map((p) => [p.topic_id, p]));
  const totalEx = attempts.length;
  const avgMastery = topics.length
    ? Math.round(
        topics.reduce((s, t) => s + Number(progressMap.get(t.id)?.mastery_pct ?? 0), 0) /
          topics.length,
      )
    : 0;
  const completed = topics.filter(
    (t) => Number(progressMap.get(t.id)?.mastery_pct ?? 0) >= 80,
  ).length;

  const stats = [
    {
      label: "Avance general",
      value: `${avgMastery}%`,
      icon: Target,
      color: "text-sky-600 bg-sky-500/10",
    },
    {
      label: "Temas dominados",
      value: `${completed}/${topics.length}`,
      icon: Trophy,
      color: "text-amber-600 bg-amber-500/10",
    },
    {
      label: "Ejercicios hechos",
      value: String(totalEx),
      icon: BookOpen,
      color: "text-violet-600 bg-violet-500/10",
    },
    {
      label: "Racha actual",
      value: `${profile?.current_streak ?? 0} días`,
      icon: Flame,
      color: "text-rose-600 bg-rose-500/10",
    },
  ];

  const firstName = profile?.full_name?.split(" ")[0] ?? "estudiante";
  const isNewUser = attempts.length === 0;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:py-12">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4"
      >
        <div className="min-w-0">
          {loadingCore ? (
            <>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-2 h-9 w-72 max-w-full" />
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Hola{isNewUser ? "" : " de nuevo"},</p>
              <h1 className="font-display text-3xl font-bold md:text-4xl">
                {isNewUser ? `Bienvenido/a, ${firstName}` : `¿Qué resolvemos hoy, ${firstName}?`}
              </h1>
            </>
          )}
        </div>
        {/* Nivel/XP: visible en el dashboard (en mobile el widget del sidebar queda oculto) */}
        {!loadingCore && profile && (
          <div className="hidden w-44 shrink-0 rounded-xl border bg-card p-3 shadow-soft sm:block">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                <Star className="h-4 w-4 text-amber-500" />
                Nivel {profile.level ?? 1}
              </span>
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {(profile.xp ?? 0) % 100}/100
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all"
                style={{ width: `${(profile.xp ?? 0) % 100}%` }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground">XP al próximo nivel</p>
          </div>
        )}
      </motion.div>

      {/* Test diagnóstico: lo ofrecemos hasta que lo completen */}
      {!loadingCore && profile && !profile.diagnostic_completed && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
          <Link
            to="/diagnostic"
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary-soft/70 to-card p-5 shadow-soft transition hover:shadow-glow"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display text-base font-semibold">Hacé el test diagnóstico</p>
                <p className="text-sm text-muted-foreground">
                  ~5 minutos para calibrar tu nivel en cada tema y personalizar la práctica.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Empezar <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </motion.div>
      )}

      {/* Repaso pendiente (SRS) — solo si ya pasó el diagnóstico, para no apilar banners */}
      {!loadingCore && profile?.diagnostic_completed && dueCount > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
          <Link
            to="/review"
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 shadow-soft transition hover:shadow-glow"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-300">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display text-base font-semibold">
                  Tenés {dueCount} ejercicio{dueCount === 1 ? "" : "s"} para repasar
                </p>
                <p className="text-sm text-muted-foreground">
                  Repasá los que fallaste, en el momento justo para que se te fijen.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Repasar <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </motion.div>
      )}

      {/* Próximo paso destacado: lo primero accionable que ve un alumno que ya practicó */}
      {!loadingCore && !isNewUser && recommendation && (
        <div className="mt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Seguí con esto
          </h2>
          <RecommendedCard rec={recommendation} />
        </div>
      )}

      {/* Carga inicial: skeletons en vez de flash de contenido vacío */}
      {loadingCore ? (
        <div className="mt-8">
          <StatCardsSkeleton />
        </div>
      ) : isNewUser ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-6 rounded-2xl border bg-gradient-to-br from-primary-soft to-card p-6 shadow-soft md:p-8"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Sparkles className="h-4 w-4" />
            ¡Arranquemos!
          </div>
          <h2 className="mt-2 font-display text-2xl font-bold">Practicá tu primer ejercicio</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            En MatemathUp resolvés ejercicios generados por IA, adaptados a tu nivel. Empezá por un
            tema cualquiera del programa. La dificultad sube cuando vas bien y baja si te trabás.
            Cada respuesta te suma XP, rachas y desbloquea logros.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/topics"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:bg-primary/90"
            >
              Ver temas <ArrowRight className="h-4 w-4" />
            </Link>
            {recommendation && (
              <Link
                to="/topics/$slug"
                params={{ slug: recommendation.topic.slug }}
                className="inline-flex items-center gap-2 rounded-xl border bg-background px-4 py-2 text-sm font-semibold hover:border-primary/40"
              >
                Empezar con {recommendation.topic.name}
              </Link>
            )}
          </div>
        </motion.div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className="rounded-2xl border bg-card p-5 shadow-soft transition-shadow hover:shadow-glow"
            >
              <div className={`grid h-9 w-9 place-items-center rounded-lg ${s.color}`}>
                <s.icon className="h-4 w-4" />
              </div>
              <p className="mt-4 font-display text-2xl font-bold tabular-nums tracking-tight">
                {s.value}
              </p>
              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {s.label}
              </p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Meta diaria (retención) */}
      {!loadingCore && !isNewUser && profile && user && (
        <div className="mt-6">
          <DailyGoalWidget
            userId={user.id}
            goal={profile.daily_goal ?? 3}
            attempts={attempts}
            streak={profile.current_streak ?? 0}
          />
        </div>
      )}

      {/* Próximo examen */}
      {!isNewUser && (
        <div className="mt-10">
          <NextExamWidget />
        </div>
      )}

      {/* Qué me falta: temas más flojos primero */}
      {!isNewUser && <WeakSpots aggregates={aggregates} />}

      {/* Resumen de temas en progreso (top 3) */}
      {!isNewUser && recentTopicAggs.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">Más practicados últimamente</h2>
            <Link to="/progress" className="text-sm font-medium text-primary hover:underline">
              Ver progreso completo →
            </Link>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {recentTopicAggs.map((agg) => (
              <Link
                key={agg.topic.id}
                to="/topics/$slug"
                params={{ slug: agg.topic.slug }}
                className="rounded-2xl border bg-card p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-glow"
              >
                <p className="text-sm font-semibold">{agg.topic.name}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Progress value={agg.accuracy} className="h-1.5 flex-1" />
                  <span className="text-xs font-medium tabular-nums text-muted-foreground">
                    {agg.accuracy}%
                  </span>
                </div>
                <p className="mt-2 text-[11px] tabular-nums text-muted-foreground">
                  {agg.totalAttempts} intentos · nivel {agg.estimatedLevel}/5
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Todos los temas */}
      <div className="mt-12 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Todas las unidades</h2>
        <Link to="/topics" className="text-sm font-medium text-primary hover:underline">
          Ver todas →
        </Link>
      </div>

      {topicsPending ? (
        <div className="mt-4">
          <TopicGridSkeleton count={6} />
        </div>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {topics.map((t, i) => {
            const Icon = getTopicIcon(t.icon);
            const p = progressMap.get(t.id);
            const mastery = Math.round(Number(p?.mastery_pct ?? 0));
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 * i }}
              >
                <Link
                  to="/topics/$slug"
                  params={{ slug: t.slug }}
                  className="group block rounded-2xl border bg-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-glow"
                >
                  <div className="flex items-start justify-between">
                    <div
                      className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${topicGradient(t.color)}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold">{t.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.description}</p>
                  <div className="mt-4 flex items-center gap-3">
                    <Progress value={mastery} className="h-2" />
                    <span className="text-xs font-medium tabular-nums text-muted-foreground">
                      {mastery}%
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Mi Material */}
      <div className="mt-12">
        <MyMaterials />
      </div>

      {/* Badges preview */}
      {!isNewUser && badgeCount.earned > 0 && (
        <Link
          to="/progress"
          className="mt-12 flex items-center justify-between rounded-2xl border bg-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-glow"
        >
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-amber-500/25 to-amber-600/10 ring-1 ring-amber-500/40">
              <Trophy className="h-5 w-5 text-amber-600 dark:text-amber-300" />
            </div>
            <div>
              <p className="font-display text-base font-semibold">
                {badgeCount.earned}/{badgeCount.total} logros desbloqueados
              </p>
              <p className="text-xs text-muted-foreground">
                Mirá tu colección completa en Mi progreso.
              </p>
            </div>
          </div>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </Link>
      )}

      {/* Reportar problema: acción secundaria, al pie y sin competir con el saludo */}
      <div className="mt-10 flex justify-center">
        <ReportProblem variant="ghost" className="text-muted-foreground" />
      </div>
    </div>
  );
}
