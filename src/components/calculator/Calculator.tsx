import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Copy, Delete, History as HistoryIcon, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { evaluate, type AngleMode } from "@/lib/calc-eval";
import { decimalToFraction, formatNumber } from "@/lib/fraction";

type ResultMode = "dec" | "frac";

interface HistoryEntry {
  expr: string;
  result: string;
}

/** Evalúa o lanza (la UI ya envuelve en try/catch / preview). */
function evaluateExpression(input: string, mode: AngleMode): number {
  const r = evaluate(input, mode);
  if (!r.ok) throw new Error(r.error);
  return r.value;
}

function formatResult(n: number, resultMode: ResultMode = "dec"): string {
  if (resultMode === "frac" && !Number.isInteger(n)) {
    const f = decimalToFraction(n);
    if (f && f.den !== 1) return f.toString();
  }
  return formatNumber(n);
}

const BTN_DIGIT = "bg-background hover:bg-muted text-foreground";
const BTN_OP = "bg-primary/10 hover:bg-primary/20 text-primary font-semibold";
const BTN_FN = "bg-muted hover:bg-muted/70 text-foreground text-xs font-medium";
const BTN_CLEAR =
  "bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold";
const BTN_EQ = "bg-primary text-primary-foreground hover:bg-primary/90 font-bold";

export function Calculator({ onClose }: { onClose?: () => void }) {
  const [expr, setExpr] = useState("");
  const [angleMode, setAngleMode] = useState<AngleMode>("deg");
  const [resultMode, setResultMode] = useState<ResultMode>("dec");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const preview = useMemo(() => {
    if (!expr.trim()) return null;
    try {
      return formatResult(evaluateExpression(expr, angleMode), resultMode);
    } catch {
      return null;
    }
  }, [expr, angleMode, resultMode]);

  const append = (s: string) => setExpr((e) => e + s);
  const backspace = () => setExpr((e) => e.slice(0, -1));
  const clear = () => setExpr("");

  const equals = () => {
    if (!expr.trim()) return;
    try {
      const result = formatResult(evaluateExpression(expr, angleMode), resultMode);
      setHistory((h) => [{ expr, result }, ...h].slice(0, 5));
      setExpr(result);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error";
      toast.error(`No se puede calcular: ${msg}`);
    }
  };

  const copyResult = async () => {
    const value = preview ?? expr;
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copiado");
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const buttons: { label: string; onClick: () => void; style: string }[][] = [
    [
      { label: "AC", onClick: clear, style: BTN_CLEAR },
      { label: "(", onClick: () => append("("), style: BTN_FN },
      { label: ")", onClick: () => append(")"), style: BTN_FN },
      { label: "⌫", onClick: backspace, style: BTN_FN },
    ],
    [
      { label: "sin", onClick: () => append("sin("), style: BTN_FN },
      { label: "cos", onClick: () => append("cos("), style: BTN_FN },
      { label: "tan", onClick: () => append("tan("), style: BTN_FN },
      { label: "÷", onClick: () => append("÷"), style: BTN_OP },
    ],
    [
      { label: "log", onClick: () => append("log("), style: BTN_FN },
      { label: "ln", onClick: () => append("ln("), style: BTN_FN },
      { label: "√", onClick: () => append("√("), style: BTN_FN },
      { label: "×", onClick: () => append("×"), style: BTN_OP },
    ],
    [
      { label: "7", onClick: () => append("7"), style: BTN_DIGIT },
      { label: "8", onClick: () => append("8"), style: BTN_DIGIT },
      { label: "9", onClick: () => append("9"), style: BTN_DIGIT },
      { label: "−", onClick: () => append("−"), style: BTN_OP },
    ],
    [
      { label: "4", onClick: () => append("4"), style: BTN_DIGIT },
      { label: "5", onClick: () => append("5"), style: BTN_DIGIT },
      { label: "6", onClick: () => append("6"), style: BTN_DIGIT },
      { label: "+", onClick: () => append("+"), style: BTN_OP },
    ],
    [
      { label: "1", onClick: () => append("1"), style: BTN_DIGIT },
      { label: "2", onClick: () => append("2"), style: BTN_DIGIT },
      { label: "3", onClick: () => append("3"), style: BTN_DIGIT },
      { label: "^", onClick: () => append("^"), style: BTN_OP },
    ],
    [
      { label: "π", onClick: () => append("π"), style: BTN_FN },
      { label: "0", onClick: () => append("0"), style: BTN_DIGIT },
      { label: ".", onClick: () => append("."), style: BTN_DIGIT },
      { label: "=", onClick: equals, style: BTN_EQ },
    ],
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {/* Ángulo: grados / radianes */}
          <div className="flex items-center gap-1 rounded-lg border bg-background p-0.5 text-[10px] font-semibold">
            {(["deg", "rad"] as AngleMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setAngleMode(m)}
                className={cn(
                  "rounded-md px-2 py-0.5 uppercase tracking-wide transition-colors",
                  angleMode === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m}
              </button>
            ))}
          </div>
          {/* Resultado: decimal / fracción */}
          <div className="flex items-center gap-1 rounded-lg border bg-background p-0.5 text-[10px] font-semibold">
            {(
              [
                ["dec", "0.5"],
                ["frac", "½"],
              ] as [ResultMode, string][]
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => setResultMode(m)}
                title={m === "dec" ? "Resultado en decimales" : "Resultado en fracción"}
                className={cn(
                  "rounded-md px-2 py-0.5 transition-colors",
                  resultMode === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowHistory((s) => !s)}
            className={cn(
              "rounded-md p-1.5 transition-colors hover:bg-muted",
              showHistory && "bg-muted",
              history.length === 0 && "opacity-40",
            )}
            disabled={history.length === 0}
            aria-label="Historial"
          >
            <HistoryIcon className="h-3.5 w-3.5" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 transition-colors hover:bg-muted"
              aria-label="Cerrar calculadora"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* History */}
      <AnimatePresence>
        {showHistory && history.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border bg-muted/30 p-2 text-xs">
              {history.map((h, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setExpr(h.expr)}
                  className="flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left transition-colors hover:bg-background"
                >
                  <span className="truncate font-mono text-muted-foreground">{h.expr}</span>
                  <span className="shrink-0 font-mono font-semibold">= {h.result}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Display */}
      <div className="rounded-xl border bg-muted/40 p-3">
        <div
          className="min-h-[1.5rem] break-words text-right font-mono text-sm text-muted-foreground"
          aria-label="Expresión"
        >
          {expr || <span className="opacity-50">0</span>}
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={copyResult}
            disabled={!preview}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-background disabled:opacity-30"
            aria-label="Copiar resultado"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <div
            className="break-words text-right font-mono text-xl font-bold tabular-nums"
            aria-label="Resultado"
          >
            {preview ?? <span className="text-muted-foreground/40">—</span>}
          </div>
        </div>
      </div>

      {/* Funciones inversas */}
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: "sin⁻¹", token: "asin(" },
          { label: "cos⁻¹", token: "acos(" },
          { label: "tan⁻¹", token: "atan(" },
        ].map((b) => (
          <button
            key={b.label}
            type="button"
            onClick={() => append(b.token)}
            className={cn("h-9 rounded-lg transition-colors active:scale-95", BTN_FN)}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* Keypad */}
      <div className="grid gap-1.5">
        {buttons.map((row, rIdx) => (
          <div key={rIdx} className="grid grid-cols-4 gap-1.5">
            {row.map((btn) => (
              <button
                key={btn.label}
                type="button"
                onClick={btn.onClick}
                className={cn(
                  "h-9 rounded-lg text-sm transition-colors active:scale-95",
                  btn.style,
                )}
              >
                {btn.label === "⌫" ? <Delete className="mx-auto h-3.5 w-3.5" /> : btn.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
