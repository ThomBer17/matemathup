import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronDown,
  Send,
  Lightbulb,
  RotateCcw,
  Check,
  X,
  CircleAlert,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MathInputHelper } from "@/components/math/MathInputHelper";
import { MathPreview } from "@/components/math/MathPreview";
import { evaluateAnswer } from "@/lib/ai/evaluate";
import { giveHint } from "@/lib/ai/hints";
import { recordTutorAttempt } from "@/lib/progress/attempts";
import { ReportProblem } from "@/components/feedback/ReportProblem";
import type { Activity, DifficultyLevel, EvaluationResult, EvaluationStatus } from "@/lib/ai/types";

const NIVEL_TO_DIFFICULTY: Record<DifficultyLevel, number> = {
  básico: 1,
  intermedio: 3,
  alto: 5,
};

const STATUS_TO_ATTEMPT: Record<EvaluationStatus, "correct" | "partial" | "incorrect"> = {
  correcta: "correct",
  parcial: "partial",
  incorrecta: "incorrect",
};

const STATUS_META: Record<
  EvaluationStatus,
  { label: string; Icon: typeof Check; box: string; chip: string; tone: string }
> = {
  correcta: {
    label: "Correcta",
    Icon: Check,
    box: "border-emerald-500/30 bg-emerald-500/5",
    chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    tone: "text-emerald-700 dark:text-emerald-300",
  },
  parcial: {
    label: "Parcial",
    Icon: CircleAlert,
    box: "border-amber-500/30 bg-amber-500/5",
    chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    tone: "text-amber-700 dark:text-amber-300",
  },
  incorrecta: {
    label: "Incorrecta",
    Icon: X,
    box: "border-rose-500/30 bg-rose-500/5",
    chip: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    tone: "text-rose-700 dark:text-rose-300",
  },
};

export function ActivityCard({
  topicId,
  tema,
  nivel,
  activity,
  index,
  defaultOpen = false,
}: {
  topicId: string;
  tema: string;
  nivel: DifficultyLevel;
  activity: Activity;
  index: number;
  defaultOpen?: boolean;
}) {
  const evalFn = useServerFn(evaluateAnswer);
  const hintFn = useServerFn(giveHint);
  const recordFn = useServerFn(recordTutorAttempt);
  const queryClient = useQueryClient();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(defaultOpen);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [showExplicacion, setShowExplicacion] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [loadingHint, setLoadingHint] = useState(false);

  const handleSubmit = async () => {
    if (submitting || !answer.trim()) return;
    setSubmitting(true);
    setShowExplicacion(false);
    try {
      const result = await evalFn({
        data: { tema, enunciado: activity.enunciado, respuesta: answer },
      });
      setEvaluation(result);
      setShowExplicacion(result.estado !== "correcta");

      void recordFn({
        data: {
          topicId,
          status: STATUS_TO_ATTEMPT[result.estado],
          userAnswer: answer,
          difficulty: NIVEL_TO_DIFFICULTY[nivel],
          hintUsed: hint !== null,
        },
      })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["my-attempts"] });
          queryClient.invalidateQueries({ queryKey: ["my-attempts-dash"] });
        })
        .catch((e) => console.warn("[ActivityCard] record failed", e));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al evaluar.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleHint = async () => {
    if (loadingHint) return;
    setLoadingHint(true);
    try {
      const result = await hintFn({
        data: {
          tema,
          enunciado: activity.enunciado,
          intento: answer.trim() || undefined,
        },
      });
      setHint(result.pista);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al pedir pista.";
      toast.error(msg);
    } finally {
      setLoadingHint(false);
    }
  };

  const handleRetry = () => {
    setEvaluation(null);
    setShowExplicacion(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="overflow-hidden rounded-xl border bg-background"
    >
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[11px] font-bold text-primary">
            {index + 1}
          </div>
          <span className="truncate text-sm font-medium">{activity.titulo}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {evaluation && (
            <span
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_META[evaluation.estado].chip}`}
            >
              {(() => {
                const Icon = STATUS_META[evaluation.estado].Icon;
                return <Icon className="h-3 w-3" />;
              })()}
              {STATUS_META[evaluation.estado].label}
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 border-t px-4 py-4">
              {/* Enunciado */}
              <p className="text-sm leading-relaxed text-foreground">
                {activity.enunciado}
              </p>

              {/* Hint */}
              <AnimatePresence>
                {hint && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3"
                  >
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400" />
                    <p className="text-xs leading-relaxed text-yellow-900 dark:text-yellow-100">
                      {hint}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Answer input */}
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Tu respuesta
                </label>
                <Textarea
                  ref={textareaRef}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Escribí tu respuesta…"
                  rows={3}
                  disabled={submitting || (evaluation?.estado === "correcta")}
                  className="resize-none font-mono text-sm"
                />
                <MathInputHelper
                  targetRef={textareaRef}
                  value={answer}
                  onChange={setAnswer}
                  disabled={submitting || evaluation?.estado === "correcta"}
                />
                <MathPreview value={answer} />
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2">
                {!evaluation && (
                  <>
                    <Button
                      onClick={handleSubmit}
                      disabled={submitting || !answer.trim()}
                      size="sm"
                      className="gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Evaluando…
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          Enviar respuesta
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleHint}
                      disabled={loadingHint || submitting}
                      size="sm"
                      variant="ghost"
                      className="gap-2"
                    >
                      {loadingHint ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Lightbulb className="h-3.5 w-3.5" />
                      )}
                      {hint ? "Otra pista" : "Ver pista"}
                    </Button>
                  </>
                )}
                {evaluation && evaluation.estado !== "correcta" && (
                  <Button
                    onClick={handleRetry}
                    size="sm"
                    variant="outline"
                    className="gap-2"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Intentar otra vez
                  </Button>
                )}
              </div>

              {/* Evaluation result */}
              <AnimatePresence>
                {evaluation && (
                  <motion.div
                    key={evaluation.estado + evaluation.feedback.slice(0, 16)}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`rounded-xl border p-4 ${STATUS_META[evaluation.estado].box}`}
                  >
                    <div className={`flex items-center gap-2 text-sm font-semibold ${STATUS_META[evaluation.estado].tone}`}>
                      {(() => {
                        const Icon = STATUS_META[evaluation.estado].Icon;
                        return <Icon className="h-4 w-4" />;
                      })()}
                      {STATUS_META[evaluation.estado].label}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed">
                      {evaluation.feedback}
                    </p>

                    <div className="mt-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setShowExplicacion((s) => !s)}
                        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                      >
                        {showExplicacion ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                        {showExplicacion ? "Ocultar explicación" : "Ver explicación paso a paso"}
                      </button>
                    </div>

                    <AnimatePresence>
                      {showExplicacion && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <p className="mt-3 whitespace-pre-line border-t pt-3 text-xs leading-relaxed text-muted-foreground">
                            {evaluation.explicacion}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex justify-end pt-1">
                <ReportProblem
                  label="Reportar"
                  className="h-7 text-[11px] text-muted-foreground"
                  context={{
                    topic: tema,
                    exerciseId: null,
                    difficulty: NIVEL_TO_DIFFICULTY[nivel],
                    metadata: {
                      source: "tanda",
                      titulo: activity.titulo,
                      statement: activity.enunciado,
                      user_answer: answer,
                      evaluation: evaluation?.estado ?? null,
                    },
                  }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
