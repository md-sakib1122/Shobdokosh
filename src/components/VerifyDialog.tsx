import { useEffect, useRef, useState } from "react";
import type { DiffOp } from "../lib/diff";
import type { Word } from "../lib/storage";
import GitDiff from "./GitDiff";
import MeaningView from "./MeaningView";
import SpeakButton from "./SpeakButton";
import { IconAlert, IconCheck, IconClose } from "./Icons";

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
      className="dialog max-w-[32rem]"
      aria-labelledby={titleId}
    >
      <div className="max-h-[85vh] overflow-y-auto p-6">
        <div className="mb-5 flex items-start gap-3">
          <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${ok ? "bg-success-3 text-success-11" : "bg-error-3 text-error-11"}`} aria-hidden>
            {ok ? <IconCheck /> : <IconAlert />}
          </div>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-xl font-medium">
              {ok ? "Correct" : "Not quite"}
            </h2>
            <p className="text-sm text-text-secondary">
              {ok ? "You spelled it right." : "Compare your spelling with the correct one."}
            </p>
          </div>
          <button className="btn-icon -mr-2" onClick={close} aria-label="Close"><IconClose /></button>
        </div>

        <div className="mb-5 flex items-center gap-3 border-l border-rule pl-5">
          <div className="min-w-0 flex-1">
            <p className="display break-words text-3xl font-medium text-text">{word.word}</p>
            {word.bnPronunciation && <p className="bn text-lg text-text-secondary" lang="bn">{word.bnPronunciation}</p>}
          </div>
          <SpeakButton word={word.word} audioUrl={word.audioUrl} />
        </div>

        {!ok && <GitDiff ops={ops} />}

        <section className="mt-5">
          <h3 className="section-title mb-2">Learn more</h3>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Learn more">
            {extras.map((x) => (
              <button
                key={x.id} type="button" disabled={!x.available}
                className={open === x.id ? "btn-secondary border-accent-solid bg-accent-bg-subtle text-accent-text hover:bg-accent-bg-subtle" : "btn-secondary"}
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
              <div id="verify-meaning" className="divider pt-3"><MeaningView bn={word.bnMeaning} lemma={word.meaningLemma} /></div>
            )}
            {open === "definition" && word.definition && (
              <p id="verify-definition" className="divider pt-3">
                {word.partOfSpeech && <span className="chip mr-2">{word.partOfSpeech}</span>}
                {word.definition}
              </p>
            )}
            {open === "sentence" && word.sentence && (
              <p id="verify-sentence" className="divider display pt-3 text-lg">“{word.sentence}”</p>
            )}
          </div>
        </section>

        {onMove && (
          <div className="note-success mt-5 items-center" role="status">
            <IconCheck className="h-4 w-4 shrink-0" />
            <p className="flex-1">Looks learned – move to Words?</p>
            <button type="button" className="btn-primary" onClick={() => { onMove(); close(); }}>Move</button>
          </div>
        )}

        <div className="divider mt-6 flex justify-end gap-2 pt-4">
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
