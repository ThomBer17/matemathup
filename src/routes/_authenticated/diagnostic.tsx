import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, Loader2, Sparkles, HelpCircle, Target, CalendarDays, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { MathRich } from "@/components/math/MathRich";
import { getTopicIcon, topicGradient } from "@/lib/topic-icons";
import { DIAGNOSTIC_QUESTIONS } from "@/content/diagnostic/questions";
import { scoreQuestion, levelLabel, summarize, type DiagnosticOutcome, type DiagnosticResult } from "@/lib/diagnostic/scoring";

export const Route = createFileRoute("/_authenticated/diagnostic")({
  component: DiagnosticPage,
});

interface AnswerRecord {
  questionId: string;
  topicSlug: string;
  difficulty: number;
  outcome: DiagnosticOutcome;
}

function DiagnosticPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: topics = [] } = useQuery({
    queryKey: ["topics"],
    queryFn: async () => {
      const { data } = await supabase.from("topics").select("id, slug, name, color, icon").order("order_index");
      return data ?? [];
    },
  });
  const topicBySlug = useMemo(() => new Map(topics.map((t) => [t.slug, t])), [topics]);

  const questions = DIAGNOSTIC_QUESTIONS;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);

  const q = questions[index];
  const isLast = index === questions.length - 1;

  const record = (outcome: DiagnosticOutcome) => {
    const next: AnswerRecord[] = [
      ...answers,
      { questionId: q.id, topicSlug: q.topicSlug, difficulty: q.difficulty, outcome },
    ];
    setAnswers(next);
    setPicked(null);
    if (isLast) {
      void finish(next);
    } else {
      setIndex((i) => i + 1);
    }
  };

  const answer = (optionIndex: number) => {
    setPicked(optionIndex);
    // Pequeño delay para que se vea la selección antes de avanzar.
    setTimeout(() => record(optionIndex === q.correctIndex ? "correct" : "incorrect"), 250);
  };

  const finish = async (all: AnswerRecord[]) => {
    setSaving(true);
    const computed = all.map((a) => scoreQuestion(a.topicSlug, a.difficulty, a.outcome));
    setResults(computed);
    setFinished(true);

    if (user) {
      try {
        // Punto de partida por tema → user_progress.
        const rows = computed
          .map((r) => {
            const topic = topicBySlug.get(r.topicSlug);
            if (!topic) return null;
            return {
              user_id: user.id,
              topic_id: topic.id,
              mastery_pct: r.masteryPct,
              current_difficulty: r.difficulty,
            };
          })
          .filter((x): x is NonNullable<typeof x> => x !== null);

        if (rows.length) {
          await supabase.from("user_progress").upsert(rows, { onConflict: "user_id,topic_id" });
        }
        await supabase.from("profiles").update({ diagnostic_completed: true }).eq("id", user.id);
        queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
        queryClient.invalidateQueries({ queryKey: ["progress", user.id] });
      } catch (e) {
        console.error("[diagnostic] guardar falló", e);
        toast.error("No pudimos guardar el diagnóstico, pero podés practicar igual.");
      }
    }
    setSaving(false);
  };

  if (finished) {
    return <DiagnosticResults results={results} topicBySlug={topicBySlug} saving={saving} />;
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-2xl flex-col px-6 py-8 md:py-12">
      <div className="flex items-center justify-between">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Salir
        </Link>
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          {index + 1} / {questions.length}
        </span>
      </div>

      <Progress value={((index) / questions.length) * 100} className="mt-3 h-1.5" />

      <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
        <Sparkles className="h-3.5 w-3.5" /> Test diagnóstico
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
          className="mt-3 flex flex-1 flex-col"
        >
          <p className="text-[11px] font-medium text-muted-foreground">
            {topicBySlug.get(q.topicSlug)?.name ?? q.topicSlug}
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold leading-snug tracking-tight">
            <MathRich text={q.statement} />
          </h1>

          <div className="mt-6 space-y-2.5">
            {q.options.map((opt, i) => (
              <button
                key={i}
                type="button"
                disabled={picked !== null}
                onClick={() => answer(i)}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-xl border bg-background p-3.5 text-left text-sm transition-all",
                  picked === null && "hover:border-primary/60 hover:bg-primary-soft/30 hover:shadow-soft",
                  picked === i && "border-primary ring-2 ring-primary/20",
                )}
              >
                <span className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-lg border text-xs font-bold transition-colors",
                  picked === i ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted/50 text-muted-foreground group-hover:border-primary/40 group-hover:text-primary",
                )}>
                  {["A", "B", "C", "D", "E"][i]}
                </span>
                <span className="min-w-0 flex-1"><MathRich text={opt} /></span>
              </button>
            ))}
          </div>

          <div className="mt-auto pt-6">
            <button
              type="button"
              disabled={picked !== null}
              onClick={() => record("skipped")}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              <HelpCircle className="h-4 w-4" /> No sé / saltear
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function DiagnosticResults({
  results, topicBySlug, saving,
}: {
  results: DiagnosticResult[];
  topicBySlug: Map<string, { id: string; slug: string; name: string; color: string | null; icon: string | null }>;
  saving: boolean;
}) {
  const { correct, total } = summarize(
    results.map((r) => ({ outcome: (r.masteryPct >= 45 ? "correct" : "incorrect") as DiagnosticOutcome })),
  );
  // Ordenados de más débil a más fuerte (para sugerir por dónde empezar).
  const sorted = [...results].sort((a, b) => a.masteryPct - b.masteryPct);
  const weakest = sorted[0] ? topicBySlug.get(sorted[0].topicSlug) : undefined;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 md:py-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-sky-600 text-white">
          <Check className="h-7 w-7" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold tracking-tight md:text-3xl">¡Diagnóstico listo!</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acertaste <span className="font-semibold tabular-nums text-foreground">{correct}</span> de {total}.
          Calibramos tu punto de partida en cada tema.
        </p>
        {saving && <Loader2 className="mx-auto mt-2 h-4 w-4 animate-spin text-muted-foreground" />}
      </motion.div>

      <div className="mt-8 space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tu punto de partida</h2>
        {sorted.map((r) => {
          const topic = topicBySlug.get(r.topicSlug);
          if (!topic) return null;
          const Icon = getTopicIcon(topic.icon);
          return (
            <Link
              key={r.topicSlug}
              to="/topics/$slug"
              params={{ slug: r.topicSlug }}
              className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-soft transition hover:-translate-y-0.5 hover:shadow-glow"
            >
              <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${topicGradient(topic.color)}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{topic.name}</p>
                <Progress value={r.masteryPct} className="mt-1 h-1.5" />
              </div>
              <span className="shrink-0 text-xs font-semibold text-muted-foreground">{levelLabel(r.difficulty)}</span>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        {weakest && (
          <Link
            to="/topics/$slug"
            params={{ slug: weakest.slug }}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:bg-primary/90"
          >
            <Target className="h-4 w-4" /> Empezar por {weakest.name}
          </Link>
        )}
        <Link
          to="/study"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border bg-background px-4 py-2.5 text-sm font-semibold transition hover:border-primary/40"
        >
          <CalendarDays className="h-4 w-4" /> Armar plan de estudio
        </Link>
      </div>
      <div className="mt-3 text-center">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          Ir al dashboard <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
