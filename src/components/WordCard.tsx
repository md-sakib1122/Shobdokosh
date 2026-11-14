import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { diffChars, isCorrect, type DiffOp } from "../lib/diff";
// import { parseMeaning } from "../lib/meaning";
import { recordAttempt, updateWord, type Category, type Word } from "../lib/storage";
import { useAccount, useDB } from "../state/DBContext";
import CategoryChip from "./CategoryChip";
import { IconInfo, IconMove, IconWarning } from "./Icons";
import SpeakButton from "./SpeakButton";
import VerifyDialog from "./VerifyDialog";

interface Props {
  word: Word;
  category?: Category;
  onMove: () => void;
  onDetails: () => void;
  footer?: ReactNode;
}

interface Result { ok: boolean; ops: DiffOp[]; learned: boolean }

/** First few meanings as one quiet line under the prompt. */
// const meaningLine = (bn: string | null) => (bn ? parseMeaning(bn).slice(0, 3).map((m) => m.text).join(", ") : "");

/**
 * Word card, prompt mode (DESIGN.md › Word card + orchestrator correction): the Bangla
 * pronunciation is the prompt, the meaning sits beneath, the English word stays hidden
 * until Verify. Type the English spelling and Verify.
 */
export default function WordCard({ word, category, onMove, onDetails, footer }: Props) {
  const { update } = useDB();
  const account = useAccount();
  const [input, setInput] = useState("");
  const [empty, setEmpty] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inPractice = word.status === "practice";
  const moveLabel = inPractice ? "Move to Words" : "Move to Practice";
  // const meaning = meaningLine(word.bnMeaning); // re-enable with the meaning line in the JSX below
  const fieldId = `spell-${word.id}`;

  const verify = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) {
      setEmpty(true);
      inputRef.current?.focus();
      return;
    }
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
    <article className="card word-card flex w-full min-w-0 flex-col gap-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 pt-2.5">
          {category && <CategoryChip category={category} />}
        </div>
        <div className="-mr-2 -mt-1 flex shrink-0 items-center">
          <SpeakButton word={word.word} audioUrl={word.audioUrl} />
          <button type="button" className="btn-icon" onClick={onMove} aria-label={moveLabel} title={moveLabel}>
            <IconMove />
          </button>
          <button type="button" className="btn-icon" onClick={onDetails} aria-label="Details" title="Details">
            <IconInfo />
          </button>
        </div>
      </div>

      <div className="-mt-1">
        <p className="bn break-words text-2xl font-medium text-text md:text-3xl" lang="bn">
          {word.bnPronunciation ?? <span className="font-body text-base font-normal text-text-secondary">No Bangla spelling yet</span>}
          {!word.pronReliable && (
            <span className="chip ml-2 align-middle font-body" title="Guessed spelling (not from the dictionary)" aria-label="uncertain spelling">?</span>
          )}
        </p>
        {/* {meaning && <p className="bn mt-1 text-lg text-text-secondary" lang="bn">{meaning}</p>} */}
      </div>

      <form className="flex flex-col gap-1.5" onSubmit={verify} noValidate>
        <label htmlFor={fieldId} className="sr-only">Spell the word</label>
        <div className="flex gap-2">
          <input
            id={fieldId} ref={inputRef} className="input" autoComplete="off" autoCapitalize="none"
            autoCorrect="off" spellCheck={false} placeholder="Type the English word" value={input}
            aria-invalid={empty || undefined} aria-describedby={empty ? `${fieldId}-err` : undefined}
            onChange={(e) => { setInput(e.target.value); setEmpty(false); }}
          />
          <button type="submit" className="btn-primary">Verify</button>
        </div>
        {empty && (
          <p id={`${fieldId}-err`} className="field-error"><IconWarning className="mt-0.5 h-4 w-4 shrink-0" />Type the word first, then Verify.</p>
        )}
      </form>

      {footer && <div className="divider mt-auto pt-3 text-sm text-text-secondary">{footer}</div>}

      {result && (
        <VerifyDialog
          word={word} ok={result.ok} ops={result.ops} onClose={closeResult}
          onMove={result.learned ? onMove : undefined}
        />
      )}
    </article>
  );
}
