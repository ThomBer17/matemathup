import { useMemo, type ReactNode } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";
import { sanitizeMathText } from "@/lib/ai/sanitize-text";
import {
  plainMathToLatex,
  isRenderableMath,
  repairDanglingMathIdentities,
} from "@/lib/math-to-latex";
import { splitMathFragments } from "@/lib/explanation-format";

/**
 * Renderiza texto con matemática mixta tipografiada con KaTeX (fracciones apiladas,
 * radicales, superíndices). Cubre dos formas de entrada:
 *  1) LaTeX delimitado por $...$ / $$...$$ / \(...\) / \[...\] → KaTeX directo.
 *  2) Matemática "plana" suelta en la prosa (√(15² - 9²), cos(θ)=4/5) → se detecta y
 *     se convierte a LaTeX. La prosa con palabras (ej. "cateto_adyacente") queda como
 *     texto normal para no salir en bastardilla.
 *
 * Si una expresión es inválida, cae a texto legible en vez de romper el render.
 */

// $$...$$ y \[...\] = display (centrado); $...$ y \(...\) = inline.
const MATH_RE = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\$([^$\n]+?)\$|\\\(([\s\S]+?)\\\)/g;

function renderKatex(tex: string, display: boolean): string | null {
  try {
    return katex.renderToString(tex.trim(), {
      throwOnError: true,
      strict: false,
      displayMode: display,
      output: "html",
    });
  } catch {
    return null;
  }
}

function MathHtml({ html, display }: { html: string; display?: boolean }) {
  return (
    <span
      className={cn(display && "my-2 block overflow-x-auto text-center")}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/** Render de prosa: detecta corridas matemáticas planas y las tipografía con KaTeX. */
function renderProse(text: string, keyBase: string): ReactNode[] {
  if (!text) return [];
  return splitMathFragments(text).map((f, i) => {
    if (f.math && isRenderableMath(f.text)) {
      const html = renderKatex(plainMathToLatex(f.text), false);
      if (html) return <MathHtml key={`${keyBase}-${i}`} html={html} />;
    }
    return <span key={`${keyBase}-${i}`}>{f.text}</span>;
  });
}

function render(input: string): ReactNode[] {
  if (!input) return [];
  // Limpia "\n"/"\t"/"\r" literales sobrantes (no LaTeX: van seguidos de no-minúscula).
  const text = repairDanglingMathIdentities(input).replace(/\\[nrt](?![a-z])/g, " ");
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  MATH_RE.lastIndex = 0;
  while ((m = MATH_RE.exec(text)) !== null) {
    if (m.index > last) {
      out.push(...renderProse(text.slice(last, m.index), `p${k}`));
    }
    const display = m[1] != null || m[2] != null;
    const tex = m[1] ?? m[2] ?? m[3] ?? m[4] ?? "";
    const html = renderKatex(tex, display);
    if (html) {
      out.push(<MathHtml key={`m${k}`} html={html} display={display} />);
    } else {
      // LaTeX inválido → texto plano legible.
      out.push(<span key={`m${k}`}>{sanitizeMathText(`$${tex}$`, { trim: false })}</span>);
    }
    last = m.index + m[0].length;
    k++;
  }
  if (last < text.length) {
    out.push(...renderProse(text.slice(last), `p${k}`));
  }
  return out;
}

export function MathRich({ text, className }: { text: string; className?: string }) {
  const nodes = useMemo(() => render(text), [text]);
  return <span className={className}>{nodes}</span>;
}
