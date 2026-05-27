import { useMemo, useState } from "react";
import { GraphCard, type GraphExpression } from "./GraphCard";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";

type Props = {
  defaultFn?: string;
};

export function DerivativeExplorer({ defaultFn = "x^2-2x" }: Props) {
  const [fn, setFn] = useState(defaultFn);
  const [a, setA] = useState(1);

  const exprs = useMemo<GraphExpression[]>(() => {
    const f = fn.replaceAll(" ", "");
    return [
      { id: "f", latex: `f(x)=${f}`, color: "#0EA5E9", label: "f(x)" },
      { id: "df", latex: `g(x)=\\frac{d}{dx}f(x)`, color: "#8B5CF6", label: "f'(x)" },
      { id: "a", latex: `a=${a}`, sliderBounds: { min: -5, max: 5, step: 0.1 } },
      { id: "p", latex: `(a,f(a))`, color: "#EF4444", label: "tangente" },
      { id: "t", latex: `y=f(a)+g(a)\\cdot(x-a)`, color: "#EF4444" },
    ];
  }, [fn, a]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            f(x)
          </label>
          <Input value={fn} onChange={(e) => setFn(e.target.value)} placeholder="x^2-2x" />
        </div>
        <div className="flex-1">
          <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
            <span>Punto a</span>
            <span className="font-mono text-primary">{a.toFixed(2)}</span>
          </div>
          <Slider min={-5} max={5} step={0.1} value={[a]} onValueChange={([v]) => setA(v)} />
        </div>
      </div>
      <GraphCard
        expressions={exprs}
        height={400}
        bounds={{ left: -6, right: 6, bottom: -6, top: 6 }}
      />
      <p className="text-xs text-muted-foreground">
        En azul, la función original. En violeta, su derivada. En rojo, la recta tangente en x = a.
      </p>
    </div>
  );
}
