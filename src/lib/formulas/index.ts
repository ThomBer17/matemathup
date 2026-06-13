import type { Formula } from "./types";
import { algebra } from "./algebra";
import { trig } from "./trig";
import { geometry } from "./geometry";
import { functions } from "./functions";
import { stats } from "./stats";

export type {
  Formula,
  FormulaVar,
  FormulaVariant,
  Step,
  FormulaResult,
  FormulaInputs,
  FormulaComputeOpts,
} from "./types";

/** Catálogo completo. Agregar una fórmula = sumarla a su archivo de tema. */
export const FORMULAS: Formula[] = [...algebra, ...trig, ...geometry, ...functions, ...stats];

/** Orden de temas para el catálogo. */
export const TOPIC_ORDER = ["Álgebra", "Trigonometría", "Geometría", "Funciones", "Estadística"];

export function getFormula(slug: string): Formula | undefined {
  return FORMULAS.find((f) => f.slug === slug);
}

/** Fórmulas agrupadas por tema, en el orden de TOPIC_ORDER. */
export function formulasByTopic(): { topic: string; formulas: Formula[] }[] {
  return TOPIC_ORDER.map((topic) => ({
    topic,
    formulas: FORMULAS.filter((f) => f.topic === topic),
  })).filter((g) => g.formulas.length > 0);
}
