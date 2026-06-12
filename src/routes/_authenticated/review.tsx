import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Loader2, RotateCcw, Check, X, Eye, Sparkles, BookOpenCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { MathRich } from "@/components/math/MathRich";
import { StepByStepExplanation } from "@/components/math/StepByStepExplanation";
import { applyReview, type SrsState } from "@/lib/review/srs";

export const Route = createFileRoute("/_authenticated/review")({
  component: ReviewPage,
});

interface DueItem {
  id: string;
  box: number;
  reviews: number;
  due_at: string;
  exercise: {
    statement: string;
    options: string[] | null;
    correct_answer: string;
    explanation: string;
    type: string;
  } | null;
  topic: { name: string; slug: string } | null;
}

function ReviewPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: items = [], isPending } = useQuery({
    queryKey: ["srs-due-full", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("srs_items")
        .select("id, box, reviews, due_at, exercise:exercises(statement, options, correct_answer, explanation, type), topic:topics(name, slug)")
        .eq("user_id", user!.id)
        .lte("due_at", new Date().toISOString())
        .order("due_at", { ascending: true })
        .limit(30);
      return (data ?? []) as unknown as DueItem[];
    },
  });

  const valid = useMemo(() => items.filter((i) => i.exercise), [items]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);

  const item = valid[index];

  const grade = async (knewIt: boolean) => {
    if (!item || !user) return;
    const prev: SrsState = { box: item.box, dueAt: item.due_at, reviews: item.reviews };
    const next = applyReview(prev, knewIt);
    void supabase
      .from("srs_items")
      .update({ box: next.box, due_at: next.dueAt, reviews: next.reviews, updated_at: new Date().toISOString() })
      .eq("id", item.id)
      .then(({ error }) => {
        if (error) console.warn("[review] update falló", error.message);
      });
    setDone((d) => d + 1);
    setRevealed(false);
    setIndex((i) => i + 1);
    queryClient.invalidateQueries({ queryKey: ["srs-due", user.id] });
  };

  if (isPending) {
    return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  // Sin nada pendiente (o terminó la tanda).
  if (valid.length === 0 || index >= valid.length) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-success/15 text-success">
          <BookOpenCheck className="h-7 w-7" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">
          {done > 0 ? "¡Repaso completado!" : "Nada para repasar"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {done > 0
            ? `Repasaste ${done} ejercicio${done === 1 ? "" : "s"}. Volvé cuando te toque la próxima ronda.`
            : "Cuando falles ejercicios en la práctica, aparecen acá para repasarlos en el momento justo."}
        </p>
        <Link to="/topics" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:bg-primary/90">
          <Sparkles className="h-4 w-4" /> Ir a practicar
        </Link>
      </div>
    );
  }

  const ex = item.exercise!;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 md:py-12">
      <div className="flex items-center justify-between">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Salir
        </Link>
        <span className="text-xs font-medium tabular-nums text-muted-foreground">{index + 1} / {valid.length}</span>
      </div>
      <Progress value={(index / valid.length) * 100} className="mt-3 h-1.5" />

      <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
        <RotateCcw className="h-3.5 w-3.5" /> Repaso espaciado
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="mt-3"
        >
          {item.topic && <p className="text-[11px] font-medium text-muted-foreground">{item.topic.name}</p>}
          <h1 className="mt-1 font-display text-2xl font-semibold leading-snug tracking-tight">
            <MathRich text={ex.statement} />
          </h1>

          {ex.type === "multiple_choice" && ex.options && (
            <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
              {ex.options.map((o, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="text-xs font-semibold">{["A", "B", "C", "D", "E"][i]}.</span>
                  <MathRich text={o} />
                </li>
              ))}
            </ul>
          )}

          {!revealed ? (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-xl border bg-background px-4 py-2.5 text-sm font-semibold transition hover:border-primary/50"
            >
              <Eye className="h-4 w-4" /> Mostrar respuesta
            </button>
          ) : (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
              <div className="rounded-2xl border border-success/30 bg-success/5 p-5">
                <p className="text-sm font-semibold">
                  Respuesta correcta: <MathRich text={ex.correct_answer} className="text-foreground" />
                </p>
                <StepByStepExplanation text={ex.explanation} className="mt-4 border-t pt-4" />
              </div>

              <p className="mt-5 text-center text-sm text-muted-foreground">¿Lo entendiste esta vez?</p>
              <div className="mt-2 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => grade(false)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-semibold text-destructive transition hover:bg-destructive/10"
                >
                  <X className="h-4 w-4" /> Repasar de nuevo
                </button>
                <button
                  type="button"
                  onClick={() => grade(true)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-success/40 bg-success/10 px-4 py-3 text-sm font-semibold text-success transition hover:bg-success/20"
                >
                  <Check className="h-4 w-4" /> Lo entendí
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
