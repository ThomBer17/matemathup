import { useMemo, useState } from "react";
import { GraphCard, type GraphExpression } from "./GraphCard";
import { Slider } from "@/components/ui/slider";

type Param = {
  key: string;
  label: string;
  min: number;
  max: number;
  step?: number;
  default: number;
};

type Props = {
  /** LaTeX template — use ${a}, ${b}, … placeholders */
  template: string;
  params: Param[];
  height?: number;
  bounds?: { left: number; right: number; bottom: number; top: number };
  title?: string;
  description?: string;
};

export function InteractiveFunction({
  template,
  params,
  height = 380,
  bounds,
  title,
  description,
}: Props) {
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(params.map((p) => [p.key, p.default])),
  );

  const expressions = useMemo<GraphExpression[]>(() => {
    let latex = template;
    for (const p of params) {
      latex = latex.replaceAll(`\${${p.key}}`, formatNumber(values[p.key]));
    }
    return [{ id: "main", latex, color: "#0EA5E9" }];
  }, [template, params, values]);

  return (
    <div className="space-y-4">
      {(title || description) && (
        <div>
          {title && <h3 className="font-display text-lg font-semibold">{title}</h3>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}
      <GraphCard expressions={expressions} height={height} bounds={bounds} />
      <div className="grid gap-3 sm:grid-cols-2">
        {params.map((p) => (
          <div key={p.key} className="rounded-xl border bg-card p-3">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">{p.label}</span>
              <span className="font-mono text-primary">{formatNumber(values[p.key])}</span>
            </div>
            <Slider
              min={p.min}
              max={p.max}
              step={p.step ?? 0.1}
              value={[values[p.key]]}
              onValueChange={([v]) => setValues((s) => ({ ...s, [p.key]: v }))}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function formatNumber(n: number) {
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(2);
}
