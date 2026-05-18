import {
  Sigma,
  Brackets,
  Ruler,
  FunctionSquare,
  Infinity as InfinityIcon,
  Triangle,
  TrendingUp,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

const map: Record<string, LucideIcon> = {
  Sigma,
  BracketsIcon: Brackets,
  Ruler,
  Function: FunctionSquare,
  Infinity: InfinityIcon,
  Triangle,
  TrendingUp,
};

export function getTopicIcon(name?: string | null): LucideIcon {
  if (!name) return BookOpen;
  return map[name] ?? BookOpen;
}

export const topicColorClass: Record<string, string> = {
  sky: "from-sky-500/20 to-sky-500/5 text-sky-600",
  blue: "from-blue-500/20 to-blue-500/5 text-blue-600",
  indigo: "from-indigo-500/20 to-indigo-500/5 text-indigo-600",
  cyan: "from-cyan-500/20 to-cyan-500/5 text-cyan-600",
  teal: "from-teal-500/20 to-teal-500/5 text-teal-600",
  violet: "from-violet-500/20 to-violet-500/5 text-violet-600",
  rose: "from-rose-500/20 to-rose-500/5 text-rose-600",
};

export function topicGradient(color?: string | null) {
  return topicColorClass[color ?? "sky"] ?? topicColorClass.sky;
}
