// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { visualizer } from "rollup-plugin-visualizer";

function vendorChunk(id: string) {
  if (!id.includes("node_modules")) return undefined;
  if (id.includes("node_modules/pdfjs-dist")) return "vendor-pdf";
  if (id.includes("node_modules/tesseract.js")) return "vendor-ocr";
  if (id.includes("node_modules/katex")) return "vendor-math";
  if (id.includes("node_modules/recharts")) return "vendor-charts";
  if (id.includes("node_modules/react") || id.includes("node_modules/scheduler")) {
    return "vendor-react";
  }
  if (id.includes("node_modules/@tanstack")) return "vendor-tanstack";
  if (id.includes("node_modules/@supabase")) return "vendor-supabase";
  if (id.includes("node_modules/@radix-ui")) return "vendor-radix";
  if (id.includes("node_modules/lucide-react")) return "vendor-icons";
  if (id.includes("node_modules/motion")) return "vendor-motion";
  return undefined;
}

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins:
      process.env.ANALYZE === "1"
        ? [
            visualizer({
              filename: "dist/bundle-stats.html",
              gzipSize: true,
              brotliSize: true,
              template: "treemap",
            }),
          ]
        : [],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            return vendorChunk(id);
          },
        },
      },
    },
  },
});
