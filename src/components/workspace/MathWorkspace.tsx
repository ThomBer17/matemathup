import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { NotebookPen, X, Copy, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { setWorkspaceOpen, subscribeWorkspaceAppend } from "./panel-store";

/**
 * Workspace Matemático: panel lateral derecho para que el alumno haga cuentas,
 * anotaciones y razonamientos mientras resuelve. 100% local (localStorage),
 * sin IA ni requests. Instantáneo.
 *
 * Arquitectura extensible: el cuerpo está dividido en secciones (toolbar / área
 * libre / acciones). Para sumar a futuro (calculadora integrada, render LaTeX,
 * historial de cálculos, análisis IA, exportar) se agregan secciones/tabs sin
 * tocar la persistencia ni el shell del panel.
 */

interface Symbol {
  label: string;
  insert: string;
  /** posición del cursor relativa al inicio del texto insertado (default: al final) */
  cursorOffset?: number;
}

const SYMBOLS: Symbol[] = [
  { label: "√", insert: "√" },
  { label: "π", insert: "π" },
  { label: "x²", insert: "x²" },
  { label: "x³", insert: "x³" },
  { label: "²", insert: "²" },
  { label: "³", insert: "³" },
  { label: "∞", insert: "∞" },
  { label: "≤", insert: "≤" },
  { label: "≥", insert: "≥" },
  { label: "≠", insert: "≠" },
  { label: "±", insert: "±" },
  { label: "×", insert: "×" },
  { label: "÷", insert: "÷" },
  { label: "( )", insert: "()", cursorOffset: 1 },
  { label: "[ ]", insert: "[]", cursorOffset: 1 },
  { label: "{ }", insert: "{}", cursorOffset: 1 },
];

const FUNCTIONS: Symbol[] = [
  { label: "log", insert: "log(" },
  { label: "ln", insert: "ln(" },
  { label: "sin", insert: "sin(" },
  { label: "cos", insert: "cos(" },
  { label: "tan", insert: "tan(" },
];

export function MathWorkspace({ storageKey }: { storageKey: string }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  // Cerrar con Esc o clickeando afuera (excepto en otros paneles flotantes como la
  // calculadora, para que sigan conviviendo). Evita tener que ir siempre a la X.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return; // dentro del workspace
      if (target.closest("[data-floating-panel]")) return; // calculadora u otro panel
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  // Cargar desde localStorage al montar / cambiar de tema (client-only → en effect).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setValue(saved ?? "");
    } catch {
      setValue("");
    }
    setHydrated(true);
  }, [storageKey]);

  // Publica el estado abierto/cerrado para que la Calculadora se reubique.
  useEffect(() => {
    setWorkspaceOpen(open);
    return () => setWorkspaceOpen(false);
  }, [open]);

  // Recibe texto enviado desde otras herramientas (ej. Fórmulas): abre y lo agrega.
  useEffect(() => {
    return subscribeWorkspaceAppend((text) => {
      setOpen(true);
      setValue((v) => (v.trim() ? `${v}\n${text}` : text));
    });
  }, []);

  // Auto-guardar.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey, value);
    } catch {
      /* localStorage lleno o no disponible → se ignora, no rompe la UX */
    }
  }, [value, storageKey, hydrated]);

  const insert = (sym: Symbol) => {
    const el = textareaRef.current;
    if (!el) {
      setValue((v) => v + sym.insert);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + sym.insert + value.slice(end);
    setValue(next);
    requestAnimationFrame(() => {
      const pos = start + (sym.cursorOffset ?? sym.insert.length);
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  const handleClear = () => {
    if (!value.trim()) return;
    if (window.confirm("¿Vaciar el workspace? Se borrará lo que escribiste.")) {
      setValue("");
      textareaRef.current?.focus();
    }
  };

  const handleCopy = async () => {
    if (!value.trim()) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  return (
    <>
      {/* Handle / pestaña lateral cuando está cerrado */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir Workspace Matemático"
            className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-1.5 rounded-l-xl bg-primary px-2 py-3 text-primary-foreground shadow-glow transition-transform hover:px-2.5"
          >
            <NotebookPen className="h-4 w-4" />
            <span className="text-[10px] font-semibold [writing-mode:vertical-rl]">Workspace</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Backdrop solo en mobile/tablet */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.aside
            ref={panelRef}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.22 }}
            className="fixed right-0 top-0 z-50 flex h-full w-[88vw] max-w-[420px] flex-col border-l bg-card shadow-2xl lg:w-[32%] lg:max-w-[480px]"
            role="dialog"
            aria-label="Workspace Matemático"
            data-floating-panel
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-700">
                  <NotebookPen className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-display text-sm font-semibold leading-tight">
                    Workspace Matemático
                  </p>
                  <p className="text-[10px] text-muted-foreground">Tu espacio para hacer cuentas</p>
                </div>
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

            {/* Toolbar de símbolos */}
            <div className="space-y-1.5 border-b px-3 py-2.5">
              <div className="flex flex-wrap gap-1">
                {SYMBOLS.map((s) => (
                  <SymbolButton key={s.label} label={s.label} onClick={() => insert(s)} />
                ))}
              </div>
              <div className="flex flex-wrap gap-1">
                {FUNCTIONS.map((s) => (
                  <SymbolButton key={s.label} label={s.label} fn onClick={() => insert(s)} />
                ))}
              </div>
            </div>

            {/* Área libre */}
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={"Hacé tus cuentas acá…\n\nEj:\n2·(-3/4) + √9\n= -1.5 + 3\n= 1.5"}
              className="flex-1 resize-none rounded-none border-0 font-mono text-sm leading-relaxed focus-visible:ring-0"
            />

            {/* Acciones */}
            <div className="flex items-center justify-between gap-2 border-t px-3 py-2.5">
              <span className="text-[10px] text-muted-foreground">Se guarda automáticamente</span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="h-8 gap-1.5 text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Limpiar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="h-8 gap-1.5 text-xs"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied ? "Copiado" : "Copiar"}
                </Button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

function SymbolButton({
  label,
  onClick,
  fn,
}: {
  label: string;
  onClick: () => void;
  fn?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // no robar foco al textarea
      onClick={onClick}
      className={cn(
        "rounded-md border px-2 py-1 font-mono text-xs leading-none transition-colors hover:border-primary/50 hover:bg-primary/5 active:scale-95",
        fn ? "bg-muted text-foreground" : "bg-background",
      )}
    >
      {label}
    </button>
  );
}
