import { LineChart, Calculator, Sigma, type LucideIcon } from "lucide-react";

/**
 * Registro único de herramientas. Fuente de verdad para:
 *  - el hub /tools (todas, incl. las "soon")
 *  - el sidebar (solo las "live")
 * Agregar una herramienta = agregar una entrada acá.
 */
export type ToolStatus = "live" | "soon";

export interface Tool {
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Color para el gradiente del tile (clave de topicColorClass). */
  color: string;
  status: ToolStatus;
  /** Ruta destino (solo para status "live"). */
  to?: string;
}

export const TOOLS: Tool[] = [
  {
    slug: "functions",
    title: "Explorador de funciones",
    description:
      "Mové sliders y mirá cómo cambian lineales, cuadráticas, trigonométricas, límites y derivadas en vivo.",
    icon: LineChart,
    color: "sky",
    status: "live",
    to: "/tools/functions",
  },
  {
    slug: "calculator",
    title: "Calculadora",
    description:
      "Escribí una expresión y obtené el resultado: aritmética, raíces, trig, logaritmos.",
    icon: Calculator,
    color: "violet",
    status: "live",
    to: "/tools/calculator",
  },
  {
    slug: "formulas",
    title: "Fórmulas",
    description: "Buscá fórmulas por tema, con notación lista para usar.",
    icon: Sigma,
    color: "teal",
    status: "soon",
  },
];

/** Herramientas disponibles (para el sidebar). */
export const liveTools = TOOLS.filter((t) => t.status === "live");
