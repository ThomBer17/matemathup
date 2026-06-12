/**
 * Puntaje del simulacro de examen. Lógica pura y testeable.
 */

export interface ExamQuestion {
  id: string;
  topicId: string | null;
  topicName: string | null;
  statement: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface ExamAnswer {
  question: ExamQuestion;
  selected: string | null; // opción elegida, o null si no respondió
  correct: boolean;
}

export interface TopicScore {
  topicName: string;
  correct: number;
  total: number;
}

export interface ExamScore {
  correct: number;
  total: number;
  pct: number;
  byTopic: TopicScore[];
}

export function scoreExam(answers: ExamAnswer[]): ExamScore {
  const total = answers.length;
  const correct = answers.filter((a) => a.correct).length;

  const map = new Map<string, TopicScore>();
  for (const a of answers) {
    const name = a.question.topicName ?? "General";
    const cur = map.get(name) ?? { topicName: name, correct: 0, total: 0 };
    cur.total += 1;
    if (a.correct) cur.correct += 1;
    map.set(name, cur);
  }

  return {
    correct,
    total,
    pct: total ? Math.round((correct / total) * 100) : 0,
    byTopic: Array.from(map.values()).sort((a, b) => a.topicName.localeCompare(b.topicName)),
  };
}

/** Nota conceptual 1-10 a partir del porcentaje. */
export function examGrade(pct: number): number {
  return Math.round((pct / 100) * 9 + 1);
}

/** Mezcla un array (Fisher-Yates). Impuro por diseño; la usamos para el orden. */
export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
