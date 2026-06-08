import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "motion/react";
import { CalendarDays, Plus, Loader2, GraduationCap, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  generatePlan, daysUntil, todayArgentina, STUDY_TOPICS,
} from "@/lib/study/plan";

export const Route = createFileRoute("/_authenticated/study/")({
  component: StudyPage,
});

const MINUTE_OPTIONS = [15, 30, 45, 60, 120];

function StudyPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  const plansQuery = useQuery({
    queryKey: ["study-plans", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: plans } = await supabase
        .from("study_plans")
        .select("*")
        .eq("user_id", user!.id)
        .order("exam_date", { ascending: true });
      const { data: tasks } = await supabase
        .from("study_plan_tasks")
        .select("plan_id, status")
        .eq("user_id", user!.id);
      const progress = new Map<string, { done: number; total: number }>();
      for (const t of tasks ?? []) {
        const p = progress.get(t.plan_id) ?? { done: 0, total: 0 };
        p.total++;
        if (t.status === "done") p.done++;
        progress.set(t.plan_id, p);
      }
      return (plans ?? []).map((p) => ({ ...p, progress: progress.get(p.id) ?? { done: 0, total: 0 } }));
    },
  });

  const today = todayArgentina();

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 md:py-12">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
            <CalendarDays className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">Mi Plan de Estudio</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Decinos cuándo rendís y armamos un plan a tu medida.
            </p>
          </div>
        </div>
        <Button onClick={() => setCreating(true)} className="shrink-0 gap-2">
          <Plus className="h-4 w-4" /> Nuevo plan
        </Button>
      </div>

      <div className="mt-8 space-y-3">
        {plansQuery.isPending ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
          </div>
        ) : (plansQuery.data ?? []).length === 0 ? (
          <div className="rounded-2xl border bg-card p-10 text-center shadow-soft">
            <GraduationCap className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-display text-lg font-semibold">Todavía no tenés ningún plan</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Creá uno con la fecha de tu próximo examen y armamos el cronograma.
            </p>
            <Button onClick={() => setCreating(true)} className="mt-5 gap-2">
              <Plus className="h-4 w-4" /> Crear plan
            </Button>
          </div>
        ) : (
          (plansQuery.data ?? []).map((p, i) => {
            const left = daysUntil(p.exam_date, today);
            const pct = p.progress.total ? Math.round((p.progress.done / p.progress.total) * 100) : 0;
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link
                  to="/study/$id"
                  params={{ id: p.id }}
                  className="group flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-glow"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-lg font-semibold">{p.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      📅 {new Date(p.exam_date + "T00:00:00").toLocaleDateString("es-AR")} ·{" "}
                      {left === 0 ? "¡es hoy o ya pasó!" : `faltan ${left} día${left === 1 ? "" : "s"}`}
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <Progress value={pct} className="h-2 flex-1" />
                      <span className="text-xs font-medium text-muted-foreground">{pct}%</span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
                </Link>
              </motion.div>
            );
          })
        )}
      </div>

      <CreatePlanDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={(id) => { setCreating(false); plansQuery.refetch(); navigate({ to: "/study/$id", params: { id } }); }}
      />
    </div>
  );
}

function CreatePlanDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const { user } = useAuth();
  const today = todayArgentina();
  const [name, setName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [dailyMinutes, setDailyMinutes] = useState(30);
  const [submitting, setSubmitting] = useState(false);

  const toggleTopic = (slug: string) =>
    setTopics((cur) => (cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug]));

  const canSubmit = name.trim() && examDate && examDate > today && topics.length > 0 && !submitting;

  const submit = async () => {
    if (!user || !canSubmit) return;
    setSubmitting(true);
    try {
      // dominio actual por tema
      const [{ data: prog }, { data: tps }] = await Promise.all([
        supabase.from("user_progress").select("topic_id, mastery_pct").eq("user_id", user.id),
        supabase.from("topics").select("id, slug"),
      ]);
      const slugByTopic = new Map((tps ?? []).map((t) => [t.id, t.slug]));
      const masteryBySlug = new Map<string, number>();
      for (const p of prog ?? []) {
        const slug = slugByTopic.get(p.topic_id);
        if (slug) masteryBySlug.set(slug, Number(p.mastery_pct));
      }
      const planTopics = topics.map((slug) => ({
        slug,
        name: STUDY_TOPICS.find((t) => t.slug === slug)?.name ?? slug,
        mastery: masteryBySlug.get(slug) ?? 0,
      }));
      const tasks = generatePlan({ today, examDate, dailyMinutes, topics: planTopics });

      const { data: plan, error } = await supabase
        .from("study_plans")
        .insert({ user_id: user.id, name: name.trim(), exam_date: examDate, daily_minutes: dailyMinutes, topics })
        .select()
        .single();
      if (error || !plan) throw new Error(error?.message ?? "No se pudo crear el plan");

      const { error: tErr } = await supabase.from("study_plan_tasks").insert(
        tasks.map((t) => ({
          plan_id: plan.id,
          user_id: user.id,
          date: t.date,
          topic_slug: t.topicSlug,
          topic_name: t.topicName,
          kind: t.kind,
          title: t.title,
          objective: t.objective,
          minutes: t.minutes,
          order_index: t.orderIndex,
        })),
      );
      if (tErr) throw new Error(tErr.message);

      toast.success("¡Plan creado! 🎯");
      onCreated(plan.id);
      setName(""); setExamDate(""); setTopics([]); setDailyMinutes(30);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al crear el plan");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Nuevo plan de estudio</DialogTitle>
          <DialogDescription>Lo armamos según tu dominio actual y tu tiempo disponible.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="Nombre del examen">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Parcial de Trigonometría" />
          </Field>

          <Field label="Fecha del examen">
            <Input type="date" min={today} value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          </Field>

          <Field label="Temas que entran">
            <div className="grid grid-cols-2 gap-2">
              {STUDY_TOPICS.map((t) => (
                <button
                  key={t.slug}
                  type="button"
                  onClick={() => toggleTopic(t.slug)}
                  className={cn(
                    "rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-all",
                    topics.includes(t.slug)
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Tiempo por día">
            <div className="flex flex-wrap gap-2">
              {MINUTE_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDailyMinutes(m)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all",
                    dailyMinutes === m ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/40",
                  )}
                >
                  {m < 60 ? `${m} min` : m === 60 ? "1 hora" : "2 horas"}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
          <Button onClick={submit} disabled={!canSubmit} className="gap-2">
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Creando…</> : "Crear plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
