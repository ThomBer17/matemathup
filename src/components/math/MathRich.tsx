import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";
import { sanitizeMathText } from "@/lib/ai/sanitize-text";

/**
 * Renderiza texto con matemática mixta: las expresiones en LaTeX delimitadas por
 * $...$ / $$...$$ / \(...\) / \[...\] se tipografían con KaTeX (fracciones apiladas,
 * radicales, superíndices), y el resto se muestra como prosa.
 *
 * Robustez:
 *  - Si una expresión LaTeX es inválida, cae a texto plano legible (sanitizeMathText)
 *    en vez de romper el render.
 *  - La prosa con LaTeX suelto (\theta fuera de $...$) también se sanea a unicode.
 */

// $$...$$ y \[...\] = display (centrado); $...$ y \(...\) = inline.
const MATH_RE = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\$([^$\n]+?)\$|\\\(([\s\S]+?)\\\)/g;

interface Seg {
  kind: "text" | "math";
  content: string;
  display?: boolean;
  html?: string;
}

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

/** La prosa solo se sanea si tiene LaTeX suelto, para no comer espacios normales. */
function cleanProse(s: string): string {
  return /[\\$]/.test(s) ? sanitizeMathText(s, { trim: false }) : s;
}

function parse(text: string): Seg[] {
  if (!text) return [];
  const out: Seg[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  MATH_RE.lastIndex = 0;
  while ((m = MATH_RE.exec(text)) !== null) {
    if (m.index > last) {
      out.push({ kind: "text", content: cleanProse(text.slice(last, m.index)) });
    }
    const display = m[1] != null || m[2] != null;
    const tex = m[1] ?? m[2] ?? m[3] ?? m[4] ?? "";
    const html = renderKatex(tex, display);
    if (html) {
      out.push({ kind: "math", content: tex, display, html });
    } else {
      // LaTeX inválido → texto plano legible.
      out.push({ kind: "text", content: sanitizeMathText(`$${tex}$`, { trim: false }) });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    out.push({ kind: "text", content: cleanProse(text.slice(last)) });
  }
  return out;
}

export function MathRich({ text, className }: { text: string; className?: string }) {
  const segs = useMemo(() => parse(text), [text]);
  return (
    <span className={className}>
      {segs.map((s, i) =>
        s.kind === "math" && s.html ? (
          <span
            key={i}
            className={cn(s.display && "my-2 block overflow-x-auto text-center")}
            dangerouslySetInnerHTML={{ __html: s.html }}
          />
        ) : (
          <span key={i}>{s.content}</span>
        ),
      )}
    </span>
  );
}
