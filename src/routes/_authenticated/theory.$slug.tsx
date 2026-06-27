import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Play,
  ListChecks,
  AlertTriangle,
  BookText,
  Lightbulb,
  Sigma,
  CheckCircle2,
  Library,
  Target,
  Compass,
  LineChart,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { getTopicIcon, topicGradient } from "@/lib/topic-icons";
import { getTheory } from "@/content/theory";
import { getRelated } from "@/content/theory/related";
import { getInteractive } from "@/content/theory/interactive";
import { MathRich } from "@/components/math/MathRich";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/theory/$slug")({
  component: TheoryDetail,
});

function TheoryDetail() {
  const { slug } = useParams({ from: "/_authenticated/theory/$slug" });
  const { user } = useAuth();
  const theory = getTheory(slug);

  const { data: topic } = useQuery({
    queryKey: ["topic", slug],
    queryFn: async () => {
      const { data } = await supabase.from("topics").select("*").eq("slug", slug).maybeSingle();
      return data;
    },
  });

  const { data: progress } = useQuery({
    queryKey: ["progress", user?.id, topic?.id],
    enabled: !!user && !!topic,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_progress")
        .select("mastery_pct, exercises_completed")
        .eq("user_id", user!.id)
        .eq("topic_id", topic!.id)
        .maybeSingle();
      return data;
    },
  });

  // Temas para resolver nombre/icono de los chips de "Temas relacionados".
  const { data: allTopics = [] } = useQuery({
    queryKey: ["topics"],
    queryFn: async () => {
      const { data } = await supabase
        .from("topics")
        .select("slug, name, icon")
        .order("order_index");
      return data ?? [];
    },
  });

  if (!theory) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <p className="font-display text-lg font-semibold">Teoría no disponible</p>
        <p className="mt-1 text-sm text-muted-foreground">Todavía no preparamos este tema.</p>
        <Link to="/theory" className="mt-4 inline-block text-sm text-primary hover:underline">
          Volver a la biblioteca
        </Link>
      </div>
    );
  }

  const Icon = getTopicIcon(topic?.icon);
  const name = topic?.name ?? slug;
  const mastery = Math.round(Number(progress?.mastery_pct ?? 0));
  const completed = progress?.exercises_completed ?? 0;

  const related = getRelated(slug);
  const interactive = getInteractive(slug);
  const topicBySlug = new Map(allTopics.map((t) => [t.slug, t]));
  const sections = [
    { id: "resumen", title: "Resumen" },
    { id: "conceptos", title: "Conceptos clave" },
    { id: "formulas", title: "Fórmulas" },
    ...(interactive ? [{ id: "explorar", title: "Explorá" }] : []),
    { id: "ejemplos", title: "Ejemplos" },
    { id: "errores", title: "Errores comunes" },
    { id: "checklist", title: "Checklist" },
    ...(related.length ? [{ id: "relacionados", title: "Temas relacionados" }] : []),
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 md:py-12 lg:flex lg:gap-10">
      <article className="min-w-0 max-w-3xl flex-1">
        <Link
          to="/theory"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Teoría
        </Link>

        {/* Encabezado */}
        <header className="mt-4 flex flex-wrap items-start gap-4">
          <div
            className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${topicGradient(topic?.color)}`}
          >
            <Icon className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
              <Library className="h-3.5 w-3.5" /> Teoría
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight md:text-4xl">
              {name}
            </h1>
            {topic?.description && (
              <p className="mt-1 text-sm text-muted-foreground">{topic.description}</p>
            )}
          </div>
        </header>

        {/* Conexión con la práctica (bonus) */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-soft">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <Target className="h-4 w-4 text-primary" />
              <span className="font-semibold tabular-nums">{mastery}%</span>
              <span className="text-muted-foreground">dominio</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="font-semibold tabular-nums">{completed}</span>
              <span className="text-muted-foreground">ejercicios resueltos</span>
            </span>
          </div>
          {topic && (
            <Link
              to="/topics/$slug"
              params={{ slug }}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition hover:bg-primary/90"
            >
              <Play className="h-4 w-4" /> Practicar este tema
            </Link>
          )}
        </div>

        {/* 1. Resumen */}
        <Section id="resumen" icon={BookText} title="Resumen">
          <div className="space-y-3 text-[15px] leading-[1.75] text-foreground/90">
            {theory.summary.split("\n\n").map((p, i) => (
              <p key={i}>
                <MathRich text={p} />
              </p>
            ))}
          </div>
        </Section>

        {/* 2. Conceptos clave */}
        <Section id="conceptos" icon={Lightbulb} title="Conceptos clave">
          <div className="flex flex-wrap gap-2">
            {theory.keyConcepts.map((c) => (
              <span
                key={c}
                className="rounded-lg border bg-card px-3 py-1.5 text-sm font-medium shadow-soft"
              >
                <MathRich text={c} />
              </span>
            ))}
          </div>
        </Section>

        {/* 3. Fórmulas */}
        <Section id="formulas" icon={Sigma} title="Fórmulas importantes">
          <div className="grid gap-3 sm:grid-cols-2">
            {theory.formulas.map((f) => (
              <div key={f.label} className="rounded-xl border bg-muted/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {f.label}
                </p>
                <div className="mt-1 overflow-x-auto">
                  <MathRich text={`$$${f.latex}$$`} />
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Bloque interactivo: manipular el concepto al lado de la teoría */}
        {interactive && (
          <Section id="explorar" icon={LineChart} title="Explorá en vivo">
            {interactive}
          </Section>
        )}

        {/* 4. Ejemplos resueltos */}
        <Section id="ejemplos" icon={BookText} title="Ejemplos resueltos">
          <div className="space-y-4">
            {theory.examples.map((ex, i) => (
              <div key={i} className="rounded-2xl border bg-card p-5 shadow-soft">
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-[12px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <p className="text-[15px] font-medium leading-snug">
                    <MathRich text={ex.problem} />
                  </p>
                </div>
                <ol className="mt-3 space-y-1.5 border-l-2 border-primary/15 pl-4 text-[15px] leading-[1.7] text-muted-foreground">
                  {ex.steps.map((s, j) => (
                    <li key={j}>
                      <MathRich text={s} />
                    </li>
                  ))}
                </ol>
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-success/10 p-3 text-[15px] font-medium text-success">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <MathRich text={ex.result} />
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* 5. Errores frecuentes */}
        <Section id="errores" icon={AlertTriangle} title="Errores comunes" tone="warning">
          <div className="rounded-2xl border border-warning/30 bg-warning/5 p-5">
            <ul className="space-y-2.5">
              {theory.commonMistakes.map((m, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[15px] leading-[1.6]">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground/70" />
                  <span>
                    <MathRich text={m} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        {/* 6. Checklist */}
        <Section id="checklist" icon={ListChecks} title="Checklist de repaso">
          <ul className="space-y-2">
            {theory.checklist.map((c, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[15px]">
                <CheckCircle2 className="mt-0.5 h-[18px] w-[18px] shrink-0 text-success" />
                <span>
                  <MathRich text={c} />
                </span>
              </li>
            ))}
          </ul>
        </Section>

        {/* 7. Temas relacionados */}
        {related.length > 0 && (
          <Section id="relacionados" icon={Compass} title="Temas relacionados">
            <div className="flex flex-wrap gap-2">
              {related.map((rs) => {
                const t = topicBySlug.get(rs);
                const RIcon = getTopicIcon(t?.icon);
                return (
                  <Link
                    key={rs}
                    to="/theory/$slug"
                    params={{ slug: rs }}
                    className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-sm font-medium shadow-soft transition hover:-translate-y-0.5 hover:border-primary/40"
                  >
                    <RIcon className="h-3.5 w-3.5 text-primary" />
                    {t?.name ?? rs}
                  </Link>
                );
              })}
            </div>
          </Section>
        )}

        {/* CTA final */}
        {topic && (
          <div className="mt-12 flex flex-col items-center gap-3 rounded-2xl border bg-gradient-to-br from-primary-soft/60 to-card p-6 text-center shadow-soft">
            <p className="font-display text-lg font-semibold">¿Listo para ponerlo en práctica?</p>
            <p className="max-w-md text-sm text-muted-foreground">
              La mejor forma de fijar la teoría es resolviendo. Probá ejercicios adaptados a tu
              nivel.
            </p>
            <Link
              to="/topics/$slug"
              params={{ slug }}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:bg-primary/90"
            >
              <Play className="h-4 w-4" /> Practicar {name}
            </Link>
          </div>
        )}
      </article>

      {/* TOC lateral pegajoso (solo desktop) */}
      <aside className="hidden w-44 shrink-0 lg:block">
        <nav className="sticky top-20 border-l pl-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            En esta página
          </p>
          <ul className="space-y-1 text-sm">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="block py-1 text-muted-foreground transition hover:text-foreground"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </div>
  );
}

function Section({
  id,
  icon: Icon,
  title,
  children,
  tone = "default",
}: {
  id?: string;
  icon: typeof BookText;
  title: string;
  children: React.ReactNode;
  tone?: "default" | "warning";
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-10 scroll-mt-24"
    >
      <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
        <Icon
          className={cn(
            "h-5 w-5",
            tone === "warning" ? "text-warning-foreground/80" : "text-primary",
          )}
        />
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </motion.section>
  );
}
