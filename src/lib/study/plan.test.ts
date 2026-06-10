import { describe, it, expect } from "vitest";
import {
  generatePlan,
  buildTopicSequence,
  computePlanProgress,
  replanTasks,
  daysUntil,
  addDays,
  taskTarget,
  deriveTaskState,
  shouldAutoComplete,
  canCompleteTask,
  toArgentinaDate,
} from "./plan";

describe("integridad de tareas — umbrales y estado", () => {
  const TODAY = "2026-06-10";

  it("taskTarget según tipo", () => {
    expect(taskTarget("practice")).toBe(3);
    expect(taskTarget("review")).toBe(3);
    expect(taskTarget("general_review")).toBe(5);
    expect(taskTarget("simulacro")).toBe(8);
  });

  it("tarea futura → upcoming (no completable)", () => {
    const t = { date: "2026-06-12", status: "pending", completion_type: null, kind: "practice" };
    expect(deriveTaskState(t, TODAY, 5).state).toBe("upcoming");
    expect(canCompleteTask(t.date, TODAY)).toBe(false);
    expect(shouldAutoComplete(t, TODAY, 99)).toBe(false); // nunca auto-completa futuras
  });

  it("tarea de hoy: pending → in_progress según progreso", () => {
    const t = { date: TODAY, status: "pending", completion_type: null, kind: "practice" };
    expect(deriveTaskState(t, TODAY, 0).state).toBe("pending");
    const ip = deriveTaskState(t, TODAY, 2);
    expect(ip.state).toBe("in_progress");
    expect(ip.progress).toBe(2);
    expect(ip.target).toBe(3);
  });

  it("auto-completa al alcanzar el umbral (hoy o atrasada)", () => {
    const hoy = { date: TODAY, status: "pending", completion_type: null, kind: "practice" };
    expect(shouldAutoComplete(hoy, TODAY, 3)).toBe(true);
    const atrasada = { date: "2026-06-08", status: "pending", completion_type: null, kind: "practice" };
    expect(canCompleteTask(atrasada.date, TODAY)).toBe(true);
    expect(shouldAutoComplete(atrasada, TODAY, 3)).toBe(true);
    expect(shouldAutoComplete(atrasada, TODAY, 2)).toBe(false);
  });

  it("tarea hecha → done_auto vs done_manual", () => {
    expect(deriveTaskState({ date: TODAY, status: "done", completion_type: "auto", kind: "practice" }, TODAY, 0).state).toBe("done_auto");
    expect(deriveTaskState({ date: TODAY, status: "done", completion_type: "manual", kind: "practice" }, TODAY, 0).state).toBe("done_manual");
    // ya hecha no se vuelve a auto-completar
    expect(shouldAutoComplete({ date: TODAY, status: "done", completion_type: "auto", kind: "practice" }, TODAY, 9)).toBe(false);
  });

  it("toArgentinaDate corre la medianoche UTC al día anterior (UTC-3)", () => {
    expect(toArgentinaDate("2026-06-10T01:00:00Z")).toBe("2026-06-09");
    expect(toArgentinaDate("2026-06-10T12:00:00Z")).toBe("2026-06-10");
  });
});

const TOPICS = [
  { slug: "funciones", name: "Funciones", mastery: 92 },
  { slug: "logaritmos", name: "Logaritmos", mastery: 41 },
  { slug: "trigonometria", name: "Trigonometría", mastery: 56 },
];

describe("buildTopicSequence", () => {
  it("da más slots al tema más débil", () => {
    const seq = buildTopicSequence(TOPICS, 12);
    const count = (slug: string) => seq.filter((t) => t.slug === slug).length;
    expect(count("logaritmos")).toBeGreaterThan(count("funciones"));
    expect(count("trigonometria")).toBeGreaterThanOrEqual(count("funciones"));
    expect(seq).toHaveLength(12);
  });

  it("intercala (no agrupa el mismo tema seguido siempre)", () => {
    const seq = buildTopicSequence(TOPICS, 6).map((t) => t.slug);
    // No deberían ser los 6 iguales.
    expect(new Set(seq).size).toBeGreaterThan(1);
  });

  it("con días para todos, cada tema aparece al menos una vez", () => {
    const seq = buildTopicSequence(TOPICS, 5);
    for (const t of TOPICS) {
      expect(seq.some((s) => s.slug === t.slug)).toBe(true);
    }
  });
});

describe("generatePlan", () => {
  it("reserva simulacro el último día y repaso general antes", () => {
    const tasks = generatePlan({
      today: "2026-06-01",
      examDate: "2026-06-15",
      dailyMinutes: 30,
      topics: TOPICS,
    });
    const last = tasks[tasks.length - 1];
    expect(last.kind).toBe("simulacro");
    expect(last.date).toBe("2026-06-14"); // día antes del examen
    expect(tasks.some((t) => t.kind === "general_review")).toBe(true);
  });

  it("temas débiles reciben más tareas que los fuertes", () => {
    const tasks = generatePlan({
      today: "2026-06-01",
      examDate: "2026-06-20",
      dailyMinutes: 30,
      topics: TOPICS,
    });
    const c = (slug: string) => tasks.filter((t) => t.topicSlug === slug).length;
    expect(c("logaritmos")).toBeGreaterThan(c("funciones"));
  });

  it("examen hoy o pasado → un simulacro hoy", () => {
    const tasks = generatePlan({ today: "2026-06-10", examDate: "2026-06-10", dailyMinutes: 30, topics: TOPICS });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].kind).toBe("simulacro");
  });

  it("las fechas están ordenadas y dentro del rango", () => {
    const tasks = generatePlan({ today: "2026-06-01", examDate: "2026-06-08", dailyMinutes: 30, topics: TOPICS });
    for (let i = 1; i < tasks.length; i++) {
      expect(tasks[i].date >= tasks[i - 1].date).toBe(true);
    }
    expect(tasks.every((t) => t.date >= "2026-06-01" && t.date < "2026-06-08")).toBe(true);
  });
});

describe("computePlanProgress", () => {
  it("calcula porcentaje", () => {
    expect(computePlanProgress([{ status: "done" }, { status: "pending" }, { status: "done" }, { status: "pending" }]))
      .toEqual({ done: 2, total: 4, pct: 50 });
    expect(computePlanProgress([]).pct).toBe(0);
  });
});

describe("replanTasks", () => {
  it("redistribuye solo las pendientes en los días restantes", () => {
    const tasks = [
      { id: "a", status: "done", orderIndex: 0 },
      { id: "b", status: "pending", orderIndex: 1 },
      { id: "c", status: "pending", orderIndex: 2 },
    ];
    const updates = replanTasks(tasks, "2026-06-10", "2026-06-13");
    expect(updates.map((u) => u.id).sort()).toEqual(["b", "c"]);
    expect(updates.every((u) => u.date >= "2026-06-10" && u.date < "2026-06-13")).toBe(true);
  });

  it("si el examen ya pasó, manda todo a hoy", () => {
    const updates = replanTasks([{ id: "b", status: "pending", orderIndex: 1 }], "2026-06-20", "2026-06-15");
    expect(updates).toEqual([{ id: "b", date: "2026-06-20" }]);
  });
});

describe("utilidades de fecha", () => {
  it("daysUntil y addDays", () => {
    expect(daysUntil("2026-06-15", "2026-06-01")).toBe(14);
    expect(daysUntil("2026-05-30", "2026-06-01")).toBe(0); // no negativo
    expect(addDays("2026-06-01", 5)).toBe("2026-06-06");
  });
});
