import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { parseSteps } from "@/lib/explanation-format";
import { MathRich } from "@/components/math/MathRich";

/**
 * Render de una explicación de ejercicio como resolución paso a paso.
 *
 * - Si la explicación tiene estructura (varios pasos / conectores), los numera y
 *   los airea en bloques separados.
 * - Si no la tiene, la muestra como un párrafo normal (sin numerar).
 * - Las expresiones matemáticas en LaTeX ($...$, \frac, \sqrt, \theta) se tipografían
 *   con KaTeX (fracciones apiladas, radicales, superíndices).
 *
 * Tipografía: 15px, line-height 1.7, buen espaciado entre pasos.
 */
export function StepByStepExplanation({
  text,
  className,
  tone = "muted",
}: {
  text: string;
  className?: string;
  /** "muted" para la explicación secundaria; "default" para más contraste. */
  tone?: "muted" | "default";
}) {
  const steps = useMemo(() => parseSteps(text), [text]);
  if (steps.length === 0) return null;

  const color = tone === "muted" ? "text-muted-foreground" : "text-foreground";

  return (
    <div className={cn("space-y-3 text-[15px] leading-[1.7]", color, className)}>
      {steps.map((step, i) => (
        <div key={i} className={cn(step.n != null && "flex gap-2.5")}>
          {step.n != null && (
            <span
              aria-hidden
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[13px] font-semibold text-primary"
            >
              {step.n}
            </span>
          )}
          <div className="min-w-0 flex-1 break-words">
            <MathRich text={step.text} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Render inline de un texto corto (ej. el feedback de una respuesta) tipografiando
 * las expresiones matemáticas en LaTeX con KaTeX, sin estructura de pasos.
 */
export function MathText({ text, className }: { text: string; className?: string }) {
  return <MathRich text={text} className={className} />;
}
