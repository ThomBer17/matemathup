import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Control segmentado (toggle de opciones) único de la app. Reemplaza las copias
 * que vivían en FormulaSolver, la página de Calculadora y la Calculadora flotante.
 * Tratamiento activo unificado: pastilla elevada (bg-background + shadow-soft).
 */
export interface SegmentedOption<T extends string> {
  key: T;
  label: ReactNode;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = "sm",
  className,
}: {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (v: T) => void;
  size?: "sm" | "xs";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex flex-wrap rounded-lg border bg-muted/40 p-0.5 font-medium",
        size === "xs" ? "text-[10px]" : "text-xs",
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={cn(
            "rounded-md transition",
            size === "xs" ? "px-2 py-0.5" : "px-3 py-1",
            value === o.key ? "bg-background text-foreground shadow-soft" : "text-muted-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
