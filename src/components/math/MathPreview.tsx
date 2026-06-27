import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { mathToLatex } from "@/lib/math-to-latex";

export function MathPreview({ value, className }: { value: string; className?: string }) {
  const { html, error } = useMemo(() => {
    const latex = mathToLatex(value);
    if (!latex.trim()) return { html: "", error: null };
    try {
      return {
        html: katex.renderToString(latex, {
          throwOnError: true,
          strict: false,
          output: "html",
        }),
        error: null,
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Expresión inválida";
      return { html: "", error: msg };
    }
  }, [value]);

  const isEmpty = !value.trim();

  return (
    <div
      className={cn(
        "flex min-h-[3rem] items-center gap-3 rounded-lg border border-dashed bg-muted/20 px-3 py-2",
        className,
      )}
      aria-label="Vista previa matemática"
    >
      <Eye className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      {isEmpty ? (
        <span className="text-xs italic text-muted-foreground/60">Vista previa</span>
      ) : error ? (
        <span className="text-xs text-muted-foreground/70">
          Tipeá una expresión válida para ver la vista previa
        </span>
      ) : (
        <div
          className="min-w-0 overflow-x-auto text-foreground"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  );
}
