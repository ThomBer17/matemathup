import type { TheoryTopic } from "./types";
import { numerosReales } from "./numeros-reales";
import { algebra } from "./algebra";
import { funciones } from "./funciones";
import { trigonometria } from "./trigonometria";
import { logaritmos } from "./logaritmos";
import { sistemasDeEcuaciones } from "./sistemas-de-ecuaciones";
import { geometria } from "./geometria";
import { probabilidad } from "./probabilidad";
import { limites } from "./limites";
import { derivadas } from "./derivadas";
import { integrales } from "./integrales";

export type { TheoryTopic, TheoryFormula, TheoryExample } from "./types";

/**
 * Registro de toda la teoría, indexado por slug (mismo slug que la tabla `topics`).
 * Para agregar un tema: crear su archivo de datos y sumarlo acá. Nada más.
 */
export const THEORY: Record<string, TheoryTopic> = {
  "numeros-reales": numerosReales,
  algebra,
  funciones,
  trigonometria,
  logaritmos,
  "sistemas-de-ecuaciones": sistemasDeEcuaciones,
  geometria,
  probabilidad,
  limites,
  derivadas,
  integrales,
};

export function getTheory(slug: string): TheoryTopic | undefined {
  return THEORY[slug];
}

export function hasTheory(slug: string): boolean {
  return slug in THEORY;
}
