import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Lightbulb,
  Loader2,
  Sparkles,
  Check,
  X,
  RotateCw,
  RefreshCcw,
  LineChart,
  AlertCircle,
  Trophy,
  BookText,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { useServerFn } from "@tanstack/react-start";
import { generateExercise } from "@/lib/exercises.functions";
import { recordAdaptiveAttempt } from "@/lib/progress/adaptive.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTopicIcon, topicGradient } from "@/lib/topic-icons";
import { detectFunctions } from "@/lib/math-detect";
import { ReportProblem } from "@/components/feedback/ReportProblem";
import { MathInputHelper } from "@/components/math/MathInputHelper";
import { MathPreview } from "@/components/math/MathPreview";
import { StepByStepExplanation } from "@/components/math/StepByStepExplanation";
import { MathRich } from "@/components/math/MathRich";
import {
  answersEqual,
  displayCorrectAnswer,
  normalizeTrueFalse,
  trueFalseLabel,
} from "@/lib/answer-normalize";
import { PaywallDialog } from "@/components/billing/PaywallDialog";
import { isFreemiumLimitError } from "@/lib/billing/plans";
import { track, EV } from "@/lib/analytics/events";
import { cn } from "@/lib/utils";
import { hasTheory } from "@/content/theory";
import {
  adaptiveDifficultyToLevel,
  buildAdaptiveGraphExpressions,
  isRenderableAdaptiveExercise,
} from "@/lib/progress/adaptive-view";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

const GraphCard = lazy(() =>
  import("@/components/math/GraphCard").then((module) => ({ default: module.GraphCard })),
);
const ActivityGenerator = lazy(() =>
  import("@/components/ai/ActivityGenerator").then((module) => ({
    default: module.ActivityGenerator,
  })),
);
const CalculatorFAB = lazy(() =>
  import("@/components/calculator/CalculatorFAB").then((module) => ({
    default: module.CalculatorFAB,
  })),
);
const FormulasFAB = lazy(() =>
  import("@/components/formulas/FormulasFAB").then((module) => ({ default: module.FormulasFAB })),
);
const MathWorkspace = lazy(() =>
  import("@/components/workspace/MathWorkspace").then((module) => ({
    default: module.MathWorkspace,
  })),
);

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
  const recordAttemptFn = useServerFn(recordAdaptiveAttempt);

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
  const [retryCount, setRetryCount] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [hintIndex, setHintIndex] = useState(-1);
  const [lastXp, setLastXp] = useState(0);
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
    prefetchRef.current = {
      difficulty: diff,
      promise: fetchExercise(diff).catch(() => {
        // si falla el prefetch, lo descartamos silenciosamente; loadNew hará fetch fresco
        prefetchRef.current = null;
        throw new Error("prefetch failed");
      }),
    };
  };

  const loadNew = async () => {
    if (!topic) return;
    setLoading(true);
    setLoadError(null);
    setExercise(null);
    setAnswer("");
    setRevealed(false);
    setIsCorrect(null);
    setRetryCount(0);
    setShowSolution(false);
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
      if (!isRenderableAdaptiveExercise(ex)) {
        throw new Error("No pudimos generar un ejercicio válido. Reintentá.");
      }
      setExercise(ex);
      track(EV.exerciseGenerated, {
        entityType: "exercise",
        entityId: ex.id,
        metadata: { topic: topic.name, difficulty },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al generar el ejercicio";
      // Límite freemium → paywall amable, no error técnico.
      const limitKind = isFreemiumLimitError(msg);
      if (limitKind === "adaptive" || limitKind === "adaptive_generation") {
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
    setShowSolution(correct || retryCount > 0);
    const evMeta = { topic: topic?.name, difficulty, exercise_type: exercise.type };
    track(EV.exerciseAnswered, { entityType: "exercise", entityId: exercise.id, metadata: evMeta });
    track(correct ? EV.exerciseCorrect : EV.exerciseIncorrect, {
      entityType: "exercise",
      entityId: exercise.id,
      metadata: evMeta,
    });
    void persistAttempt(a, correct);
  };

  const persistAttempt = async (submittedAnswer: string, optimisticCorrect: boolean) => {
    if (!exercise || !user || !topic) return;
    let result;
    try {
      result = await recordAttemptFn({
        data: { exerciseId: exercise.id, userAnswer: submittedAnswer, hintUsed: hintIndex >= 0 },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo guardar el intento.";
      toast.error(msg);
      return;
    }

    if (result.correct !== optimisticCorrect) {
      setIsCorrect(result.correct);
    }

    if (result.correct) {
      setShowSolution(true);
      setLastXp(result.xpGain);
      track(EV.xpGained, { metadata: { amount: result.xpGain, source: "adaptive" } });
      toast.success(`Correcto! +${result.xpGain} XP`);
    } else {
      toast.error(
        retryCount === 0 ? "Casi. Probá una vez más con la pista." : "Casi. Mirá la explicación.",
      );
    }
    if (result.leveledUp) {
      track(EV.levelUp, { metadata: { level: result.newLevel } });
    }

    // Prefetch del proximo ejercicio mientras el alumno lee la explicacion:
    // usa la dificultad ya ajustada para que "Siguiente" sea instantaneo.
    startPrefetch(result.newDifficulty);

    setDifficulty(result.newDifficulty);
    setSessionCount((c) => c + 1);
    if (result.correct) setSessionCorrect((c) => c + 1);
    refetchProgress();
    // Invalida los queries de perfil para que el StreakWidget + dashboard reflejen XP/racha al instante
    queryClient.invalidateQueries({ queryKey: ["profile-mini", user.id] });
    queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
    queryClient.invalidateQueries({ queryKey: ["my-attempts-dash", user.id] });
    queryClient.invalidateQueries({ queryKey: ["my-attempts", user.id] });
    queryClient.invalidateQueries({ queryKey: ["srs-due", user.id] });
    queryClient.invalidateQueries({ queryKey: ["usage-status", user.id] });
  };

  const useHint = () => {
    if (!exercise) return;
    const next = Math.min(hintIndex + 1, (exercise.hints?.length ?? 1) - 1);
    setHintIndex(next);
    track(EV.hintRequested, {
      entityType: "exercise",
      entityId: exercise.id,
      metadata: { topic: topic?.name },
    });
  };

  const retryCurrentExercise = () => {
    if (!exercise) return;
    setRetryCount((c) => c + 1);
    setAnswer("");
    setRevealed(false);
    setIsCorrect(null);
    setShowSolution(false);
    if (exercise.hints?.length && hintIndex < 0) setHintIndex(0);
    requestAnimationFrame(() => openAnswerRef.current?.focus());
  };

  const diffLabel = useMemo(
    () =>
      ["Muy fácil", "Fácil", "Intermedio", "Difícil", "Muy difícil"][difficulty - 1] ??
      "Intermedio",
    [difficulty],
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
      <Link
        to="/topics"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver
      </Link>

      <div className="mt-4 flex items-start gap-4">
        <div
          className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${topicGradient(topic.color)}`}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h1 className="font-display text-3xl font-bold">{topic.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{topic.description}</p>
        </div>
        {hasTheory(slug) && (
          <Link
            to="/theory/$slug"
            params={{ slug }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border bg-background px-3 py-2 text-sm font-medium transition hover:border-primary/40"
          >
            <BookText className="h-4 w-4 text-primary" />
            <span className="hidden sm:inline">Ver teoría</span>
          </Link>
        )}
      </div>

      {/* Progreso consolidado en una sola línea (la dificultad ya se muestra como pill por ejercicio) */}
      <div className="mt-6">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium text-muted-foreground">
            Dominio <span className="font-semibold tabular-nums text-foreground">{mastery}%</span>
          </span>
          <span className="tabular-nums text-muted-foreground">
            {completed} resuelto{completed === 1 ? "" : "s"}
            {sessionCount > 0 && (
              <span className="font-medium text-success">
                {" "}
                · +{sessionCorrect}/{sessionCount} hoy
              </span>
            )}
          </span>
        </div>
        <Progress value={mastery} className="h-1.5" />
      </div>

      {mastered && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300"
        >
          <Trophy className="h-4 w-4 shrink-0" />
          <span>¡Tema dominado! Seguí generando ejercicios para mantener el nivel.</span>
        </motion.div>
      )}

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
                  <p className="font-display text-base font-semibold">
                    Llegaste al límite diario 🙂
                  </p>
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
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Nivel {difficulty} · {diffLabel}
                  </span>
                  <h2 className="mt-3 font-display text-xl font-semibold leading-snug tracking-tight md:text-[1.6rem]">
                    <MathRich text={exercise.statement} />
                  </h2>

                  {(() => {
                    const aiExprs = exercise.graph_expressions ?? [];
                    const detected = aiExprs.length ? [] : detectFunctions(exercise.statement);
                    const exprs = buildAdaptiveGraphExpressions(aiExprs, detected);
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
                            <Suspense
                              fallback={
                                <div className="grid h-80 place-items-center rounded-xl border bg-muted/20">
                                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                              }
                            >
                              <GraphCard expressions={exprs} height={320} />
                            </Suspense>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="mt-7 space-y-2.5">
                    {exercise.type === "multiple_choice" &&
                      exercise.options?.map((opt, i) => {
                        const revealCorrectAnswer = Boolean(isCorrect || showSolution);
                        const isPicked = answer === opt;
                        const isRight =
                          revealCorrectAnswer &&
                          answersEqual(opt, exercise.correct_answer, "multiple_choice");
                        const isWrong = revealed && isPicked && !isRight;
                        const dim = revealed && !isRight && !isWrong;
                        return (
                          <button
                            key={opt}
                            disabled={revealed}
                            onClick={() => {
                              setAnswer(opt);
                              checkAnswer(opt);
                            }}
                            className={cn(
                              "group flex w-full items-center gap-3 rounded-xl border bg-background p-3.5 text-left text-sm transition-all",
                              !revealed &&
                                "hover:border-primary/60 hover:bg-primary-soft/30 hover:shadow-soft",
                              isPicked && !revealed && "border-primary ring-2 ring-primary/20",
                              isRight && "border-success bg-success/10",
                              isWrong && "border-destructive bg-destructive/10",
                              dim && "opacity-55",
                            )}
                          >
                            <span
                              className={cn(
                                "grid h-7 w-7 shrink-0 place-items-center rounded-lg border text-xs font-bold transition-colors",
                                isRight && "border-success bg-success text-success-foreground",
                                isWrong &&
                                  "border-destructive bg-destructive text-destructive-foreground",
                                !isRight &&
                                  !isWrong &&
                                  "border-border bg-muted/50 text-muted-foreground group-hover:border-primary/40 group-hover:text-primary",
                              )}
                            >
                              {isRight ? (
                                <Check className="h-4 w-4" />
                              ) : isWrong ? (
                                <X className="h-4 w-4" />
                              ) : (
                                (LETTERS[i] ?? i + 1)
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <MathRich text={opt} />
                            </span>
                          </button>
                        );
                      })}

                    {exercise.type === "true_false" &&
                      (() => {
                        const correctCanonical = normalizeTrueFalse(exercise.correct_answer);
                        return (
                          <div className="grid grid-cols-2 gap-2.5">
                            {(["true", "false"] as const).map((v) => {
                              const label = trueFalseLabel(v);
                              const revealCorrectAnswer = Boolean(isCorrect || showSolution);
                              const isPicked = answer === v;
                              const isRight = revealCorrectAnswer && correctCanonical === v;
                              const isWrong = revealed && isPicked && !isRight;
                              const dim = revealed && !isRight && !isWrong;
                              return (
                                <button
                                  key={v}
                                  disabled={revealed}
                                  onClick={() => {
                                    setAnswer(v);
                                    checkAnswer(v);
                                  }}
                                  className={cn(
                                    "flex items-center justify-center gap-2 rounded-xl border bg-background p-4 text-sm font-semibold transition-all",
                                    !revealed &&
                                      "hover:border-primary/60 hover:bg-primary-soft/30 hover:shadow-soft",
                                    isPicked &&
                                      !revealed &&
                                      "border-primary ring-2 ring-primary/20",
                                    isRight && "border-success bg-success/10 text-success",
                                    isWrong &&
                                      "border-destructive bg-destructive/10 text-destructive",
                                    dim && "opacity-55",
                                  )}
                                >
                                  {isRight && <Check className="h-4 w-4" />}
                                  {isWrong && <X className="h-4 w-4" />}
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        );
                      })()}

                    {exercise.type === "open" && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!revealed) checkAnswer(answer);
                        }}
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
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-4 flex gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm"
                    >
                      <Lightbulb className="h-4 w-4 shrink-0 text-warning-foreground/80" />
                      <MathRich text={exercise.hints[hintIndex]} />
                    </motion.div>
                  )}

                  {revealed && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "mt-6 rounded-2xl border p-5",
                        isCorrect
                          ? "border-success/30 bg-success/5"
                          : "border-destructive/30 bg-destructive/5",
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            "grid h-7 w-7 shrink-0 place-items-center rounded-full",
                            isCorrect
                              ? "bg-success/15 text-success"
                              : "bg-destructive/15 text-destructive",
                          )}
                        >
                          {isCorrect ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        </span>
                        <span className="text-sm font-semibold">
                          {isCorrect ? (
                            retryCount > 0 ? (
                              "¡Bien recuperado!"
                            ) : (
                              "¡Bien hecho!"
                            )
                          ) : showSolution ? (
                            <>
                              Respuesta correcta:{" "}
                              <MathRich
                                text={displayCorrectAnswer(exercise.correct_answer, exercise.type)}
                                className="text-foreground"
                              />
                            </>
                          ) : (
                            "Todavía no. Probá una vez más."
                          )}
                        </span>
                        {isCorrect && lastXp > 0 && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.6, y: 4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 18 }}
                            className="ml-auto inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs font-bold text-success"
                          >
                            <Sparkles className="h-3.5 w-3.5" />+{lastXp} XP
                          </motion.span>
                        )}
                      </div>

                      {!isCorrect && !showSolution ? (
                        <div className="mt-4 border-t pt-4">
                          <p className="text-sm text-muted-foreground">
                            Usá la pista y corregí solo el paso que cambia. Si volvés a fallar, te
                            muestro la solución completa.
                          </p>
                          {hintIndex < 0 && exercise.hints?.[0] && (
                            <div className="mt-3 flex gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm">
                              <Lightbulb className="h-4 w-4 shrink-0 text-warning-foreground/80" />
                              <MathRich text={exercise.hints[0]} />
                            </div>
                          )}
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button onClick={retryCurrentExercise} size="sm" className="gap-2">
                              <RefreshCcw className="h-4 w-4" />
                              Intentar de nuevo
                            </Button>
                            <Button
                              onClick={() => setShowSolution(true)}
                              variant="outline"
                              size="sm"
                              className="gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              Ver solución
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <StepByStepExplanation
                            text={exercise.explanation}
                            className="mt-4 border-t pt-4"
                          />
                          {!isCorrect && hasTheory(slug) && (
                            <Link
                              to="/theory/$slug"
                              params={{ slug }}
                              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                            >
                              <BookText className="h-3.5 w-3.5" /> Repasá la teoría de {topic.name}
                            </Link>
                          )}
                        </>
                      )}
                    </motion.div>
                  )}

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={useHint}
                      disabled={
                        revealed ||
                        !exercise.hints?.length ||
                        hintIndex >= exercise.hints.length - 1
                      }
                    >
                      <Lightbulb className="mr-2 h-4 w-4" />
                      Pista
                    </Button>
                    {revealed && (isCorrect || showSolution) && (
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
            <Suspense
              fallback={
                <div className="grid min-h-32 place-items-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              }
            >
              <ActivityGenerator
                topicId={topic.id}
                topicName={topic.name}
                initialLevel={adaptiveDifficultyToLevel(difficulty)}
              />
            </Suspense>
          </div>
        </TabsContent>
      </Tabs>

      <Suspense fallback={null}>
        <CalculatorFAB />
        <FormulasFAB />
        <MathWorkspace storageKey={`mathup:workspace:${slug}`} />
      </Suspense>
      <PaywallDialog open={paywallOpen} onOpenChange={setPaywallOpen} kind="adaptive" />
    </div>
  );
}
