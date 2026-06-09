import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  parseExplanation,
  splitMathFragments,
  type ExplanationFragment,
} from "@/lib/explanation-format";

/** Resalta una expresión matemática como "chip" (fondo suave, monoespaciada). */
function MathChip({ children }: { children: string }) {
  return (
    <span className="mx-px inline-block rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[0.92em] font-medium text-foreground">
      {children}
    </span>
  );
}

function Fragments({ fragments }: { fragments: ExplanationFragment[] }) {
  return (
    <>
      {fragments.map((f, i) =>
        f.math ? <MathChip key={i}>{f.text}</MathChip> : <span key={i}>{f.text}</span>,
      )}
    </>
  );
}

/**
 * Render de una explicación de ejercicio como resolución paso a paso.
 *
 * - Si la explicación tiene estructura (varios pasos / conectores), los numera y
 *   los airea en bloques separados.
 * - Si no la tiene, la muestra como un párrafo normal (sin numerar).
 * - Las expresiones matemáticas se resaltan como chips (sin librería de LaTeX).
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
  const parsed = useMemo(() => parseExplanation(text), [text]);
  if (parsed.steps.length === 0) return null;

  const color = tone === "muted" ? "text-muted-foreground" : "text-foreground";

  return (
    <div className={cn("space-y-3 text-[15px] leading-[1.7]", color, className)}>
      {parsed.steps.map((step, i) => (
        <div key={i} className={cn(step.n != null && "flex gap-2.5")}>
          {step.n != null && (
            <span
              aria-hidden
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[13px] font-semibold text-primary"
            >
              {step.n}
            </span>
          )}
          <div className="min-w-0 flex-1 space-y-1">
            {step.lines.map((line, j) => (
              <p key={j} className="break-words">
                <Fragments fragments={line.fragments} />
              </p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Render inline de un texto corto (ej. el feedback de una respuesta) resaltando
 * las expresiones matemáticas como chips, sin estructura de pasos.
 */
export function MathText({ text, className }: { text: string; className?: string }) {
  const fragments = useMemo(() => splitMathFragments(text), [text]);
  return (
    <span className={className}>
      <Fragments fragments={fragments} />
    </span>
  );
}
