import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { generateActivities } from "@/lib/ai/activities";
import { Button } from "@/components/ui/button";
import { ActivityCard } from "./ActivityCard";
import { PaywallDialog } from "@/components/billing/PaywallDialog";
import { isFreemiumLimitError } from "@/lib/billing/plans";
import { track, EV } from "@/lib/analytics/events";
import type { DifficultyLevel, GeneratedActivities } from "@/lib/ai/types";

const DIFFICULTY_OPTIONS: { value: DifficultyLevel; label: string; desc: string }[] = [
  { value: "básico", label: "Básico", desc: "Conceptos y operaciones directas" },
  { value: "intermedio", label: "Intermedio", desc: "Resolución en varios pasos" },
  { value: "alto", label: "Alto", desc: "Problemas complejos" },
];

const LOADING_MESSAGES = [
  "Pensando los ejercicios…",
  "Adaptando al nivel…",
  "Redactando los enunciados…",
  "Verificando coherencia matemática…",
];

function useRotatingMessage(active: boolean, intervalMs = 1800) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!active) {
      setIdx(0);
      return;
    }
    const id = setInterval(
      () => setIdx((i) => (i + 1) % LOADING_MESSAGES.length),
      intervalMs,
    );
    return () => clearInterval(id);
  }, [active, intervalMs]);
  return LOADING_MESSAGES[idx];
}

export function ActivityGenerator({
  topicId,
  topicName,
  initialLevel = "intermedio",
}: {
  topicId: string;
  topicName: string;
  initialLevel?: DifficultyLevel;
}) {
  const genFn = useServerFn(generateActivities);
  const queryClient = useQueryClient();
  const [nivel, setNivel] = useState<DifficultyLevel>(initialLevel);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedActivities | null>(null);
  const [batchKey, setBatchKey] = useState(0);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const loadingMessage = useRotatingMessage(loading);

  const runGenerate = async (force: boolean) => {
    if (loading) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await genFn({ data: { tema: topicName, nivel, force } });
      setResult(data);
      setBatchKey((k) => k + 1);
      track(EV.tandaGenerated, { entityType: "tanda", metadata: { topic: topicName, nivel, count: data.actividades.length } });
      queryClient.invalidateQueries({ queryKey: ["usage-status"] });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al generar las actividades";
      // Límite freemium → paywall amable.
      if (isFreemiumLimitError(msg) === "tanda") {
        setPaywallOpen(true);
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => runGenerate(false);
  const handleRegenerate = () => runGenerate(true);

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-700">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-medium">Generá una tanda de actividades con IA</p>
          <p className="text-xs text-muted-foreground">
            Elegí el nivel, te creamos 3 a 5 ejercicios sobre <span className="font-medium">{topicName}</span> y los podés resolver con feedback IA.
          </p>
        </div>
      </div>

      {/* Difficulty selector */}
      <div className="space-y-2">
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Nivel
        </label>
        <div className="grid grid-cols-3 gap-2">
          {DIFFICULTY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setNivel(opt.value)}
              disabled={loading}
              className={`rounded-xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 ${
                nivel === opt.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border bg-background hover:border-primary/40"
              }`}
            >
              <p className="text-sm font-semibold">{opt.label}</p>
              <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <Button
        onClick={result ? handleRegenerate : handleGenerate}
        disabled={loading}
        className="w-full gap-2"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AnimatePresence mode="wait">
              <motion.span
                key={loadingMessage}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                {loadingMessage}
              </motion.span>
            </AnimatePresence>
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            {result ? "Regenerar tanda" : "Generar actividades"}
          </>
        )}
      </Button>

      {/* Loading skeleton */}
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

      {/* Results */}
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
                onClick={handleRegenerate}
                disabled={loading}
                className="h-7 gap-1.5 text-xs"
              >
                <RefreshCw className="h-3 w-3" />
                Regenerar
              </Button>
            </div>

            <div className="space-y-2">
              {result.actividades.map((act, i) => (
                <ActivityCard
                  key={`${batchKey}-${i}`}
                  topicId={topicId}
                  tema={result.tema}
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
