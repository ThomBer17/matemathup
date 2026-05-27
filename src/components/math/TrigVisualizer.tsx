import { useMemo, useState } from "react";
import { GraphCard, type GraphExpression } from "./GraphCard";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type FnKey = "sin" | "cos" | "tan";

export function TrigVisualizer() {
  const [fn, setFn] = useState<FnKey>("sin");
  const [A, setA] = useState(1);
  const [B, setB] = useState(1);
  const [C, setC] = useState(0);
  const [D, setD] = useState(0);

  const exprs = useMemo<GraphExpression[]>(() => {
    const f = fn === "sin" ? "\\sin" : fn === "cos" ? "\\cos" : "\\tan";
    return [
      { id: "ref", latex: `y=${f}(x)`, color: "#94A3B8", hidden: false, label: "referencia" },
      {
        id: "main",
        latex: `y=${A}\\cdot ${f}(${B}\\cdot (x-${C}))+${D}`,
        color: "#0EA5E9",
        label: "transformada",
      },
    ];
  }, [fn, A, B, C, D]);

  const period = useMemo(() => {
    const base = fn === "tan" ? Math.PI : 2 * Math.PI;
    return base / Math.max(Math.abs(B), 1e-6);
  }, [fn, B]);

  return (
    <div className="space-y-4">
      <Tabs value={fn} onValueChange={(v) => setFn(v as FnKey)}>
        <TabsList>
          <TabsTrigger value="sin">Seno</TabsTrigger>
          <TabsTrigger value="cos">Coseno</TabsTrigger>
          <TabsTrigger value="tan">Tangente</TabsTrigger>
        </TabsList>
        <TabsContent value={fn} className="mt-4">
          <GraphCard
            expressions={exprs}
            height={380}
            bounds={{ left: -2 * Math.PI, right: 2 * Math.PI, bottom: -4, top: 4 }}
          />
        </TabsContent>
      </Tabs>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SliderCard label="Amplitud (A)" value={A} setValue={setA} min={-3} max={3} step={0.1} />
        <SliderCard label="Frecuencia (B)" value={B} setValue={setB} min={0.1} max={4} step={0.1} />
        <SliderCard label="Desp. horizontal (C)" value={C} setValue={setC} min={-Math.PI} max={Math.PI} step={0.1} />
        <SliderCard label="Desp. vertical (D)" value={D} setValue={setD} min={-3} max={3} step={0.1} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Info label="Amplitud" value={Math.abs(A).toFixed(2)} />
        <Info label="Período" value={`${(period / Math.PI).toFixed(2)} π`} />
        <Info label="Desfase" value={C.toFixed(2)} />
      </div>
    </div>
  );
}

function SliderCard({
  label,
  value,
  setValue,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  setValue: (v: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-mono text-primary">{value.toFixed(2)}</span>
      </div>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={([v]) => setValue(v)} />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-display text-lg font-semibold">{value}</p>
    </div>
  );
}
