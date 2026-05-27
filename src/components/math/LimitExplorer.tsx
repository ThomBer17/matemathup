import { useMemo, useState } from "react";
import { GraphCard, type GraphExpression } from "./GraphCard";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";

export function LimitExplorer() {
  const [fn, setFn] = useState("\\frac{1}{x-1}");
  const [c, setC] = useState(1);

  const exprs = useMemo<GraphExpression[]>(
    () => [
      { id: "f", latex: `f(x)=${fn}`, color: "#0EA5E9", label: "f(x)" },
      { id: "c", latex: `c=${c}`, sliderBounds: { min: -5, max: 5, step: 0.1 } },
      { id: "vasymp", latex: `x=c`, color: "#94A3B8" },
      { id: "left", latex: `(c-0.1, f(c-0.1))`, color: "#10B981", label: "x → c⁻" },
      { id: "right", latex: `(c+0.1, f(c+0.1))`, color: "#EF4444", label: "x → c⁺" },
    ],
    [fn, c]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            f(x) (LaTeX)
          </label>
          <Input value={fn} onChange={(e) => setFn(e.target.value)} placeholder="\\frac{1}{x-1}" />
        </div>
        <div className="flex-1">
          <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
            <span>Punto c</span>
            <span className="font-mono text-primary">{c.toFixed(2)}</span>
          </div>
          <Slider min={-5} max={5} step={0.1} value={[c]} onValueChange={([v]) => setC(v)} />
        </div>
      </div>
      <GraphCard
        expressions={exprs}
        height={400}
        bounds={{ left: -8, right: 8, bottom: -8, top: 8 }}
      />
      <p className="text-xs text-muted-foreground">
        Aproximación por izquierda (verde) y derecha (rojo) a x = c. La recta gris marca la asíntota vertical.
      </p>
    </div>
  );
}
