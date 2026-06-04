import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Lightbulb, Loader2, Sparkles, Check, X, RotateCw, LineChart, AlertCircle, Trophy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { generateExercise } from "@/lib/exercises.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTopicIcon, topicGradient } from "@/lib/topic-icons";
import { GraphCard } from "@/components/math/GraphCard";
import { detectFunctions } from "@/lib/math-detect";
import { ActivityGenerator } from "@/components/ai/ActivityGenerator";
import { CalculatorFAB } from "@/components/calculator/CalculatorFAB";
import { MathWorkspace } from "@/components/workspace/MathWorkspace";
import { ReportProblem } from "@/components/feedback/ReportProblem";
import { MathInputHelper } from "@/components/math/MathInputHelper";
import { MathPreview } from "@/components/math/MathPreview";
import { answersEqual, displayCorrectAnswer, normalizeTrueFalse, trueFalseLabel } from "@/lib/answer-normalize";
import { PaywallDialog } from "@/components/billing/PaywallDialog";
import { isFreemiumLimitError } from "@/lib/billing/plans";
import type { DifficultyLevel } from "@/lib/ai/types";

export const Route = createFileRoute("/_authenticated/topics/$slug")({
  component: TopicPage,
});

type AIExercise = {
  id: string;
  statement: string;
  type: "multiple_choice" | "true_false" | "open";
  options: string[] | null;
  correct_answer: string;
  explanation: string;
  hints: string[];
  graph_expressions?: string[];
  difficulty: number;
};

function TopicPage() {
  const { slug } = useParams({ from: "/_authenticated/topics/$slug" });
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const genFn = useServerFn(generateExercise);

  const { data: topic } = useQuery({
    queryKey: ["topic", slug],
    queryFn: async () => {
      const { data } = await supabase.from("topics").select("*").eq("slug", slug).single();
      return data;
    },
  });

  const { data: progressRow, refetch: refetchProgress } = useQuery({
    queryKey: ["progress", user?.id, topic?.id],
    enabled: !!user && !!topic,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", user!.id)
        .eq("topic_id", topic!.id)
        .maybeSingle();
      return data;
    },
  });

  const [difficulty, setDifficulty] = useState(2);
  useEffect(() => {
    if (progressRow?.current_difficulty) setDifficulty(progressRow.current_difficulty);
  }, [progressRow?.current_difficulty]);

  const [exercise, setExercise] = useState<AIExercise | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [adaptiveLimited, setAdaptiveLimited] = useState(false);
  const [answer, setAnswer] = useState("");
  const openAnswerRef = useRef<HTMLInputElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [hintIndex, setHintIndex] = useState(-1);
  const [sessionCount, setSessionCount] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [showGraph, setShowGraph] = useState(false);

  const Icon = getTopicIcon(topic?.icon);
  const mastery = Math.round(Number(progressRow?.mastery_pct ?? 0));
  const completed = progressRow?.exercises_completed ?? 0;
  const mastered = mastery >= 95 && completed >= 5;

  // Prefetch del próximo ejercicio: se genera en background mientras el alumno
  // lee la explicación, así "Siguiente" se siente instantáneo.
  const prefetchRef = useRef<{ difficulty: number; promise: Promise<AIExercise> } | null>(null);

  const fetchExercise = async (diff: number): Promise<AIExercise> => {
    if (!topic) throw new Error("Sin tema");
    let avoid: string[] = [];
    if (user) {
      const { data: recent } = await supabase
        .from("exercises")
        .select("statement")
        .eq("topic_id", topic.id)
        .eq("created_by", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      avoid = (recent ?? []).map((r) => r.statement).filter(Boolean);
    }
    return genFn({ data: { topicId: topic.id, topicName: topic.name, difficulty: diff, avoid } });
  };

  const startPrefetch = (diff: number) => {
    if (!topic) return;
    prefetchRef.current = { difficulty: diff, promise: fetchExercise(diff).catch(() => {
      // si falla el prefetch, lo descartamos silenciosamente; loadNew hará fetch fresco
      prefetchRef.current = null;
      throw new Error("prefetch failed");
    }) };
  };

  const loadNew = async () => {
    if (!topic) return;
    setLoading(true);
    setLoadError(null);
    setExercise(null);
    setAnswer("");
    setRevealed(false);
    setIsCorrect(null);
    setHintIndex(-1);
    setShowGraph(false);
    try {
      // Si hay un prefetch listo para la dificultad actual, lo usamos (instantáneo).
      const pf = prefetchRef.current;
      prefetchRef.current = null;
      const ex =
        pf && pf.difficulty === difficulty
          ? await pf.promise.catch(() => fetchExercise(difficulty))
          : await fetchExercise(difficulty);
      // Render guard defensivo: nunca renderizar un ejercicio incompleto.
      if (
        !ex ||
        !ex.statement ||
        ex.statement.trim().length < 10 ||
        !ex.correct_answer ||
        (ex.type === "multiple_choice" && (!ex.options || ex.options.length < 2))
      ) {
        throw new Error("No pudimos generar un ejercicio válido. Reintentá.");
      }
      setExercise(ex);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al generar el ejercicio";
      // Límite freemium → paywall amable, no error técnico.
      if (isFreemiumLimitError(msg) === "adaptive") {
        setAdaptiveLimited(true);
        setPaywallOpen(true);
      } else {
        setLoadError(msg);
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // auto-load first exercise
  useEffect(() => {
    if (topic && !exercise && !loading) loadNew();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic?.id]);

  const checkAnswer = (a: string) => {
    if (!exercise) return;
    const correct = answersEqual(a, exercise.correct_answer, exercise.type);
    setIsCorrect(correct);
    setRevealed(true);
    if (correct) {
      const xpGain = 10 + difficulty * 2;
      toast.success(`¡Correcto! +${xpGain} XP`);
    } else {
      toast.error("Casi. Mirá la explicación.");
    }
    persistAttempt(correct);
  };

  const persistAttempt = async (correct: boolean) => {
    if (!exercise || !user || !topic) return;
    const { error: attemptError } = await supabase.from("exercise_attempts").insert({
      user_id: user.id,
      exercise_id: exercise.id,
      topic_id: topic.id,
      user_answer: answer,
      is_correct: correct,
      status: correct ? "correct" : "incorrect",
      source: "adaptive",
      difficulty,
      hint_used: hintIndex >= 0,
    });
    if (attemptError) {
      console.error("[persistAttempt] insert exercise_attempts falló:", attemptError);
      toast.error(`No se pudo guardar el intento: ${attemptError.message}`);
    }

    // adaptive: track recent results, adjust difficulty
    const recent: boolean[] = Array.isArray(progressRow?.recent_results)
      ? (progressRow!.recent_results as boolean[])
      : [];
    const newRecent = [...recent, correct].slice(-5);
    let newDifficulty = difficulty;
    const lastThree = newRecent.slice(-3);
    if (lastThree.length === 3 && lastThree.every((r) => r) && difficulty < 5) newDifficulty = difficulty + 1;
    if (lastThree.length === 3 && lastThree.every((r) => !r) && difficulty > 1) newDifficulty = difficulty - 1;

    // Prefetch del próximo ejercicio mientras el alumno lee la explicación:
    // usa la dificultad ya ajustada para que "Siguiente" sea instantáneo.
    startPrefetch(newDifficulty);

    const completed = (progressRow?.exercises_completed ?? 0) + 1;
    const correctCount = (progressRow?.correct_count ?? 0) + (correct ? 1 : 0);
    const masteryPct = Math.min(100, Math.round((correctCount / completed) * 100));

    await supabase.from("user_progress").upsert(
      {
        user_id: user.id,
        topic_id: topic.id,
        current_difficulty: newDifficulty,
        exercises_completed: completed,
        correct_count: correctCount,
        mastery_pct: masteryPct,
        recent_results: newRecent,
      },
      { onConflict: "user_id,topic_id" }
    );

    // streak + xp on profile
    const today = new Date().toISOString().slice(0, 10);
    const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (prof) {
      const last = prof.last_activity_date;
      const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      let streak = prof.current_streak ?? 0;
      if (last !== today) streak = last === yest ? streak + 1 : 1;
      const xpGain = correct ? 10 + difficulty * 2 : 2;
      const newXp = (prof.xp ?? 0) + xpGain;
      const newLevel = 1 + Math.floor(newXp / 100);
      await supabase.from("profiles").update({
        current_streak: streak,
        longest_streak: Math.max(prof.longest_streak ?? 0, streak),
        last_activity_date: today,
        xp: newXp,
        level: newLevel,
      }).eq("id", user.id);
    }

    setDifficulty(newDifficulty);
    setSessionCount((c) => c + 1);
    if (correct) setSessionCorrect((c) => c + 1);
    refetchProgress();
    // Invalida los queries de perfil para que el StreakWidget + dashboard reflejen XP/racha al instante
    queryClient.invalidateQueries({ queryKey: ["profile-mini", user.id] });
    queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
    queryClient.invalidateQueries({ queryKey: ["my-attempts-dash", user.id] });
    queryClient.invalidateQueries({ queryKey: ["my-attempts", user.id] });
    queryClient.invalidateQueries({ queryKey: ["usage-status", user.id] });
  };

  const useHint = () => {
    if (!exercise) return;
    const next = Math.min(hintIndex + 1, (exercise.hints?.length ?? 1) - 1);
    setHintIndex(next);
  };

  const diffLabel = useMemo(
    () => ["Muy fácil", "Fácil", "Intermedio", "Difícil", "Muy difícil"][difficulty - 1] ?? "Intermedio",
    [difficulty]
  );

  if (!topic) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 md:py-12">
      <Link to="/topics" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver
      </Link>

      <div className="mt-4 flex items-start gap-4">
        <div className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${topicGradient(topic.color)}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h1 className="font-display text-3xl font-bold">{topic.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{topic.description}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat label="Dificultad" value={diffLabel} />
        <Stat label="Dominio" value={`${mastery}%`} />
        <Stat
          label="Resueltos"
          value={completed.toString()}
          hint={sessionCount > 0 ? `+${sessionCorrect}/${sessionCount} en esta sesión` : undefined}
        />
      </div>

      {mastered && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300"
        >
          <Trophy className="h-4 w-4 shrink-0" />
          <span>¡Tema dominado! Seguí generando ejercicios para mantener el nivel.</span>
        </motion.div>
      )}

      <div className="mt-2"><Progress value={mastery} className="h-1.5" /></div>

      <Tabs defaultValue="practica" className="mt-8">
        <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-flex">
          <TabsTrigger value="practica" className="gap-2">
            <RotateCw className="h-3.5 w-3.5" />
            Práctica adaptativa
          </TabsTrigger>
          <TabsTrigger value="tanda" className="gap-2">
            <Sparkles className="h-3.5 w-3.5" />
            Tanda IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="practica" className="mt-4">
          <div className="rounded-2xl border bg-card p-6 shadow-soft md:p-8">
        {loading && (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <Sparkles className="h-6 w-6 animate-pulse text-primary" />
            <p className="text-sm">Generando ejercicio adaptado a tu nivel…</p>
          </div>
        )}

        {!loading && !exercise && loadError && (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="max-w-sm">
              <p className="text-sm font-medium">{loadError}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Puede ser un fallo transitorio del modelo. Reintentá en un momento.
              </p>
            </div>
            <Button onClick={loadNew} size="sm" className="gap-2">
              <RotateCw className="h-4 w-4" />
              Reintentar
            </Button>
          </div>
        )}

        {!loading && !exercise && adaptiveLimited && (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="max-w-sm">
              <p className="font-display text-base font-semibold">Llegaste al límite diario 🙂</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Completaste tus ejercicios gratis de hoy. Volvé mañana o pasate a Premium para
                practicar sin límites.
              </p>
            </div>
            <Button onClick={() => setPaywallOpen(true)} size="sm" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Pasar a Premium
            </Button>
          </div>
        )}

        {!loading && !exercise && !loadError && !adaptiveLimited && (
          <div className="flex flex-col items-center gap-4 py-10 text-center text-muted-foreground">
            <Sparkles className="h-6 w-6 text-primary" />
            <p className="text-sm">Listo para empezar.</p>
            <Button onClick={loadNew} size="sm" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Generar ejercicio
            </Button>
          </div>
        )}

        {!loading && exercise && (
          <AnimatePresence mode="wait">
            <motion.div
              key={exercise.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="text-xs font-medium uppercase tracking-wide text-primary">
                Ejercicio · nivel {difficulty}
              </div>
              <h2 className="mt-2 font-display text-xl font-semibold leading-snug md:text-2xl">
                {exercise.statement}
              </h2>

              {(() => {
                const aiExprs = exercise.graph_expressions ?? [];
                const detected = aiExprs.length ? [] : detectFunctions(exercise.statement);
                const exprs = aiExprs.length
                  ? aiExprs.map((latex, i) => ({ id: `ai${i}`, latex, color: i === 0 ? "#0EA5E9" : "#8B5CF6" }))
                  : detected.map((d, i) => ({ id: `d${i}`, latex: d.latex, color: "#0EA5E9", label: d.label }));
                if (!exprs.length) return null;
                return (
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowGraph((s) => !s)}
                      className="gap-2"
                    >
                      <LineChart className="h-4 w-4" />
                      {showGraph ? "Ocultar gráfica" : "Ver gráfica"}
                    </Button>
                    {showGraph && (
                      <div className="mt-3">
                        <GraphCard expressions={exprs} height={320} />
                      </div>
                    )}
                  </div>
                );
              })()}


              <div className="mt-6 space-y-2">
                {exercise.type === "multiple_choice" && exercise.options?.map((opt) => {
                  const isPicked = answer === opt;
                  const isRight = revealed && answersEqual(opt, exercise.correct_answer, "multiple_choice");
                  const isWrong = revealed && isPicked && !isRight;
                  return (
                    <button
                      key={opt}
                      disabled={revealed}
                      onClick={() => { setAnswer(opt); checkAnswer(opt); }}
                      className={`w-full rounded-xl border bg-background p-4 text-left text-sm transition hover:border-primary hover:bg-primary-soft/40
                        ${isRight ? "border-success bg-success/10" : ""}
                        ${isWrong ? "border-destructive bg-destructive/10" : ""}
                        ${isPicked && !revealed ? "border-primary" : ""}`}
                    >
                      {opt}
                    </button>
                  );
                })}

                {exercise.type === "true_false" && (() => {
                  const correctCanonical = normalizeTrueFalse(exercise.correct_answer);
                  return (
                    <div className="grid grid-cols-2 gap-2">
                      {(["true", "false"] as const).map((v) => {
                        const label = trueFalseLabel(v);
                        const isPicked = answer === v;
                        const isRight = revealed && correctCanonical === v;
                        const isWrong = revealed && isPicked && !isRight;
                        return (
                          <button
                            key={v}
                            disabled={revealed}
                            onClick={() => { setAnswer(v); checkAnswer(v); }}
                            className={`rounded-xl border bg-background p-4 text-sm font-medium transition hover:border-primary
                              ${isRight ? "border-success bg-success/10" : ""}
                              ${isWrong ? "border-destructive bg-destructive/10" : ""}`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}

                {exercise.type === "open" && (
                  <form
                    onSubmit={(e) => { e.preventDefault(); if (!revealed) checkAnswer(answer); }}
                    className="space-y-2"
                  >
                    <div className="flex gap-2">
                      <Input
                        ref={openAnswerRef}
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        disabled={revealed}
                        placeholder="Escribí tu respuesta"
                        className="font-mono"
                      />
                      {!revealed && <Button type="submit">Enviar</Button>}
                    </div>
                    <MathInputHelper
                      targetRef={openAnswerRef}
                      value={answer}
                      onChange={setAnswer}
                      disabled={revealed}
                    />
                    <MathPreview value={answer} />
                  </form>
                )}
              </div>

              {hintIndex >= 0 && exercise.hints?.[hintIndex] && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="mt-4 flex gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm">
                  <Lightbulb className="h-4 w-4 shrink-0 text-warning-foreground/80" />
                  <span>{exercise.hints[hintIndex]}</span>
                </motion.div>
              )}

              {revealed && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-6 rounded-xl border p-4 ${
                    isCorrect ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {isCorrect ? <Check className="h-4 w-4 text-success" /> : <X className="h-4 w-4 text-destructive" />}
                    {isCorrect ? "¡Bien hecho!" : `Respuesta correcta: ${displayCorrectAnswer(exercise.correct_answer, exercise.type)}`}
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                    {exercise.explanation}
                  </p>
                </motion.div>
              )}

              <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={useHint}
                  disabled={revealed || !exercise.hints?.length || hintIndex >= exercise.hints.length - 1}
                >
                  <Lightbulb className="mr-2 h-4 w-4" />
                  Pista
                </Button>
                {revealed && (
                  <Button onClick={loadNew} className="gap-2">
                    <RotateCw className="h-4 w-4" />
                    Siguiente
                  </Button>
                )}
              </div>

              <div className="mt-2 flex justify-end">
                <ReportProblem
                  className="text-muted-foreground"
                  context={{
                    topic: topic.name,
                    exerciseId: exercise.id,
                    difficulty,
                    metadata: {
                      exercise_type: exercise.type,
                      correct_answer: exercise.correct_answer,
                      user_answer: answer,
                      source: "adaptive",
                      statement: exercise.statement,
                    },
                  }}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        )}
          </div>
        </TabsContent>

        <TabsContent value="tanda" className="mt-4">
          <div className="rounded-2xl border bg-card p-6 shadow-soft md:p-8">
            <ActivityGenerator
              topicId={topic.id}
              topicName={topic.name}
              initialLevel={difficultyToLevel(difficulty)}
            />
          </div>
        </TabsContent>
      </Tabs>

      <CalculatorFAB />
      <MathWorkspace storageKey={`mathup:workspace:${slug}`} />
      <PaywallDialog open={paywallOpen} onOpenChange={setPaywallOpen} kind="adaptive" />
    </div>
  );
}

function difficultyToLevel(d: number): DifficultyLevel {
  if (d <= 2) return "básico";
  if (d >= 4) return "alto";
  return "intermedio";
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-display text-sm font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
