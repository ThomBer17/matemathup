import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Progress } from "@/components/ui/progress";
import { getTopicIcon, topicGradient } from "@/lib/topic-icons";
import { TopicGridSkeleton } from "@/components/CardSkeletons";

export const Route = createFileRoute("/_authenticated/topics/")({
  component: TopicsPage,
});

function TopicsPage() {
  const { user } = useAuth();
  const { data: topics = [], isPending } = useQuery({
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
  const pmap = new Map(progress.map((p) => [p.topic_id, p]));

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:py-12">
      <h1 className="font-display text-3xl font-bold">Unidades</h1>
      <p className="mt-1 text-sm text-muted-foreground">Elegí un tema y empezá a practicar.</p>

      {isPending ? (
        <div className="mt-8">
          <TopicGridSkeleton count={6} />
        </div>
      ) : (
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {topics.map((t, i) => {
          const Icon = getTopicIcon(t.icon);
          const p = pmap.get(t.id);
          const mastery = Math.round(Number(p?.mastery_pct ?? 0));
          const done = p?.exercises_completed ?? 0;
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i }}
            >
              <Link
                to="/topics/$slug"
                params={{ slug: t.slug }}
                className="group block rounded-2xl border bg-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-glow"
              >
                <div className="flex items-start justify-between">
                  <div className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${topicGradient(t.color)}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{t.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.description}</p>
                <div className="mt-4 space-y-2">
                  <Progress value={mastery} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{mastery}% dominado</span>
                    <span>{done} ejercicios</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
      )}
    </div>
  );
}
