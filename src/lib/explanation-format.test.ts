import { describe, it, expect } from "vitest";
import { parseExplanation, parseSteps, splitMathFragments } from "./explanation-format";
import { repairDanglingMathIdentities } from "./math-to-latex";

function plain(frags: { text: string; math: boolean }[]): string {
  return frags.map((f) => f.text).join("");
}
function chips(frags: { text: string; math: boolean }[]): string[] {
  return frags.filter((f) => f.math).map((f) => f.text);
}

describe("splitMathFragments — detecta expresiones como chips", () => {
  it("resalta una ecuación inline", () => {
    const f = splitMathFragments("Finalmente tan(θ)=-3/4 listo");
    expect(chips(f)).toContain("tan(θ)=-3/4");
    expect(plain(f)).toBe("Finalmente tan(θ)=-3/4 listo");
  });

  it("no rompe la puntuación final de la oración", () => {
    const f = splitMathFragments("Sabemos que csc(θ)=1/sen(θ).");
    expect(chips(f)).toContain("csc(θ)=1/sen(θ)");
    // el punto final queda como texto, no dentro del chip
    expect(f.find((x) => x.math)?.text.endsWith(".")).toBe(false);
    expect(plain(f)).toBe("Sabemos que csc(θ)=1/sen(θ).");
  });

  it("resalta potencias y fracciones", () => {
    const f = splitMathFragments("cos²(θ)=16/25 y cos(θ)=4/5");
    expect(chips(f)).toEqual(["cos²(θ)=16/25", "cos(θ)=4/5"]);
  });

  it("NO chipea números sueltos en prosa", () => {
    const f = splitMathFragments("Tenemos 5 casos posibles en total");
    expect(chips(f)).toEqual([]);
    expect(plain(f)).toBe("Tenemos 5 casos posibles en total");
  });

  it("NO chipea texto plano sin matemática", () => {
    const f = splitMathFragments("Aplicamos la identidad pitagórica");
    expect(chips(f)).toEqual([]);
  });
});

describe("parseExplanation — formato por pasos", () => {
  it("divide por conectores en pasos numerados", () => {
    const raw =
      "Sabemos que csc(θ)=1/sen(θ). Por lo tanto sen(θ)=-3/5. Aplicamos sen²(θ)+cos²(θ)=1. Despejamos cos(θ)=4/5. Finalmente tan(θ)=-3/4.";
    const r = parseExplanation(raw);
    expect(r.structured).toBe(true);
    expect(r.steps.length).toBeGreaterThanOrEqual(4);
    expect(r.steps.map((s) => s.n)).toEqual(
      Array.from({ length: r.steps.length }, (_, i) => i + 1),
    );
    // el último paso debe contener la ecuación final como chip
    const last = r.steps[r.steps.length - 1];
    const allChips = last.lines.flatMap((l) => chips(l.fragments));
    expect(allChips).toContain("tan(θ)=-3/4");
  });

  it("respeta enumeraciones explícitas 1) 2) 3)", () => {
    const raw = "1) Planteamos la ecuación. 2) Resolvemos x=2. 3) Verificamos.";
    const r = parseExplanation(raw);
    expect(r.structured).toBe(true);
    expect(r.steps.length).toBe(3);
    // el marcador "1)" original se quita (renumeramos nosotros)
    expect(plain(r.steps[0].lines[0].fragments)).toMatch(/^Planteamos/);
  });

  it("no confunde un número final de desigualdad con marcador de paso", () => {
    const raw =
      "1) Partimos de la desigualdad |x-3| < 5. 2) Se traduce a -5 < x-3 < 5. 3) Sumamos 3 en los tres miembros: -2 < x < 8.";
    const r = parseExplanation(raw);
    expect(r.structured).toBe(true);
    expect(plain(r.steps[0].lines[0].fragments)).toContain("|x-3| < 5");
    expect(plain(r.steps[1].lines[0].fragments)).toMatch(/^Se traduce/);
    expect(plain(r.steps[1].lines[0].fragments)).not.toContain("2)");
  });

  it("respeta marcadores 'Paso N'", () => {
    const raw = "Paso 1: planteamos. Paso 2: resolvemos.";
    const r = parseExplanation(raw);
    expect(r.steps.length).toBe(2);
    expect(plain(r.steps[0].lines[0].fragments)).toMatch(/^planteamos/);
  });

  it("respeta saltos de línea como cortes de paso", () => {
    const raw = "Primera idea.\nSegunda idea.\nTercera idea.";
    const r = parseExplanation(raw);
    expect(r.steps.length).toBe(3);
  });

  it("separa encabezado tipo 'Entonces:' del cuerpo", () => {
    const raw = "Entonces: sen(θ)=1/csc(θ) sen(θ)=-3/5";
    const r = parseExplanation(raw);
    // único segmento (un conector) → no estructurado, pero con header + 2 ecuaciones
    const step = r.steps[0];
    const texts = step.lines.map((l) => plain(l.fragments).trim());
    expect(texts[0]).toBe("Entonces:");
    expect(texts).toContain("sen(θ)=1/csc(θ)");
    expect(texts).toContain("sen(θ)=-3/5");
  });

  it("compatibilidad: explicación sin estructura → 1 paso sin numerar", () => {
    const raw = "El área del triángulo es base por altura dividido dos.";
    const r = parseExplanation(raw);
    expect(r.structured).toBe(false);
    expect(r.steps.length).toBe(1);
    expect(r.steps[0].n).toBeNull();
  });

  it("entrada vacía → sin pasos", () => {
    expect(parseExplanation("").steps).toEqual([]);
    expect(parseExplanation("   ").steps).toEqual([]);
  });
});

describe("parseSteps — segmenta conservando el texto crudo (con LaTeX)", () => {
  it("numera los pasos y preserva el LaTeX $...$", () => {
    const steps = parseSteps(
      "Sabemos que $\\csc(\\theta)=\\frac{1}{\\sin\\theta}$. Entonces $\\sin\\theta=-3/5$.",
    );
    expect(steps.length).toBe(2);
    expect(steps[0].n).toBe(1);
    expect(steps[0].text).toContain("$\\csc(\\theta)=\\frac{1}{\\sin\\theta}$");
    expect(steps[1].text).toContain("$\\sin\\theta=-3/5$");
  });

  it("sin estructura → un solo paso sin numerar", () => {
    const steps = parseSteps("El resultado es $x=2$.");
    expect(steps.length).toBe(1);
    expect(steps[0].n).toBeNull();
  });

  it("entrada vacía → []", () => {
    expect(parseSteps("")).toEqual([]);
  });
});

describe("repairDanglingMathIdentities", () => {
  it("completa la identidad pitagórica cuando queda sin lado derecho", () => {
    expect(repairDanglingMathIdentities("Usamos sen^2(x) + cos^2(x) =")).toBe(
      "Usamos sen^2(x) + cos^2(x) =1",
    );
  });

  it("completa la identidad pitagórica dentro de LaTeX inline", () => {
    expect(repairDanglingMathIdentities("Usamos $\\sin^2(x)+\\cos^2(x)=$.")).toBe(
      "Usamos $\\sin^2(x)+\\cos^2(x)=1$.",
    );
  });

  it("no toca igualdades que ya tienen lado derecho", () => {
    expect(repairDanglingMathIdentities("Usamos sen^2(x) + cos^2(x) = 1")).toBe(
      "Usamos sen^2(x) + cos^2(x) = 1",
    );
  });
});
