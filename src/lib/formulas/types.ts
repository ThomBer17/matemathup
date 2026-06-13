import type { AngleMode } from "@/lib/calc-eval";

/** Un input puede ser un escalar o una lista de números (media/mediana/desvío). */
export type InputKind = "scalar" | "list";

export interface FormulaVar {
  key: string;
  /** Explicación de la variable (se muestra como "a — Coeficiente cuadrático"). */
  label: string;
  /** Símbolo en LaTeX (sin $). */
  latex: string;
  kind?: InputKind; // default "scalar"
  placeholder?: string;
}

export interface FormulaVariant {
  key: string;
  label: string;
  /** Subconjunto de var keys que pide esta variante (si se omite: todas). */
  uses?: string[];
}

export interface Step {
  label: string;
  /** Contenido LaTeX del paso (sin $; el render lo envuelve). */
  latex: string;
}

export interface FormulaResult {
  steps: Step[];
  /** Resultado exacto en LaTeX (fracción, kπ, par ordenado). Opcional. */
  exactLatex?: string;
  /** Resultado decimal listo para mostrar. */
  decimal?: string;
  /** Texto plano para "copiar". */
  copyText: string;
  /** Caso especial / advertencia (ej: discriminante negativo). */
  note?: string;
}

export type FormulaInputs = Record<string, number | number[]>;

export interface FormulaComputeOpts {
  variant?: string;
  exact?: boolean;
  angleMode?: AngleMode;
}

export interface Formula {
  slug: string;
  topic: string;
  name: string;
  description: string;
  /** Fórmula original en LaTeX. */
  latex: string;
  vars: FormulaVar[];
  variants?: FormulaVariant[];
  /** Usa ángulos → el solver muestra el toggle grados/radianes. */
  angle?: boolean;
  compute: (inputs: FormulaInputs, opts: FormulaComputeOpts) => FormulaResult;
}
