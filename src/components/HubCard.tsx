import { ArrowRight, type LucideIcon } from "lucide-react";
import { topicGradient } from "@/lib/topic-icons";
import { cn } from "@/lib/utils";

/**
 * Card de hub reutilizable (Teoría, Herramientas y futuros índices).
 * Renderiza solo el contenido visual; el caller decide el wrapping (Link/motion)
 * para no acoplar el componente al router.
 */
export interface HubCardProps {
  icon: LucideIcon;
  /** Clave de color para el gradiente del tile (topicColorClass). */
  color?: string | null;
  title: string;
  description?: string | null;
  /** Si está disponible: card clickeable. Si no: opaca + badge "Pronto". */
  available: boolean;
  /** Texto del CTA cuando está disponible (ej: "Leer teoría", "Abrir"). */
  cta: string;
  /** Icono del footer (default: el mismo icono del tile). */
  ctaIcon?: LucideIcon;
}

export function HubCard({
  icon: Icon,
  color,
  title,
  description,
  available,
  cta,
  ctaIcon,
}: HubCardProps) {
  const CtaIcon = ctaIcon ?? Icon;
  return (
    <div
      className={cn(
        "group block h-full rounded-2xl border bg-card p-5 shadow-soft transition",
        available ? "hover:-translate-y-0.5 hover:shadow-glow" : "opacity-60",
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${topicGradient(color)}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        {available ? (
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" />
        ) : (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Pronto
          </span>
        )}
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{description}</p>
      )}
      <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
        <CtaIcon className="h-3.5 w-3.5" />
        {available ? cta : "En preparación"}
      </p>
    </div>
  );
}
