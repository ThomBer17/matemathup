import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { LineChart, Sigma, Activity, Infinity as InfinityIcon, Compass } from "lucide-react";
import { InteractiveFunction } from "@/components/math/InteractiveFunction";
import { TrigVisualizer } from "@/components/math/TrigVisualizer";
import { DerivativeExplorer } from "@/components/math/DerivativeExplorer";
import { LimitExplorer } from "@/components/math/LimitExplorer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/explore")({
  component: ExplorePage,
});

const TABS = [
  { value: "lineal", label: "Lineal", icon: LineChart },
  { value: "cuadratica", label: "Cuadrática", icon: Sigma },
  { value: "trig", label: "Trigonometría", icon: Compass },
  { value: "limites", label: "Límites", icon: InfinityIcon },
  { value: "derivadas", label: "Derivadas", icon: Activity },
];

function ExplorePage() {
  const [tab, setTab] = useState("lineal");
  return (
    <div className="mx-auto max-w-5xl px-6 py-8 md:py-12">
      <div>
        <h1 className="font-display text-3xl font-bold">Explorá matemática</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mové los sliders y observá cómo cambian las funciones en tiempo real.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-8">
        <TabsList className="flex flex-wrap">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="gap-2">
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-6">
          <TabsContent value="lineal">
            <InteractiveFunction
              title="Función lineal"
              description="y = m·x + b. Cambiá la pendiente y la ordenada al origen."
              template="y=${m}x+${b}"
              params={[
                { key: "m", label: "Pendiente (m)", min: -5, max: 5, default: 1 },
                { key: "b", label: "Ordenada (b)", min: -5, max: 5, default: 0 },
              ]}
              bounds={{ left: -10, right: 10, bottom: -10, top: 10 }}
            />
          </TabsContent>

          <TabsContent value="cuadratica">
            <InteractiveFunction
              title="Función cuadrática"
              description="y = a(x − h)² + k. El vértice está en (h, k)."
              template="y=${a}(x-${h})^{2}+${k}"
              params={[
                { key: "a", label: "Apertura (a)", min: -3, max: 3, default: 1 },
                { key: "h", label: "Desp. horizontal (h)", min: -5, max: 5, default: 0 },
                { key: "k", label: "Desp. vertical (k)", min: -5, max: 5, default: 0 },
              ]}
              bounds={{ left: -10, right: 10, bottom: -10, top: 10 }}
            />
          </TabsContent>

          <TabsContent value="trig">
            <TrigVisualizer />
          </TabsContent>

          <TabsContent value="limites">
            <LimitExplorer />
          </TabsContent>

          <TabsContent value="derivadas">
            <DerivativeExplorer />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
