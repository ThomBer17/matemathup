import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Flag, Loader2, Paperclip } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/auth-context";
import {
  REPORT_TYPE_OPTIONS,
  buildReportMetadata,
  type ReportContext,
  type ReportType,
} from "@/lib/feedback/report-types";
import { submitFeedbackReport } from "@/lib/feedback/feedback.functions";
import { track, EV } from "@/lib/analytics/events";

type ButtonVariant = React.ComponentProps<typeof Button>["variant"];
type ButtonSize = React.ComponentProps<typeof Button>["size"];

export function ReportProblem({
  context = {},
  label = "Reportar problema",
  variant = "ghost",
  size = "sm",
  className,
}: {
  context?: ReportContext;
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const { user } = useAuth();
  const submitFeedbackReportFn = useServerFn(submitFeedbackReport);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ReportType | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setType(null);
    setMessage("");
  };

  const handleSubmit = async () => {
    if (!type || !message.trim() || submitting || !user) return;
    setSubmitting(true);
    try {
      const metadata = buildReportMetadata(context, {
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        url: typeof location !== "undefined" ? location.href : undefined,
      });
      await submitFeedbackReportFn({
        data: {
          type,
          message: message.trim(),
          topic: context.topic ?? null,
          exerciseId: context.exerciseId ?? null,
          difficulty: context.difficulty ?? null,
          metadata,
        },
      });
      track(EV.reportSent, {
        entityType: "report",
        metadata: { type, topic: context.topic ?? null },
      });
      toast.success("¡Gracias! Recibimos tu reporte 🙌");
      reset();
      setOpen(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "No se pudo enviar el reporte";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={cn("gap-1.5", className)}
        onClick={() => setOpen(true)}
      >
        <Flag className="h-3.5 w-3.5" />
        {label}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Reportar un problema</DialogTitle>
            <DialogDescription>
              Contanos qué pasó. Nos ayuda a mejorar MatemathUp para todos.
            </DialogDescription>
          </DialogHeader>

          {/* Tipo */}
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Tipo de reporte
            </label>
            <div className="grid grid-cols-2 gap-2">
              {REPORT_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border p-2.5 text-left text-sm transition-all",
                    type === opt.value
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-background hover:border-primary/40",
                  )}
                >
                  <span className="text-base">{opt.emoji}</span>
                  <span className="leading-tight">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Descripción
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Contanos qué notaste…"
              rows={4}
              className="resize-none text-sm"
            />
          </div>

          {/* Contexto automático */}
          <div className="flex items-start gap-2 rounded-lg border border-dashed bg-muted/20 p-2.5 text-[11px] text-muted-foreground">
            <Paperclip className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Se adjunta automáticamente el contexto (tema, dificultad, tipo de ejercicio, tu
              respuesta y la correcta). No hace falta que lo escribas.
            </span>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!type || !message.trim() || submitting}
              className="gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando…
                </>
              ) : (
                <>
                  <Flag className="h-4 w-4" />
                  Enviar reporte
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
