import type { DiffOp, DiffType } from "../lib/diff";

// Colour is always paired with a symbol and a distinct underline/strike so the
// diff reads without colour vision.
const STYLE: Record<DiffType, { box: string; mark: string; label: string }> = {
  correct: { box: "bg-success-3 text-success-11 border-success-9", mark: "✓", label: "correct" },
  wrong: { box: "bg-error-3 text-error-11 border-error-9 underline decoration-wavy decoration-error-9 underline-offset-4", mark: "✗", label: "wrong letter" },
  extra: { box: "bg-warning-3 text-warning-11 border-warning-9 line-through decoration-2", mark: "+", label: "extra letter" },
  missing: { box: "bg-info-3 text-info-11 border-info-9 border-dashed underline decoration-dotted decoration-2 underline-offset-4", mark: "^", label: "missing letter" },
};

const show = (c: string) => (c === " " ? "␣" : c);

function describe(op: DiffOp): string {
  switch (op.type) {
    case "correct": return `${op.char} correct`;
    case "wrong": return `${op.char} should be ${op.expected}`;
    case "extra": return `extra ${op.char}`;
    case "missing": return `missing ${op.char}`;
  }
}

export function summarize(ops: DiffOp[]): string {
  const of = (t: DiffType) => ops.filter((o) => o.type === t);
  const parts: string[] = [];
  const wrong = of("wrong");
  if (wrong.length) parts.push(`${wrong.length} wrong (${wrong.map((o) => `${o.char}→${o.expected}`).join(", ")})`);
  const extra = of("extra");
  if (extra.length) parts.push(`${extra.length} extra (${extra.map((o) => o.char).join(", ")})`);
  const missing = of("missing");
  if (missing.length) parts.push(`${missing.length} missing (${missing.map((o) => o.char).join(", ")})`);
  return parts.join(" · ");
}

export default function DiffView({ ops }: { ops: DiffOp[] }) {
  return (
    <div>
      <ol className="flex flex-wrap gap-1 font-mono text-2xl" aria-label="Letter-by-letter comparison">
        {ops.map((op, i) => {
          const s = STYLE[op.type];
          return (
            <li key={i} className="flex flex-col items-center" aria-label={describe(op)}>
              <span className={`grid h-11 min-w-[2rem] place-items-center rounded-sm border px-1 ${s.box}`}>{show(op.char)}</span>
              <span className="mt-0.5 h-4 text-xs font-body leading-4 text-text-secondary" aria-hidden>
                {op.type === "wrong" ? `→${op.expected}` : op.type === "correct" ? "" : s.mark}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-sm text-text-secondary">{summarize(ops)}</p>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary" aria-label="Legend">
        {(["correct", "wrong", "extra", "missing"] as DiffType[]).map((t) => (
          <li key={t} className="flex items-center gap-1.5">
            <span className={`grid h-5 w-5 place-items-center rounded-sm border font-mono ${STYLE[t].box}`}>a</span>
            <span aria-hidden>{STYLE[t].mark}</span> {t === "wrong" ? "wrong (→ should be)" : t === "extra" ? "extra — remove" : t === "missing" ? "missing — add" : "correct"}
          </li>
        ))}
      </ul>
    </div>
  );
}
