import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDesmos, getDesmos, type DesmosCalculator } from "@/hooks/use-desmos";

export type GraphExpression = {
  id?: string;
  latex: string;
  color?: string;
  label?: string;
  hidden?: boolean;
  /** for sliders */
  sliderBounds?: { min: number; max: number; step?: number };
};

type Props = {
  expressions: GraphExpression[];
  bounds?: { left: number; right: number; bottom: number; top: number };
  height?: number;
  className?: string;
  options?: Record<string, unknown>;
};

const DEFAULT_OPTIONS = {
  expressions: true,
  settingsMenu: false,
  zoomButtons: true,
  expressionsTopbar: false,
  border: false,
  lockViewport: false,
  keypad: false,
  showResetButtonOnGraphpaper: true,
};

export function GraphCard({ expressions, bounds, height = 360, className, options }: Props) {
  const ready = useDesmos();
  const ref = useRef<HTMLDivElement>(null);
  const calcRef = useRef<DesmosCalculator | null>(null);

  useEffect(() => {
    if (!ready || !ref.current) return;
    const D = getDesmos();
    if (!D) return;
    const calc = D.GraphingCalculator(ref.current, { ...DEFAULT_OPTIONS, ...(options ?? {}) });
    calcRef.current = calc;
    if (bounds) calc.setMathBounds(bounds);
    return () => {
      calc.destroy();
      calcRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useEffect(() => {
    const calc = calcRef.current;
    if (!calc) return;
    calc.setBlank();
    expressions.forEach((e, i) => {
      const exp: Record<string, unknown> = {
        id: e.id ?? `e${i}`,
        latex: e.latex,
      };
      if (e.color) exp.color = e.color;
      if (e.label) {
        exp.showLabel = true;
        exp.label = e.label;
      }
      if (e.hidden) exp.hidden = true;
      if (e.sliderBounds) {
        exp.sliderBounds = {
          min: String(e.sliderBounds.min),
          max: String(e.sliderBounds.max),
          step: e.sliderBounds.step != null ? String(e.sliderBounds.step) : undefined,
        };
      }
      calc.setExpression(exp);
    });
    if (bounds) calc.setMathBounds(bounds);
  }, [expressions, bounds]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card shadow-soft",
        className
      )}
      style={{ height }}
    >
      {!ready && (
        <div className="absolute inset-0 grid place-items-center text-muted-foreground">
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando gráfica…
          </div>
        </div>
      )}
      <div ref={ref} className="h-full w-full" />
    </div>
  );
}
