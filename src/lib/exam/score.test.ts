import { describe, it, expect } from "vitest";
import { scoreExam, examGrade, shuffle, type ExamQuestion } from "./score";

function q(id: string, topicName: string): ExamQuestion {
  return { id, topicId: id, topicName, statement: "", options: [], correctAnswer: "x", explanation: "" };
}

describe("scoreExam", () => {
  it("cuenta aciertos y porcentaje", () => {
    const s = scoreExam([
      { question: q("1", "Álgebra"), selected: "x", correct: true },
      { question: q("2", "Álgebra"), selected: "y", correct: false },
      { question: q("3", "Geometría"), selected: "x", correct: true },
      { question: q("4", "Geometría"), selected: null, correct: false },
    ]);
    expect(s.correct).toBe(2);
    expect(s.total).toBe(4);
    expect(s.pct).toBe(50);
  });

  it("desglosa por tema", () => {
    const s = scoreExam([
      { question: q("1", "Álgebra"), selected: "x", correct: true },
      { question: q("2", "Álgebra"), selected: "x", correct: true },
      { question: q("3", "Geometría"), selected: "y", correct: false },
    ]);
    const alg = s.byTopic.find((t) => t.topicName === "Álgebra");
    const geo = s.byTopic.find((t) => t.topicName === "Geometría");
    expect(alg).toEqual({ topicName: "Álgebra", correct: 2, total: 2 });
    expect(geo).toEqual({ topicName: "Geometría", correct: 0, total: 1 });
  });

  it("examen vacío → 0%", () => {
    expect(scoreExam([]).pct).toBe(0);
  });
});

describe("examGrade", () => {
  it("convierte porcentaje a nota 1-10", () => {
    expect(examGrade(100)).toBe(10);
    expect(examGrade(0)).toBe(1);
    expect(examGrade(50)).toBe(6); // 0.5*9+1 = 5.5 → 6
  });
});

describe("shuffle", () => {
  it("conserva los mismos elementos", () => {
    const arr = [1, 2, 3, 4, 5];
    const out = shuffle(arr);
    expect(out.slice().sort()).toEqual(arr);
    expect(arr).toEqual([1, 2, 3, 4, 5]); // no muta el original
  });
});
