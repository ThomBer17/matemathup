import type { ReactNode } from "react";
import { InteractiveFunction } from "@/components/math/InteractiveFunction";
import { TrigVisualizer } from "@/components/math/TrigVisualizer";
import { DerivativeExplorer } from "@/components/math/DerivativeExplorer";
import { LimitExplorer } from "@/components/math/LimitExplorer";

/**
 * Bloque interactivo embebido en la teoría, anclado al concepto que se explica
 * (contigüidad: manipular la representación al lado del texto, no en otra sección).
 * Curado por slug en un solo lugar. Reutiliza los exploradores existentes.
 */
export function getInteractive(slug: string): ReactNode | null {
  switch (slug) {
    case "funciones":
      return (
        <InteractiveFunction
          title="Función cuadrática"
          description="y = a(x − h)² + k. Movés los parámetros y ves cómo se desplaza y abre la parábola."
          template="y=${a}(x-${h})^{2}+${k}"
          params={[
            { key: "a", label: "Apertura (a)", min: -3, max: 3, default: 1 },
            { key: "h", label: "Desp. horizontal (h)", min: -5, max: 5, default: 0 },
            { key: "k", label: "Desp. vertical (k)", min: -5, max: 5, default: 0 },
          ]}
          bounds={{ left: -10, right: 10, bottom: -10, top: 10 }}
        />
      );
    case "trigonometria":
      return <TrigVisualizer />;
    case "derivadas":
      return <DerivativeExplorer />;
    case "limites":
      return <LimitExplorer />;
    default:
      return null;
  }
}
