import { useSyncExternalStore } from "react";

/**
 * Registro compartido de paneles flotantes (Workspace, Calculadora, Fórmulas) para
 * que puedan convivir abiertos a la vez y reubicarse sin taparse. Además expone un
 * "bridge" para enviar texto al Workspace desde otra herramienta (ej. Fórmulas).
 */

const openPanels = new Set<string>();
const listeners = new Set<() => void>();

export const WORKSPACE_PANEL = "workspace";

function notify() {
  listeners.forEach((l) => l());
}

export function setPanelOpen(id: string, value: boolean): void {
  const has = openPanels.has(id);
  if (value === has) return;
  if (value) openPanels.add(id);
  else openPanels.delete(id);
  notify();
}

export function usePanelOpen(id: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => openPanels.has(id),
    () => false, // SSR: cerrado
  );
}

// --- Compatibilidad: el Workspace y la Calculadora usaban estos helpers ---
export function setWorkspaceOpen(value: boolean): void {
  setPanelOpen(WORKSPACE_PANEL, value);
}
export function useWorkspaceOpen(): boolean {
  return usePanelOpen(WORKSPACE_PANEL);
}

// --- Bridge: enviar texto al Workspace desde otra herramienta ---
const appendListeners = new Set<(text: string) => void>();

/** Envía una línea al Workspace (lo abre y la agrega). */
export function appendToWorkspace(text: string): void {
  appendListeners.forEach((l) => l(text));
}

export function subscribeWorkspaceAppend(cb: (text: string) => void): () => void {
  appendListeners.add(cb);
  return () => appendListeners.delete(cb);
}
