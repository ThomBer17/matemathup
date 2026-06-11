import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowRight, Library, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getTopicIcon, topicGradient } from "@/lib/topic-icons";
import { hasTheory } from "@/content/theory";
import { TopicGridSkeleton } from "@/components/CardSkeletons";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/theory/")({
  component: TheoryIndex,
});

function TheoryIndex() {
  const { data: topics = [], isPending } = useQuery({
    queryKey: ["topics"],
    queryFn: async () => {
      const { data } = await supabase.from("topics").select("*").order("order_index");
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 md:py-12">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <Library className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold">Teoría</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Tu biblioteca matemática: conceptos, fórmulas y ejemplos resueltos.
          </p>
        </div>
      </div>

      {isPending ? (
        <div className="mt-8">
          <TopicGridSkeleton count={6} />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {topics.map((t, i) => {
            const Icon = getTopicIcon(t.icon);
            const available = hasTheory(t.slug);
            const card = (
              <div
                className={cn(
                  "group block h-full rounded-2xl border bg-card p-5 shadow-soft transition",
                  available ? "hover:-translate-y-0.5 hover:shadow-glow" : "opacity-60",
                )}
              >
                <div className="flex items-start justify-between">
                  <div className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${topicGradient(t.color)}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  {available ? (
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" />
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Pronto
                    </span>
                  )}
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{t.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.description}</p>
                <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                  <BookOpen className="h-3.5 w-3.5" />
                  {available ? "Leer teoría" : "En preparación"}
                </p>
              </div>
            );
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 * i }}
              >
                {available ? (
                  <Link to="/theory/$slug" params={{ slug: t.slug }}>{card}</Link>
                ) : (
                  card
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
