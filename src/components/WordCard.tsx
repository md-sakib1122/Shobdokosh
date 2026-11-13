import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { diffChars, isCorrect, type DiffOp } from "../lib/diff";
import { recordAttempt, updateWord, type Word } from "../lib/storage";
import { useAccount, useDB } from "../state/DBContext";
import SpeakButton from "./SpeakButton";
import VerifyDialog from "./VerifyDialog";

interface Props {
  word: Word;
  onMove: () => void;
  onDetails: () => void;
  footer?: ReactNode;
}

interface Result { ok: boolean; ops: DiffOp[]; learned: boolean }

/** Word card: Bangla spelling as the prompt, type the English spelling and Verify. */
export default function WordCard({ word, onMove, onDetails, footer }: Props) {
  const { update } = useDB();
  const account = useAccount();
  const [input, setInput] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inPractice = word.status === "practice";
  const moveLabel = inPractice ? "Move to All Words" : "Move to Practice";

  const verify = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const ok = isCorrect(input, word.word);
    const stats = recordAttempt(word.stats, ok);
    update((db) => updateWord(db, account.email, word.id, { stats }));
    setResult({ ok, ops: ok ? [] : diffChars(input, word.word), learned: ok && inPractice && stats.streak >= 3 });
  };

  const closeResult = () => {
    setResult(null);
    setInput("");
    inputRef.current?.focus();
  };

  return (
    <article className="card flex w-full flex-col gap-4 p-5 transition hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="bn break-words text-3xl font-semibold leading-snug text-slate-900" lang="bn">
            {word.bnPronunciation ?? <span className="font-sans text-base font-normal text-slate-400">no Bangla spelling yet</span>}
            {!word.pronReliable && (
              <span className="chip ml-2 align-middle font-sans" title="Guessed spelling (not from the dictionary)" aria-label="uncertain spelling">?</span>
            )}
          </p>
          <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
            <span className={`chip ${inPractice ? "bg-amber-50 text-amber-800" : "bg-teal-50 text-teal-800"}`}>
              {inPractice ? "In practice" : "Learned"}
            </span>
            {word.stats.attempts > 0 && <span className="tabular-nums">streak {word.stats.streak}</span>}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <SpeakButton word={word.word} audioUrl={word.audioUrl} />
          <button
            type="button"
            className="btn-icon rounded-full border border-slate-200 bg-white text-lg text-slate-700 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
            onClick={onMove} aria-label={moveLabel} title={moveLabel}
          >
            <span aria-hidden>⇄</span>
          </button>
          <button
            type="button"
            className="btn-icon rounded-full border border-slate-200 bg-white text-lg text-slate-700 hover:bg-slate-100"
            onClick={onDetails} aria-label="Details" title="Details"
          >
            <span aria-hidden>ⓘ</span>
          </button>
        </div>
      </div>

      <form className="flex gap-2" onSubmit={verify}>
        <label htmlFor={`spell-${word.id}`} className="sr-only">Type the English spelling</label>
        <input
          id={`spell-${word.id}`} ref={inputRef} className="input" autoComplete="off" autoCapitalize="none"
          autoCorrect="off" spellCheck={false} placeholder="Type the English spelling" value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={!input.trim()}>Verify</button>
      </form>

      {footer && <div className="mt-auto border-t border-slate-100 pt-3">{footer}</div>}

      {result && (
        <VerifyDialog
          word={word} ok={result.ok} ops={result.ops} onClose={closeResult}
          onMove={result.learned ? onMove : undefined}
        />
      )}
    </article>
  );
}
