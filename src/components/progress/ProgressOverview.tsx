import { CheckCircle2, ListChecks, Target, Layers } from "lucide-react";
import type { OverallStats } from "@/lib/progress/aggregate";

export function ProgressOverview({ stats }: { stats: OverallStats }) {
  const items = [
    { label: "Ejercicios resueltos", value: stats.totalAttempts.toString(), Icon: ListChecks },
    { label: "Aciertos", value: stats.correctAttempts.toString(), Icon: CheckCircle2 },
    { label: "Precisión global", value: `${stats.accuracy}%`, Icon: Target },
    { label: "Temas activos", value: stats.activeTopics.toString(), Icon: Layers },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map(({ label, value, Icon }) => (
        <div key={label} className="rounded-2xl border bg-card p-4 shadow-soft">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <p className="mt-3 font-display text-2xl font-bold tabular-nums">{value}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
        </div>
      ))}
    </div>
  );
}
