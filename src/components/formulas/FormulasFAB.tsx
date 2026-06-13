import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sigma, X, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { formulasByTopic, getFormula } from "@/lib/formulas";
import { FormulaSolver } from "./FormulaSolver";
import { appendToWorkspace, setPanelOpen } from "@/components/workspace/panel-store";

const PANEL_ID = "formulas";

/**
 * Calculadora de Fórmulas flotante (abajo a la izquierda) para convivir con el
 * Workspace (cajón derecho) y la Calculadora (FAB derecho). Comparte el registro
 * de paneles y envía resultados al Workspace.
 */
export function FormulasFAB() {
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);
  const selected = slug ? getFormula(slug) : undefined;

  useEffect(() => {
    setPanelOpen(PANEL_ID, open);
    return () => setPanelOpen(PANEL_ID, false);
  }, [open]);

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-20 left-4 z-50 flex max-h-[70vh] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl md:bottom-24 md:left-6"
            role="dialog"
            aria-label="Fórmulas"
            data-floating-panel
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b px-3 py-2.5">
              <div className="flex items-center gap-2">
                {selected && (
                  <button
                    type="button"
                    onClick={() => setSlug(null)}
                    aria-label="Volver"
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                )}
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-primary">
                  <Sigma className="h-4 w-4" />
                </div>
                <p className="font-display text-sm font-semibold">
                  {selected ? selected.name : "Fórmulas"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Cuerpo */}
            <div className="overflow-y-auto p-3">
              {selected ? (
                <FormulaSolver formula={selected} onSend={(t) => appendToWorkspace(t)} />
              ) : (
                <div className="space-y-4">
                  {formulasByTopic().map((group) => (
                    <div key={group.topic}>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {group.topic}
                      </p>
                      <div className="flex flex-col gap-1">
                        {group.formulas.map((f) => (
                          <button
                            key={f.slug}
                            type="button"
                            onClick={() => setSlug(f.slug)}
                            className="rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:border-primary/50 hover:bg-primary/5"
                          >
                            {f.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-label={open ? "Cerrar fórmulas" : "Abrir fórmulas"}
        aria-expanded={open}
        className={cn(
          "fixed bottom-4 left-4 z-50 grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow transition-all hover:scale-105 active:scale-95 md:bottom-6 md:left-6",
        )}
        data-floating-panel
      >
        <Sigma className="h-5 w-5" />
      </button>
    </>
  );
}
