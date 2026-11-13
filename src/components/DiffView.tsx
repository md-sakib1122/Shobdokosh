import type { DiffOp, DiffType } from "../lib/diff";

// Colour is always paired with a symbol and a distinct underline/strike so the
// diff reads without colour vision.
const STYLE: Record<DiffType, { box: string; mark: string; label: string }> = {
  correct: { box: "bg-emerald-50 text-emerald-900 ring-emerald-300", mark: "✓", label: "correct" },
  wrong: { box: "bg-rose-50 text-rose-900 ring-rose-400 underline decoration-wavy decoration-rose-500 underline-offset-4", mark: "✗", label: "wrong letter" },
  extra: { box: "bg-amber-50 text-amber-900 ring-amber-400 line-through decoration-2", mark: "+", label: "extra letter" },
  missing: { box: "bg-sky-50 text-sky-900 ring-sky-400 ring-dashed border-dashed underline decoration-dotted decoration-2 underline-offset-4", mark: "^", label: "missing letter" },
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
              <span className={`grid h-11 min-w-[2rem] place-items-center rounded-lg px-1 ring-1 ${s.box}`}>{show(op.char)}</span>
              <span className="mt-0.5 h-4 text-xs font-sans leading-4 text-slate-600" aria-hidden>
                {op.type === "wrong" ? `→${op.expected}` : op.type === "correct" ? "" : s.mark}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-sm text-slate-700">{summarize(ops)}</p>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600" aria-label="Legend">
        {(["correct", "wrong", "extra", "missing"] as DiffType[]).map((t) => (
          <li key={t} className="flex items-center gap-1.5">
            <span className={`grid h-5 w-5 place-items-center rounded font-mono ring-1 ${STYLE[t].box}`}>a</span>
            <span aria-hidden>{STYLE[t].mark}</span> {t === "wrong" ? "wrong (→ should be)" : t === "extra" ? "extra — remove" : t === "missing" ? "missing — add" : "correct"}
          </li>
        ))}
      </ul>
    </div>
  );
}
