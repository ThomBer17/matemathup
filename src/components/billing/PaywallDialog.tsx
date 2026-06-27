import { Sparkles, Infinity as InfinityIcon, Zap, Upload, Wrench } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { UsageKind } from "@/lib/billing/plans";

const KIND_COPY: Record<UsageKind, { title: string; body: string }> = {
  adaptive: {
    title: "Llegaste al limite diario",
    body: "Completaste tus ejercicios gratis de hoy. Volve manana o pasate a Premium para practicar sin limites.",
  },
  adaptive_generation: {
    title: "Llegaste al limite de generaciones",
    body: "Generaste todos tus ejercicios adaptativos gratis de hoy. Volve manana o pasate a Premium para practicar sin limites.",
  },
  tanda: {
    title: "Llegaste al limite de tandas",
    body: "Generaste todas tus tandas IA gratis de hoy. Volve manana o pasate a Premium para tandas ilimitadas.",
  },
};

const PREMIUM_PERKS = [
  { Icon: InfinityIcon, text: "Ejercicios y tandas IA ilimitados" },
  { Icon: Zap, text: "Respuestas mas rapidas (proximamente)" },
  { Icon: Upload, text: "Importa tu propio material (proximamente)" },
  { Icon: Wrench, text: "Herramientas avanzadas (proximamente)" },
];

export function PaywallDialog({
  open,
  onOpenChange,
  kind,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kind: UsageKind;
}) {
  const copy = KIND_COPY[kind];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <DialogTitle className="text-center font-display text-xl">{copy.title}</DialogTitle>
          <DialogDescription className="text-center">{copy.body}</DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Con Premium tenes
          </p>
          <ul className="space-y-2">
            {PREMIUM_PERKS.map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-2.5 text-sm">
                <Icon className="h-4 w-4 shrink-0 text-primary" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            className="w-full gap-2"
            size="lg"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            <Sparkles className="h-4 w-4" />
            Pasar a Premium
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            Seguir con el plan Free
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
