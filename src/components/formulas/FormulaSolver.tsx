import { useMemo, useState } from "react";
import { Copy, Check, Send } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MathRich } from "@/components/math/MathRich";
import { cn } from "@/lib/utils";
import { parseValue, type AngleMode } from "@/lib/calc-eval";
import type { Formula, FormulaInputs, FormulaResult } from "@/lib/formulas";

/** Toggle segmentado chico y consistente con el resto de la app. */
function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex flex-wrap rounded-lg border bg-muted/40 p-0.5 text-xs font-medium">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={cn(
            "rounded-md px-3 py-1 transition",
            value === o.key ? "bg-background text-foreground shadow-soft" : "text-muted-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function FormulaSolver({
  formula,
  onSend,
}: {
  formula: Formula;
  /** Si se provee, muestra "Enviar al Workspace". */
  onSend?: (text: string) => void;
}) {
  const [variant, setVariant] = useState(formula.variants?.[0]?.key);
  const [exact, setExact] = useState(false);
  const [angleMode, setAngleMode] = useState<AngleMode>("deg");
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<FormulaResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const activeVariant = formula.variants?.find((v) => v.key === variant);
  const visibleVars = useMemo(() => {
    if (activeVariant?.uses) return formula.vars.filter((v) => activeVariant.uses!.includes(v.key));
    return formula.vars;
  }, [formula.vars, activeVariant]);

  const set = (key: string, v: string) => setValues((s) => ({ ...s, [key]: v }));

  const solve = () => {
    const inputs: FormulaInputs = {};
    for (const v of visibleVars) {
      const raw = (values[v.key] ?? "").trim();
      if (!raw) {
        setError("Completá todos los campos.");
        setResult(null);
        return;
      }
      if (v.kind === "list") {
        const parts = raw.split(/[,\s]+/).filter(Boolean);
        const nums = parts.map((p) => parseValue(p, angleMode));
        if (nums.some((n) => n === null)) {
          setError(`Revisá la lista "${v.label}": hay un valor no numérico.`);
          setResult(null);
          return;
        }
        inputs[v.key] = nums as number[];
      } else {
        const n = parseValue(raw, angleMode);
        if (n === null) {
          setError(`"${raw}" no es un número válido (${v.latex}).`);
          setResult(null);
          return;
        }
        inputs[v.key] = n;
      }
    }
    setError(null);
    setResult(formula.compute(inputs, { variant, exact, angleMode }));
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const showExact = exact && result?.exactLatex;

  return (
    <div className="space-y-5">
      {/* Fórmula original */}
      <div className="rounded-2xl border bg-card p-5 shadow-soft">
        <h2 className="font-display text-xl font-bold">{formula.name}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{formula.description}</p>
        <div className="mt-3 overflow-x-auto">
          <MathRich text={`$$${formula.latex}$$`} />
        </div>
        {/* Explicación de variables */}
        <ul className="mt-2 space-y-0.5 text-sm text-muted-foreground">
          {formula.vars.map((v) => (
            <li key={v.key} className="flex gap-2">
              <MathRich text={`$${v.latex}$`} />
              <span>— {v.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Controles + inputs */}
      <div className="rounded-2xl border bg-card p-5 shadow-soft">
        <div className="flex flex-wrap items-center gap-2">
          {formula.variants && (
            <Segmented
              value={variant ?? ""}
              options={formula.variants.map((v) => ({ key: v.key, label: v.label }))}
              onChange={(k) => {
                setVariant(k);
                setResult(null);
              }}
            />
          )}
          <Segmented
            value={exact ? "exact" : "dec"}
            options={[
              { key: "dec", label: "Decimal" },
              { key: "exact", label: "Exacto" },
            ]}
            onChange={(k) => setExact(k === "exact")}
          />
          {formula.angle && (
            <Segmented
              value={angleMode}
              options={[
                { key: "deg", label: "Grados" },
                { key: "rad", label: "Radianes" },
              ]}
              onChange={(k) => setAngleMode(k as AngleMode)}
            />
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {visibleVars.map((v) => (
            <label key={v.key} className="block text-sm">
              <span className="mb-1 flex items-center gap-1.5 text-muted-foreground">
                <MathRich text={`$${v.latex}$`} />
                <span className="text-xs">{v.label}</span>
              </span>
              <Input
                value={values[v.key] ?? ""}
                onChange={(e) => set(v.key, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") solve();
                }}
                placeholder={v.kind === "list" ? "ej: 2, 4, 6" : "ej: 3/4, 1.5, √2"}
                className="font-mono"
              />
            </label>
          ))}
        </div>

        <Button onClick={solve} className="mt-4">
          Resolver
        </Button>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>

      {/* Resultado */}
      {result && (
        <div className="rounded-2xl border bg-card p-5 shadow-soft">
          {result.steps.length > 0 && (
            <ol className="space-y-2">
              {result.steps.map((s, i) => (
                <li key={i} className="text-sm">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {s.label}
                  </span>
                  <div className="overflow-x-auto">
                    <MathRich text={`$$${s.latex}$$`} />
                  </div>
                </li>
              ))}
            </ol>
          )}

          {result.note && (
            <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
              {result.note}
            </p>
          )}

          {(result.decimal || result.exactLatex) && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <div>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Resultado
                </span>
                <div className="mt-1 text-2xl font-bold">
                  {showExact ? (
                    <MathRich text={`$${result.exactLatex}$`} />
                  ) : (
                    <span className="font-display tabular-nums">{result.decimal}</span>
                  )}
                </div>
                {showExact && result.decimal && (
                  <p className="mt-1 text-xs text-muted-foreground">≈ {result.decimal}</p>
                )}
              </div>
              <div className="flex gap-2">
                {onSend && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => onSend(`${formula.name}: ${result.copyText}`)}
                  >
                    <Send className="h-3.5 w-3.5" />
                    Workspace
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => copy(result.copyText)}
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
          )}
        </div>
      )}
    </div>
  );
}
