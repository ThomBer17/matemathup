import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Sparkles, Brain, Target, Flame, ArrowRight, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "MatemathUp — Matemática adaptativa" },
      {
        name: "description",
        content:
          "Aprendé matemática con ejercicios adaptativos, IA y explicaciones paso a paso. Pensado para preparar materias previas de secundaria.",
      },
    ],
  }),
});

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* soft grid bg */}
      <div className="bg-grid-soft pointer-events-none absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-soft">
            <GraduationCap className="h-5 w-5" />
          </div>
          MatemathUp
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/login">
            <Button variant="ghost">Ingresar</Button>
          </Link>
          <Link to="/signup">
            <Button>Empezar gratis</Button>
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pt-12 pb-24 md:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Ejercicios generados con IA · adaptados a tu nivel
          </span>
          <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            Aprobá matemática <br />
            <span className="text-gradient-brand">a tu ritmo.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
            Ejercicios adaptativos, explicaciones paso a paso y seguimiento de tu progreso.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/signup">
              <Button size="lg" className="gap-2">
                Crear cuenta gratis <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline">
                Ya tengo cuenta
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Gratis para empezar · sin tarjeta · cancelás cuando quieras
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mx-auto mt-20 grid max-w-4xl gap-4 md:grid-cols-3"
        >
          {[
            { icon: Brain, title: "IA pedagógica", desc: "Ejercicios y explicaciones generados según tu nivel." },
            { icon: Target, title: "Adaptativo", desc: "Sube y baja la dificultad según tu desempeño." },
            { icon: Flame, title: "Racha diaria", desc: "Gamificación que te motiva a seguir aprendiendo." },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="rounded-2xl border bg-card p-6 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-glow"
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </main>

      <footer className="relative z-10 border-t bg-card/40 py-6 text-center text-xs text-muted-foreground">
        MatemathUp · Hecho con cariño para estudiantes
      </footer>
    </div>
  );
}
