import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Flame, Trophy, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Progress } from "@/components/ui/progress";
import { BadgeGrid } from "@/components/gamification/BadgeGrid";
import {
  aggregateByTopic,
  computeOverall,
  type AttemptRow,
  type TopicMeta,
} from "@/lib/progress/aggregate";
import { computeBadges, badgeStats } from "@/lib/gamification/badges";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      return data;
    },
  });

  const { data: attempts = [] } = useQuery({
    queryKey: ["my-attempts-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("exercise_attempts")
        .select("id, is_correct, status, source, difficulty, topic_id, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1000);
      return (data ?? []) as AttemptRow[];
    },
  });

  const { data: topics = [] } = useQuery({
    queryKey: ["topics-profile"],
    queryFn: async () => {
      const { data } = await supabase
        .from("topics")
        .select("id, name, slug, color, icon")
        .order("order_index");
      return (data ?? []) as TopicMeta[];
    },
  });

  const { badges, badgeCount } = useMemo(() => {
    const metaById = new Map(topics.map((t) => [t.id, t]));
    const aggs = aggregateByTopic(attempts, metaById);
    const ctx = {
      overall: computeOverall(attempts),
      aggregates: aggs,
      profile: profile ?? null,
      totalTopics: topics.length,
    };
    const computed = computeBadges(ctx);
    return { badges: computed, badgeCount: badgeStats(computed) };
  }, [attempts, topics, profile]);

  const xp = profile?.xp ?? 0;
  const level = profile?.level ?? 1;
  const xpInLevel = xp % 100;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 md:py-12">
      <h1 className="font-display text-3xl font-bold">Tu perfil</h1>
      <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>

      <div className="mt-8 rounded-2xl border bg-gradient-to-br from-primary-soft to-card p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-primary">Nivel actual</p>
            <p className="font-display text-4xl font-bold">Nivel {level}</p>
          </div>
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Zap className="h-7 w-7" />
          </div>
        </div>
        <div className="mt-5 space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{xpInLevel} XP</span>
            <span>{100 - xpInLevel} XP para el siguiente nivel</span>
          </div>
          <Progress value={xpInLevel} className="h-2" />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card
          icon={Flame}
          label="Racha actual"
          value={`${profile?.current_streak ?? 0} días`}
          color="text-rose-600 bg-rose-500/10"
        />
        <Card
          icon={Trophy}
          label="Mejor racha"
          value={`${profile?.longest_streak ?? 0} días`}
          color="text-amber-600 bg-amber-500/10"
        />
        <Card
          icon={Trophy}
          label="Logros"
          value={`${badgeCount.earned}/${badgeCount.total}`}
          color="text-violet-600 bg-violet-500/10"
        />
      </div>

      <div className="mt-10 space-y-3">
        <h2 className="font-display text-xl font-semibold">Tu colección de logros</h2>
        <BadgeGrid badges={badges} />
      </div>
    </div>
  );
}

function Card({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft">
      <div className={`grid h-9 w-9 place-items-center rounded-lg ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-4 font-display text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
