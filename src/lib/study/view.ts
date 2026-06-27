import { toArgentinaDate } from "./plan";

export type StudyTaskViewInput = {
  id: string;
  date: string;
  status: string;
  topic_slug: string | null;
};

export type CorrectAttemptInput = {
  topic_id: string | null;
  created_at: string;
};

export function earliestTaskDate(tasks: StudyTaskViewInput[], fallback: string) {
  if (!tasks.length) return fallback;
  return tasks.reduce(
    (earliest, task) => (task.date < earliest ? task.date : earliest),
    tasks[0].date,
  );
}

export function countOverdueTasks(tasks: StudyTaskViewInput[], today: string) {
  return tasks.filter((task) => task.status !== "done" && task.date < today).length;
}

export function groupTasksByDate<T extends { date: string }>(tasks: T[]) {
  const byDate = new Map<string, T[]>();
  for (const task of tasks) {
    const bucket = byDate.get(task.date) ?? [];
    bucket.push(task);
    byDate.set(task.date, bucket);
  }
  return Array.from(byDate.entries());
}

export function countCorrectAttemptsByTask(
  tasks: StudyTaskViewInput[],
  attempts: CorrectAttemptInput[],
  slugToTopicId: Record<string, string>,
) {
  const counts = new Map<string, number>();
  for (const task of tasks) {
    const topicId = task.topic_slug ? slugToTopicId[task.topic_slug] : null;
    let count = 0;
    for (const attempt of attempts) {
      if (toArgentinaDate(attempt.created_at) < task.date) continue;
      if (topicId && attempt.topic_id !== topicId) continue;
      count++;
    }
    counts.set(task.id, count);
  }
  return counts;
}
