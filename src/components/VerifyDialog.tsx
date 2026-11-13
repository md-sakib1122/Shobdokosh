import { useEffect, useRef, useState } from "react";
import type { DiffOp } from "../lib/diff";
import type { Word } from "../lib/storage";
import GitDiff from "./GitDiff";
import MeaningView from "./MeaningView";
import SpeakButton from "./SpeakButton";

type Extra = "meaning" | "definition" | "sentence";

interface Props {
  word: Word;
  ok: boolean;
  ops: DiffOp[];
  onClose: () => void;
  /** shown when a Practice word reaches a streak of 3 */
  onMove?: () => void;
}

/** Result of a card's Verify: correct/wrong, GitHub-style diff, optional meaning/definition/sentence. */
export default function VerifyDialog({ word, ok, ops, onClose, onMove }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState<Extra | null>(null);
  const close = () => ref.current?.close();

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal?.();
  }, []);

  const extras: { id: Extra; label: string; available: boolean }[] = [
    { id: "meaning", label: "Bangla meaning", available: !!word.bnMeaning },
    { id: "definition", label: "Definition", available: !!word.definition },
    { id: "sentence", label: "Example sentence", available: !!word.sentence },
  ];
  const titleId = `verify-${word.id}`;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) close(); }}
      className="w-[calc(100%-2rem)] max-w-lg rounded-2xl p-0 shadow-2xl backdrop:bg-slate-900/50"
      aria-labelledby={titleId}
    >
      <div className={`h-1.5 ${ok ? "bg-emerald-500" : "bg-rose-500"}`} aria-hidden />
      <div className="max-h-[85vh] overflow-y-auto p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-xl font-bold ${ok ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`} aria-hidden>
            {ok ? "✓" : "✗"}
          </div>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className={`text-lg font-semibold ${ok ? "text-emerald-800" : "text-rose-800"}`}>
              {ok ? "Correct" : "Not quite"}
            </h2>
            <p className="text-sm text-slate-600">
              {ok ? "You spelled it right." : "Compare your spelling with the correct one."}
            </p>
          </div>
          <button className="btn-icon text-slate-500 hover:bg-slate-100" onClick={close} aria-label="Close">✕</button>
        </div>

        <div className="mb-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
          <div className="min-w-0 flex-1">
            <p className="break-words text-2xl font-bold tracking-wide text-slate-900">{word.word}</p>
            {word.bnPronunciation && <p className="bn text-lg text-teal-800" lang="bn">{word.bnPronunciation}</p>}
          </div>
          <SpeakButton word={word.word} audioUrl={word.audioUrl} />
        </div>

        {!ok && <GitDiff ops={ops} />}

        <section className="mt-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Learn more</h3>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Learn more">
            {extras.map((x) => (
              <button
                key={x.id} type="button" disabled={!x.available}
                className={`btn px-3 ${open === x.id ? "bg-teal-700 text-white hover:bg-teal-800" : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-100"}`}
                aria-expanded={open === x.id} aria-controls={`verify-${x.id}`}
                title={x.available ? undefined : "Not available for this word"}
                onClick={() => setOpen(open === x.id ? null : x.id)}
              >
                {x.label}
              </button>
            ))}
          </div>
          <div className="mt-3">
            {open === "meaning" && word.bnMeaning && (
              <div id="verify-meaning" className="rounded-xl border border-slate-200 p-3"><MeaningView bn={word.bnMeaning} lemma={word.meaningLemma} /></div>
            )}
            {open === "definition" && word.definition && (
              <p id="verify-definition" className="rounded-xl border border-slate-200 p-3">
                {word.partOfSpeech && <span className="chip mr-2">{word.partOfSpeech}</span>}
                {word.definition}
              </p>
            )}
            {open === "sentence" && word.sentence && (
              <p id="verify-sentence" className="rounded-xl border border-slate-200 p-3 italic">“{word.sentence}”</p>
            )}
          </div>
        </section>

        {onMove && (
          <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 p-3" role="status">
            <p className="flex-1 text-sm text-teal-900">🎉 Looks learned — move to All Words?</p>
            <button type="button" className="btn-primary" onClick={() => { onMove(); close(); }}>Move</button>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
          {ok ? (
            <button type="button" className="btn-primary" onClick={close} autoFocus>Done</button>
          ) : (
            <>
              <button type="button" className="btn-ghost" onClick={close}>Close</button>
              <button type="button" className="btn-primary" onClick={close} autoFocus>Try again</button>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}
