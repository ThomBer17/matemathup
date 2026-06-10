import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

/**
 * Tema claro/oscuro persistido en localStorage. La clase `.dark` en <html> la setea
 * primero un script inline en __root (anti-parpadeo); acá la sincronizamos en cliente.
 * `mounted` evita mismatch de hidratación (en SSR no conocemos el tema real).
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setThemeState(document.documentElement.classList.contains("dark") ? "dark" : "light");
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("theme", theme);
    } catch {
      /* almacenamiento bloqueado: igual aplica en memoria */
    }
  }, [theme, mounted]);

  return {
    theme,
    mounted,
    setTheme: setThemeState,
    toggle: () => setThemeState((t) => (t === "dark" ? "light" : "dark")),
  };
}
