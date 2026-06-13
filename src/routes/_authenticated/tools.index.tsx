import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Wrench } from "lucide-react";
import { TOOLS } from "@/lib/tools";
import { HubCard } from "@/components/HubCard";

export const Route = createFileRoute("/_authenticated/tools/")({
  component: ToolsIndex,
});

function ToolsIndex() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8 md:py-12">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <Wrench className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold">Herramientas</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Utilidades para explorar, calcular y consultar — usalas cuando las necesites.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool, i) => {
          const live = tool.status === "live";
          const card = (
            <HubCard
              icon={tool.icon}
              color={tool.color}
              title={tool.title}
              description={tool.description}
              available={live}
              cta="Abrir"
            />
          );
          return (
            <motion.div
              key={tool.slug}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.03 * i }}
            >
              {live && tool.to ? <Link to={tool.to}>{card}</Link> : card}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
