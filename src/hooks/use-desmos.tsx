import { useEffect, useState } from "react";

const DESMOS_SRC =
  "https://www.desmos.com/api/v1.11/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6";

type DesmosWindow = Window & {
  Desmos?: {
    GraphingCalculator: (el: HTMLElement, opts?: Record<string, unknown>) => DesmosCalculator;
  };
};

export type DesmosCalculator = {
  setExpression: (e: Record<string, unknown>) => void;
  removeExpression: (e: { id: string }) => void;
  setExpressions: (e: Record<string, unknown>[]) => void;
  setMathBounds: (b: { left: number; right: number; bottom: number; top: number }) => void;
  setBlank: () => void;
  destroy: () => void;
  resize: () => void;
};

let loadPromise: Promise<void> | null = null;

function loadDesmos(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as DesmosWindow;
  if (w.Desmos) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(
      `script[src="${DESMOS_SRC}"]`,
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Desmos load error")));
      return;
    }
    const s = document.createElement("script");
    s.src = DESMOS_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Desmos load error"));
    document.head.appendChild(s);
  });
  return loadPromise;
}

export function useDesmos() {
  const [ready, setReady] = useState(
    typeof window !== "undefined" && !!(window as DesmosWindow).Desmos,
  );
  useEffect(() => {
    if (ready) return;
    let mounted = true;
    loadDesmos()
      .then(() => mounted && setReady(true))
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [ready]);
  return ready;
}

export function getDesmos() {
  if (typeof window === "undefined") return undefined;
  return (window as DesmosWindow).Desmos;
}
