import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Sigma,
  FunctionSquare,
  Triangle,
  Shapes,
  LineChart,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HubCard } from "@/components/HubCard";
import { appendToWorkspace } from "@/components/workspace/panel-store";
import { formulasByTopic, getFormula } from "@/lib/formulas";

const FormulaSolver = lazy(() =>
  import("@/components/formulas/FormulaSolver").then((module) => ({
    default: module.FormulaSolver,
  })),
);
const CalculatorFAB = lazy(() =>
  import("@/components/calculator/CalculatorFAB").then((module) => ({
    default: module.CalculatorFAB,
  })),
);
const MathWorkspace = lazy(() =>
  import("@/components/workspace/MathWorkspace").then((module) => ({
    default: module.MathWorkspace,
  })),
);

export const Route = createFileRoute("/_authenticated/tools/formulas")({
  validateSearch: (s: Record<string, unknown>) => ({
    f: typeof s.f === "string" ? s.f : undefined,
  }),
  component: FormulasPage,
});

const TOPIC_META: Record<string, { icon: LucideIcon; color: string }> = {
  Álgebra: { icon: FunctionSquare, color: "violet" },
  Trigonometría: { icon: Triangle, color: "sky" },
  Geometría: { icon: Shapes, color: "teal" },
  Funciones: { icon: LineChart, color: "indigo" },
  Estadística: { icon: BarChart3, color: "rose" },
};

function FormulasPage() {
  const { f } = Route.useSearch();
  const navigate = Route.useNavigate();
  const selected = f ? getFormula(f) : undefined;

  if (selected) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8 md:py-12">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 gap-1.5"
          onClick={() => navigate({ search: { f: undefined } })}
        >
          <ArrowLeft className="h-4 w-4" />
          Todas las fórmulas
        </Button>
        <Suspense
          fallback={
            <div className="grid min-h-64 place-items-center">
              <Sigma className="h-5 w-5 animate-pulse text-muted-foreground" />
            </div>
          }
        >
          <FormulaSolver formula={selected} onSend={(t) => appendToWorkspace(t)} />
          <CalculatorFAB />
          <MathWorkspace storageKey="mathup:workspace:formulas" />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 md:py-12">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <Sigma className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold">Fórmulas</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Elegí una fórmula, completá los valores y resolvé paso a paso.
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        {formulasByTopic().map((group) => {
          const meta = TOPIC_META[group.topic] ?? { icon: Sigma, color: "sky" };
          return (
            <section key={group.topic}>
              <h2 className="mb-3 font-display text-lg font-semibold">{group.topic}</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {group.formulas.map((formula, i) => (
                  <motion.button
                    key={formula.slug}
                    type="button"
                    onClick={() => navigate({ search: { f: formula.slug } })}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.02 * i }}
                    className="text-left"
                  >
                    <HubCard
                      icon={meta.icon}
                      color={meta.color}
                      title={formula.name}
                      description={formula.description}
                      available
                      cta="Resolver"
                    />
                  </motion.button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
