import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Library, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getTopicIcon } from "@/lib/topic-icons";
import { hasTheory } from "@/content/theory";
import { TopicGridSkeleton } from "@/components/CardSkeletons";
import { HubCard } from "@/components/HubCard";

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
            const available = hasTheory(t.slug);
            const card = (
              <HubCard
                icon={getTopicIcon(t.icon)}
                color={t.color}
                title={t.name}
                description={t.description}
                available={available}
                cta="Leer teoría"
                ctaIcon={BookOpen}
              />
            );
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 * i }}
              >
                {available ? (
                  <Link to="/theory/$slug" params={{ slug: t.slug }}>
                    {card}
                  </Link>
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
