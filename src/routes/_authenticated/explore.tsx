import { createFileRoute, redirect } from "@tanstack/react-router";

// Ruta legacy: "Explorar" pasó a "Explorador de funciones" bajo /tools.
// Mantenemos /explore como redirección para no romper bookmarks ni links viejos.
export const Route = createFileRoute("/_authenticated/explore")({
  beforeLoad: () => {
    throw redirect({ to: "/tools/functions", replace: true });
  },
});
