import { type RefObject } from "react";
import { cn } from "@/lib/utils";

interface Chip {
  label: string;
  insert: string;
  cursorOffset?: number;
  title?: string;
}

const CHIPS: Chip[] = [
  { label: "√", insert: "sqrt(", title: "Raíz cuadrada" },
  { label: "x²", insert: "^2", title: "Cuadrado" },
  { label: "^", insert: "^", title: "Potencia" },
  { label: "π", insert: "pi", title: "Pi" },
  { label: "/", insert: "/", title: "Fracción / división" },
  { label: "( )", insert: "()", cursorOffset: 1, title: "Paréntesis" },
  { label: "|x|", insert: "||", cursorOffset: 1, title: "Valor absoluto" },
  { label: "sin", insert: "sin(", title: "Seno" },
  { label: "cos", insert: "cos(", title: "Coseno" },
  { label: "tan", insert: "tan(", title: "Tangente" },
  { label: "log", insert: "log(", title: "Logaritmo base 10" },
  { label: "ln", insert: "ln(", title: "Logaritmo natural" },
  { label: "≤", insert: "≤", title: "Menor o igual" },
  { label: "≥", insert: "≥", title: "Mayor o igual" },
  { label: "≠", insert: "≠", title: "Distinto" },
  { label: "∞", insert: "∞", title: "Infinito" },
];

export type MathInputTarget = HTMLInputElement | HTMLTextAreaElement;

export function MathInputHelper({
  targetRef,
  value,
  onChange,
  disabled = false,
  className,
}: {
  targetRef: RefObject<MathInputTarget | null>;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const handleInsert = (chip: Chip) => {
    const el = targetRef.current;
    if (!el) {
      onChange(value + chip.insert);
      return;
    }

    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + chip.insert + value.slice(end);
    onChange(next);

    requestAnimationFrame(() => {
      const newPos = start + (chip.cursorOffset ?? chip.insert.length);
      el.focus();
      el.setSelectionRange(newPos, newPos);
    });
  };

  return (
    <div
      className={cn(
        "flex flex-wrap gap-1.5 rounded-lg border bg-muted/30 p-2",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
      role="toolbar"
      aria-label="Símbolos matemáticos"
    >
      {CHIPS.map((chip) => (
        <button
          key={chip.label}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => handleInsert(chip)}
          disabled={disabled}
          title={chip.title}
          className="rounded-md border bg-background px-2 py-1 font-mono text-xs leading-none text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 active:scale-95"
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
