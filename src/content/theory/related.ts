import { hasTheory } from "./index";

/**
 * Conceptos relacionados entre temas de teoría (curado en un solo lugar para no
 * tocar los 11 archivos de contenido). Cada entrada apunta a slugs de otros temas.
 */
export const RELATED: Record<string, string[]> = {
  "numeros-reales": ["algebra", "logaritmos"],
  algebra: ["funciones", "sistemas-de-ecuaciones", "numeros-reales"],
  funciones: ["trigonometria", "limites", "algebra"],
  trigonometria: ["funciones", "geometria"],
  logaritmos: ["funciones", "algebra"],
  "sistemas-de-ecuaciones": ["algebra", "funciones"],
  geometria: ["trigonometria", "funciones"],
  probabilidad: ["numeros-reales"],
  limites: ["funciones", "derivadas"],
  derivadas: ["limites", "funciones", "integrales"],
  integrales: ["derivadas", "funciones"],
};

/** Slugs relacionados que efectivamente tienen teoría disponible. */
export function getRelated(slug: string): string[] {
  return (RELATED[slug] ?? []).filter(hasTheory);
}
