import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { generateFromMaterial } from "@/lib/ai/material-activities";
import { Button } from "@/components/ui/button";
import { ActivityCard } from "@/components/ai/ActivityCard";
import { PaywallDialog } from "@/components/billing/PaywallDialog";
import { isFreemiumLimitError } from "@/lib/billing/plans";
import { track, EV } from "@/lib/analytics/events";
import type { DifficultyLevel, GeneratedActivities } from "@/lib/ai/types";

const LEVELS: { value: DifficultyLevel; label: string }[] = [
  { value: "básico", label: "Básico" },
  { value: "intermedio", label: "Intermedio" },
  { value: "alto", label: "Alto" },
];

export function MaterialExerciseGenerator({
  materialId,
  topicHint,
}: {
  materialId: string;
  topicHint: string | null;
}) {
  const genFn = useServerFn(generateFromMaterial);
  const [nivel, setNivel] = useState<DifficultyLevel>("intermedio");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedActivities | null>(null);
  const [batchKey, setBatchKey] = useState(0);
  const [paywallOpen, setPaywallOpen] = useState(false);

  const tema = topicHint || "tu material";

  useEffect(() => {
    track(EV.materialSessionStarted, { entityType: "material", entityId: materialId });
  }, [materialId]);

  const generate = async () => {
    if (loading) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await genFn({ data: { materialId, nivel } });
      setResult(data);
      setBatchKey((k) => k + 1);
      track(EV.materialExerciseGenerated, {
        entityType: "material",
        entityId: materialId,
        metadata: { nivel, count: data.actividades.length },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al generar ejercicios";
      if (isFreemiumLimitError(msg) === "tanda") setPaywallOpen(true);
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-700">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-medium">Generá ejercicios de este material</p>
          <p className="text-xs text-muted-foreground">
            La IA crea ejercicios basados en el contenido que subiste.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Nivel
        </label>
        <div className="grid grid-cols-3 gap-2">
          {LEVELS.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => setNivel(l.value)}
              disabled={loading}
              className={`rounded-xl border p-2.5 text-sm font-semibold transition-all disabled:opacity-60 ${
                nivel === l.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/40"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <Button onClick={generate} disabled={loading} className="w-full gap-2" size="lg">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Generando ejercicios…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" /> {result ? "Regenerar" : "Generar ejercicios"}
          </>
        )}
      </Button>

      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl border bg-muted/30"
                style={{ opacity: 1 - i * 0.2 }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {result && !loading && (
          <motion.div
            key={batchKey}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {result.actividades.length} actividades · nivel{" "}
                <span className="capitalize">{result.nivel}</span>
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={generate}
                disabled={loading}
                className="h-7 gap-1.5 text-xs"
              >
                <RefreshCw className="h-3 w-3" /> Regenerar
              </Button>
            </div>
            <div className="space-y-2">
              {result.actividades.map((act, i) => (
                <ActivityCard
                  key={`${batchKey}-${i}`}
                  topicId={null}
                  tema={tema}
                  nivel={result.nivel}
                  activity={act}
                  index={i}
                  defaultOpen={i === 0}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PaywallDialog open={paywallOpen} onOpenChange={setPaywallOpen} kind="tanda" />
    </div>
  );
}
