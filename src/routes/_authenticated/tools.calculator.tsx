import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Calculator, CornerDownLeft, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { evaluateExpression, formatResult, type AngleMode } from "@/lib/calculator";

export const Route = createFileRoute("/_authenticated/tools/calculator")({
  component: CalculatorPage,
});

interface HistoryEntry {
  expr: string;
  result: string;
}

const HINTS = [
  "+ − × ÷  ·  ^ (potencia)",
  "sqrt( )  ·  abs( )  ·  exp( )",
  "sin cos tan  ·  asin acos atan",
  "ln  ·  log  ·  log2  ·  pi  ·  e",
];

function CalculatorPage() {
  const [expr, setExpr] = useState("");
  const [mode, setMode] = useState<AngleMode>("rad");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const evaluate = () => {
    const r = evaluateExpression(expr, mode);
    if (r.ok) {
      const formatted = formatResult(r.value);
      setResult(formatted);
      setError(null);
      setHistory((h) => [{ expr: expr.trim(), result: formatted }, ...h].slice(0, 12));
    } else {
      setResult(null);
      setError(r.error);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 md:py-12">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <Calculator className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold">Calculadora</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Escribí una expresión y obtené el resultado al instante.
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border bg-card p-5 shadow-soft">
        {/* Toggle grados/radianes */}
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { key: "rad", label: "Radianes" },
            { key: "deg", label: "Grados" },
          ]}
          className="mb-3"
        />

        <div className="flex items-center gap-2">
          <Input
            value={expr}
            onChange={(e) => setExpr(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") evaluate();
            }}
            placeholder="ej: 3 * sqrt(2) + sin(pi/4)"
            className="font-mono text-base"
            autoFocus
          />
          <Button onClick={evaluate} className="gap-1.5 shrink-0">
            <CornerDownLeft className="h-4 w-4" />=
          </Button>
        </div>

        {/* Resultado / error */}
        <div className="mt-4 min-h-[3rem]">
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : result !== null ? (
            <div className="flex items-baseline gap-2">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">=</span>
              <span className="font-display text-3xl font-bold tabular-nums">{result}</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              El resultado aparece acá. Usá <span className="font-mono">Enter</span> o el botón.
            </p>
          )}
        </div>
      </div>

      {/* Funciones soportadas */}
      <div className="mt-4 flex flex-wrap gap-2">
        {HINTS.map((h) => (
          <span
            key={h}
            className="rounded-full border bg-card px-3 py-1 font-mono text-xs text-muted-foreground"
          >
            {h}
          </span>
        ))}
      </div>

      {/* Historial */}
      {history.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-muted-foreground">Historial</h2>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => setHistory([])}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Limpiar
            </Button>
          </div>
          <ul className="mt-2 divide-y rounded-2xl border bg-card shadow-soft">
            {history.map((h, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => {
                    setExpr(h.expr);
                    setResult(h.result);
                    setError(null);
                  }}
                  className="flex w-full items-center justify-between gap-4 px-4 py-2.5 text-left transition hover:bg-muted/50"
                >
                  <span className="truncate font-mono text-sm text-muted-foreground">{h.expr}</span>
                  <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">
                    = {h.result}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
