import { describe, expect, it } from "vitest";
import {
  countCorrectAttemptsByTask,
  countOverdueTasks,
  earliestTaskDate,
  groupTasksByDate,
  type CorrectAttemptInput,
  type StudyTaskViewInput,
} from "./view";

const tasks: StudyTaskViewInput[] = [
  { id: "later-topic", date: "2026-06-12", status: "pending", topic_slug: "algebra" },
  { id: "earlier-topic", date: "2026-06-10", status: "pending", topic_slug: "funciones" },
  { id: "general", date: "2026-06-11", status: "done", topic_slug: null },
];

describe("study view helpers", () => {
  it("finds the earliest task date", () => {
    expect(earliestTaskDate(tasks, "2026-06-01")).toBe("2026-06-10");
    expect(earliestTaskDate([], "2026-06-01")).toBe("2026-06-01");
  });

  it("counts overdue unfinished tasks", () => {
    expect(countOverdueTasks(tasks, "2026-06-12")).toBe(1);
  });

  it("groups tasks by date preserving order", () => {
    expect(groupTasksByDate(tasks)).toEqual([
      ["2026-06-12", [tasks[0]]],
      ["2026-06-10", [tasks[1]]],
      ["2026-06-11", [tasks[2]]],
    ]);
  });

  it("counts correct attempts per task by date and topic", () => {
    const attempts: CorrectAttemptInput[] = [
      { topic_id: "topic-algebra", created_at: "2026-06-12T15:00:00Z" },
      { topic_id: "topic-algebra", created_at: "2026-06-11T15:00:00Z" },
      { topic_id: "topic-funciones", created_at: "2026-06-10T15:00:00Z" },
    ];

    const counts = countCorrectAttemptsByTask(tasks, attempts, {
      algebra: "topic-algebra",
      funciones: "topic-funciones",
    });

    expect(counts.get("later-topic")).toBe(1);
    expect(counts.get("earlier-topic")).toBe(1);
    expect(counts.get("general")).toBe(2);
  });
});
