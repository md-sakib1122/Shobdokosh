import type { ReactNode } from "react";
import type { DiffOp } from "../lib/diff";
import { summarize } from "./DiffView";

// GitHub-style unified diff: a red "−" line with what was typed above a green "+"
// line with the correct spelling. Changed letters get a stronger highlight plus an
// aria-label, so the diff reads without colour too.

const show = (c: string) => (c === " " ? "␣" : c);

function Line({ sign, children, tone }: { sign: string; children: ReactNode; tone: "del" | "add" }) {
  const row = tone === "del" ? "bg-rose-50 text-rose-950" : "bg-emerald-50 text-emerald-950";
  const gutter = tone === "del" ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-700";
  return (
    <div className={`flex ${row}`}>
      <span className={`w-9 shrink-0 select-none py-2 text-center font-semibold ${gutter}`} aria-hidden>{sign}</span>
      <span className="min-w-0 break-all px-3 py-2">{children}</span>
    </div>
  );
}

export default function GitDiff({ ops }: { ops: DiffOp[] }) {
  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-slate-200 font-mono text-xl leading-relaxed" aria-label="Spelling diff" role="group">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-1.5 font-sans text-xs text-slate-500">
          <span>your answer → correct spelling</span>
          <span aria-hidden><span className="text-rose-600">−</span> / <span className="text-emerald-700">+</span></span>
        </div>
        <Line sign="−" tone="del">
          <span className="sr-only">Your answer: </span>
          {ops.filter((o) => o.type !== "missing").map((o, i) =>
            o.type === "correct" ? <span key={i}>{show(o.char)}</span> : (
              <mark
                key={i}
                className="rounded-sm bg-rose-300/70 text-rose-950"
                aria-label={o.type === "wrong" ? `${o.char} should be ${o.expected}` : `extra ${o.char}`}
              >
                {show(o.char)}
              </mark>
            ))}
        </Line>
        <Line sign="+" tone="add">
          <span className="sr-only">Correct: </span>
          {ops.filter((o) => o.type !== "extra").map((o, i) => {
            const c = o.type === "wrong" ? o.expected! : o.char;
            return o.type === "correct" ? <span key={i}>{show(c)}</span> : (
              <mark
                key={i}
                className="rounded-sm bg-emerald-300/70 text-emerald-950"
                aria-label={o.type === "missing" ? `missing ${c}` : `${c} instead of ${o.char}`}
              >
                {show(c)}
              </mark>
            );
          })}
        </Line>
      </div>
      <p className="mt-2 text-sm text-slate-600">{summarize(ops)}</p>
    </div>
  );
}
