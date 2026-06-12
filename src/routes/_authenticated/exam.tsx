import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Loader2, Trophy, Clock, Check, X, Play, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { MathRich } from "@/components/math/MathRich";
import { StepByStepExplanation } from "@/components/math/StepByStepExplanation";
import { answersEqual } from "@/lib/answer-normalize";
import { newItem } from "@/lib/review/srs";
import { scoreExam, examGrade, shuffle, type ExamQuestion, type ExamAnswer } from "@/lib/exam/score";

export const Route = createFileRoute("/_authenticated/exam")({
  component: ExamPage,
});

const COUNTS = [10, 15, 20];
const SECONDS_PER_Q = 90;
const LETTERS = ["A", "B", "C", "D", "E"];

type Phase = "setup" | "running" | "results";

function ExamPage() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>("setup");

  const { data: topics = [] } = useQuery({
    queryKey: ["topics"],
    queryFn: async () => {
      const { data } = await supabase.from("topics").select("id, slug, name").order("order_index");
      return data ?? [];
    },
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const finishedRef = useRef(false);

  const allSelected = topics.length > 0 && selected.size === topics.length;
  const effectiveTopics = selected.size > 0 ? Array.from(selected) : topics.map((t) => t.id);

  const start = async () => {
    setLoading(true);
    try {
      const nameById = new Map(topics.map((t) => [t.id, t.name]));
      const { data } = await supabase
        .from("exercises")
        .select("id, statement, options, correct_answer, explanation, topic_id")
        .eq("type", "multiple_choice")
        .eq("approved", true)
        .in("topic_id", effectiveTopics)
        .limit(200);

      const pool = (data ?? [])
        .filter((e) => Array.isArray(e.options) && e.options.length >= 2)
        .map((e) => ({
          id: e.id as string,
          topicId: e.topic_id as string | null,
          topicName: e.topic_id ? nameById.get(e.topic_id) ?? null : null,
          statement: e.statement as string,
          options: e.options as string[],
          correctAnswer: e.correct_answer as string,
          explanation: e.explanation as string,
        }));

      if (pool.length === 0) {
        toast.error("Todavía no hay ejercicios para el simulacro de esos temas. Practicá un poco primero.");
        setLoading(false);
        return;
      }

      const chosen = shuffle(pool).slice(0, count);
      setQuestions(chosen);
      setPicks({});
      finishedRef.current = false;
      setSecondsLeft(chosen.length * SECONDS_PER_Q);
      setPhase("running");
    } finally {
      setLoading(false);
    }
  };

  // Cronómetro.
  useEffect(() => {
    if (phase !== "running") return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          finish();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const answers: ExamAnswer[] = useMemo(
    () =>
      questions.map((q) => {
        const selectedOpt = picks[q.id] ?? null;
        return {
          question: q,
          selected: selectedOpt,
          correct: selectedOpt != null && answersEqual(selectedOpt, q.correctAnswer, "multiple_choice"),
        };
      }),
    [questions, picks],
  );

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setPhase("results");

    if (user) {
      const now = new Date().toISOString();
      // Registrar intentos + encolar los fallados al repaso espaciado.
      const attemptRows = answers.map((a) => ({
        user_id: user.id,
        exercise_id: a.question.id,
        topic_id: a.question.topicId,
        user_answer: a.selected ?? "",
        is_correct: a.correct,
        status: a.correct ? "correct" : "incorrect",
        source: "exam",
      }));
      void supabase.from("exercise_attempts").insert(attemptRows);

      const wrong = answers.filter((a) => !a.correct);
      if (wrong.length) {
        const init = newItem();
        void supabase.from("srs_items").upsert(
          wrong.map((a) => ({
            user_id: user.id,
            exercise_id: a.question.id,
            topic_id: a.question.topicId,
            box: init.box,
            due_at: init.dueAt,
            updated_at: now,
          })),
          { onConflict: "user_id,exercise_id" },
        );
      }
    }
  };

  if (phase === "results") {
    return <ExamResults answers={answers} onRetry={() => setPhase("setup")} />;
  }

  if (phase === "running") {
    const answered = Object.keys(picks).length;
    const mm = Math.floor(secondsLeft / 60);
    const ss = String(secondsLeft % 60).padStart(2, "0");
    const low = secondsLeft <= 30;
    return (
      <div className="mx-auto max-w-2xl px-6 py-6">
        <div className="sticky top-14 z-10 -mx-6 mb-4 flex items-center justify-between border-b bg-background/90 px-6 py-3 backdrop-blur">
          <span className="text-sm font-medium text-muted-foreground tabular-nums">
            {answered}/{questions.length} respondidas
          </span>
          <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-bold tabular-nums", low ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary")}>
            <Clock className="h-4 w-4" /> {mm}:{ss}
          </span>
        </div>

        <div className="space-y-6">
          {questions.map((q, qi) => (
            <div key={q.id} className="rounded-2xl border bg-card p-5 shadow-soft">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-bold text-primary">{qi + 1}.</span>
                <p className="font-display text-base font-semibold leading-snug"><MathRich text={q.statement} /></p>
              </div>
              <div className="mt-3 space-y-2">
                {q.options.map((opt, i) => {
                  const isPicked = picks[q.id] === opt;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPicks((p) => ({ ...p, [q.id]: opt }))}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-xl border bg-background p-3 text-left text-sm transition-all hover:border-primary/60 hover:bg-primary-soft/30",
                        isPicked && "border-primary ring-2 ring-primary/20",
                      )}
                    >
                      <span className={cn(
                        "grid h-6 w-6 shrink-0 place-items-center rounded-lg border text-xs font-bold",
                        isPicked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted/50 text-muted-foreground",
                      )}>
                        {LETTERS[i] ?? i + 1}
                      </span>
                      <span className="min-w-0 flex-1"><MathRich text={opt} /></span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={finish}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:bg-primary/90"
          >
            <Check className="h-4 w-4" /> Finalizar simulacro
          </button>
        </div>
      </div>
    );
  }

  // --- Setup ---
  return (
    <div className="mx-auto max-w-2xl px-6 py-8 md:py-12">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Volver
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white">
          <Trophy className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Simulacro de examen</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Cronometrado, como el día del examen. Al final, tu nota y repaso.</p>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Temas</h2>
          <button
            type="button"
            onClick={() => setSelected(allSelected ? new Set() : new Set(topics.map((t) => t.id)))}
            className="text-xs font-medium text-primary hover:underline"
          >
            {allSelected ? "Ninguno" : "Todos"}
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Sin selección = todos los temas.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {topics.map((t) => {
            const on = selected.has(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelected((s) => { const n = new Set(s); n.has(t.id) ? n.delete(t.id) : n.add(t.id); return n; })}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                  on ? "border-primary bg-primary/10 text-primary" : "bg-background hover:border-primary/40",
                )}
              >
                {t.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold">Cantidad de preguntas</h2>
        <div className="mt-3 flex gap-2">
          {COUNTS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCount(c)}
              className={cn(
                "flex-1 rounded-xl border px-4 py-3 text-center transition-colors",
                count === c ? "border-primary bg-primary/10" : "bg-background hover:border-primary/40",
              )}
            >
              <span className="font-display text-lg font-bold tabular-nums">{c}</span>
              <span className="block text-[11px] text-muted-foreground">{Math.round((c * SECONDS_PER_Q) / 60)} min</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-start gap-2 rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        El simulacro usa ejercicios que ya practicaste o se generaron. Si un tema es nuevo, va a tener menos preguntas.
      </div>

      <button
        type="button"
        onClick={start}
        disabled={loading}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-soft hover:bg-primary/90 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        Comenzar simulacro
      </button>
    </div>
  );
}

function ExamResults({ answers, onRetry }: { answers: ExamAnswer[]; onRetry: () => void }) {
  const score = scoreExam(answers);
  const grade = examGrade(score.pct);
  const pass = score.pct >= 60;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 md:py-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className={cn("mx-auto grid h-16 w-16 place-items-center rounded-2xl text-white", pass ? "bg-gradient-to-br from-emerald-500 to-green-600" : "bg-gradient-to-br from-amber-500 to-orange-600")}>
          <Trophy className="h-8 w-8" />
        </div>
        <p className="mt-4 font-display text-5xl font-bold tabular-nums">{grade}<span className="text-2xl text-muted-foreground">/10</span></p>
        <p className="mt-1 text-sm text-muted-foreground">
          {score.correct} de {score.total} correctas · {score.pct}%
        </p>
      </motion.div>

      <div className="mt-8 space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Por tema</h2>
        {score.byTopic.map((t) => (
          <div key={t.topicName} className="flex items-center justify-between rounded-xl border bg-card p-3 text-sm shadow-soft">
            <span className="font-medium">{t.topicName}</span>
            <span className="tabular-nums text-muted-foreground">{t.correct}/{t.total}</span>
          </div>
        ))}
      </div>

      <div className="mt-8 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Revisión</h2>
        {answers.map((a, i) => (
          <div key={a.question.id} className={cn("rounded-2xl border p-4 shadow-soft", a.correct ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5")}>
            <div className="flex items-baseline gap-2">
              <span className={cn("mt-0.5", a.correct ? "text-success" : "text-destructive")}>
                {a.correct ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
              </span>
              <p className="text-sm font-medium leading-snug"><span className="text-muted-foreground">{i + 1}. </span><MathRich text={a.question.statement} /></p>
            </div>
            {!a.correct && (
              <div className="mt-2 pl-6 text-sm">
                <p className="text-muted-foreground">Tu respuesta: <span className="text-foreground">{a.selected ? <MathRich text={a.selected} /> : "—"}</span></p>
                <p className="text-muted-foreground">Correcta: <MathRich text={a.question.correctAnswer} className="text-foreground" /></p>
                <StepByStepExplanation text={a.question.explanation} className="mt-2" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <button onClick={onRetry} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:bg-primary/90">
          <Play className="h-4 w-4" /> Otro simulacro
        </button>
        <Link to="/review" className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border bg-background px-4 py-2.5 text-sm font-semibold hover:border-primary/40">
          Repasar los errores
        </Link>
      </div>
    </div>
  );
}
