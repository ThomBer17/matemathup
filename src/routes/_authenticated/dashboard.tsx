import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Flame, Trophy, Target, BookOpen, ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Progress } from "@/components/ui/progress";
import { getTopicIcon, topicGradient } from "@/lib/topic-icons";

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

  const { data: topics = [] } = useQuery({
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

  const progressMap = new Map(progress.map((p) => [p.topic_id, p]));
  const totalEx = progress.reduce((s, p) => s + (p.exercises_completed ?? 0), 0);
  const avgMastery = topics.length
    ? Math.round(
        topics.reduce((s, t) => s + Number(progressMap.get(t.id)?.mastery_pct ?? 0), 0) / topics.length
      )
    : 0;
  const completed = topics.filter((t) => Number(progressMap.get(t.id)?.mastery_pct ?? 0) >= 80).length;

  const stats = [
    { label: "Avance general", value: `${avgMastery}%`, icon: Target, color: "text-sky-600 bg-sky-500/10" },
    { label: "Temas completados", value: `${completed}/${topics.length}`, icon: Trophy, color: "text-amber-600 bg-amber-500/10" },
    { label: "Ejercicios hechos", value: String(totalEx), icon: BookOpen, color: "text-violet-600 bg-violet-500/10" },
    { label: "Racha actual", value: `${profile?.current_streak ?? 0} días`, icon: Flame, color: "text-rose-600 bg-rose-500/10" },
  ];

  const firstName = profile?.full_name?.split(" ")[0] ?? "estudiante";

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:py-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-sm text-muted-foreground">Hola de nuevo,</p>
        <h1 className="font-display text-3xl font-bold md:text-4xl">
          ¿Qué resolvemos hoy, {firstName}?
        </h1>
      </motion.div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            className="rounded-2xl border bg-card p-5 shadow-soft"
          >
            <div className={`grid h-9 w-9 place-items-center rounded-lg ${s.color}`}>
              <s.icon className="h-4 w-4" />
            </div>
            <p className="mt-4 text-2xl font-bold font-display">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Tus unidades</h2>
        <Link to="/topics" className="text-sm font-medium text-primary hover:underline">
          Ver todas →
        </Link>
      </div>

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
              transition={{ delay: 0.05 * i }}
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
                <div className="mt-4 flex items-center gap-3">
                  <Progress value={mastery} className="h-2" />
                  <span className="text-xs font-medium text-muted-foreground">{mastery}%</span>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-10 rounded-2xl border bg-gradient-to-br from-primary-soft to-card p-6 shadow-soft">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-display text-lg font-semibold">Ejercicios infinitos con IA</h3>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Cuando entrás a un tema, generamos ejercicios nuevos adaptados a tu nivel.
          Si fallás, bajamos la dificultad. Si acertás, subimos.
        </p>
      </div>
    </div>
  );
}
