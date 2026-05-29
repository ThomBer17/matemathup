import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Calculator as CalcIcon } from "lucide-react";
import { Calculator } from "./Calculator";

export function CalculatorFAB() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-20 right-4 z-50 w-[min(320px,calc(100vw-2rem))] rounded-2xl border bg-card p-3 shadow-2xl md:right-6 md:bottom-24"
            role="dialog"
            aria-label="Calculadora"
          >
            <Calculator onClose={() => setOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-label={open ? "Cerrar calculadora" : "Abrir calculadora"}
        aria-expanded={open}
        className="fixed bottom-4 right-4 z-50 grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow transition-all hover:scale-105 active:scale-95 md:bottom-6 md:right-6"
      >
        <motion.span
          key={open ? "open" : "closed"}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          <CalcIcon className="h-5 w-5" />
        </motion.span>
      </button>
    </>
  );
}
