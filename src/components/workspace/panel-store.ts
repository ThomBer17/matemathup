import { useSyncExternalStore } from "react";

/**
 * Estado compartido mínimo entre el Workspace (cajón lateral derecho) y la
 * Calculadora (FAB abajo a la derecha), para que puedan convivir abiertos: cuando
 * el Workspace está abierto, la Calculadora se corre a su izquierda y no queda tapada.
 */
let workspaceOpen = false;
const listeners = new Set<() => void>();

export function setWorkspaceOpen(value: boolean): void {
  if (workspaceOpen === value) return;
  workspaceOpen = value;
  listeners.forEach((l) => l());
}

export function useWorkspaceOpen(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => workspaceOpen,
    () => false, // SSR: cerrado
  );
}
