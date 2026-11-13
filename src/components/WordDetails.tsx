import { useEffect, useRef, useState, type FormEvent } from "react";
import { needsRetry, retryLookups } from "../lib/lookup";
import { removeWord, updateWord, type Word } from "../lib/storage";
import { useAccount, useDB } from "../state/DBContext";
import MeaningView from "./MeaningView";
import SpeakButton from "./SpeakButton";
import { useToast } from "./Toast";

interface Props { word: Word; onClose: () => void }

const orNull = (s: string) => (s.trim() ? s.trim() : null);

/** Modal with meaning, definition, sentence, edit, delete and "Retry lookup". */
export default function WordDetails({ word, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const { update } = useDB();
  const account = useAccount();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal?.();
  }, []);

  const save = (patch: Partial<Word>) => update((db) => updateWord(db, account.email, word.id, patch));

  const retry = async () => {
    setRetrying(true);
    const patch = await retryLookups(word);
    setRetrying(false);
    if (Object.keys(patch).length) save(patch);
    const merged = { ...word, ...patch };
    toast(needsRetry(merged) ? "Some lookups still failed — check your connection." : "Lookups updated.", needsRetry(merged) ? "error" : "success");
  };

  const onEdit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "");
    const pron = orNull(get("bnPronunciation"));
    save({
      bnPronunciation: pron,
      ...(pron !== word.bnPronunciation ? { pronSource: pron ? "user" : null, pronReliable: true } : {}),
      bnMeaning: orNull(get("bnMeaning")),
      ...(orNull(get("bnMeaning")) !== word.bnMeaning ? { meaningLemma: null } : {}),
      definition: orNull(get("definition")),
      partOfSpeech: orNull(get("partOfSpeech")),
      sentence: orNull(get("sentence")),
    });
    setEditing(false);
    toast("Saved.", "success");
  };

  const del = () => {
    update((db) => removeWord(db, account.email, word.id));
    toast(`Deleted “${word.word}”.`);
    onClose();
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}
      className="w-[calc(100%-2rem)] max-w-lg rounded-2xl p-0 shadow-2xl backdrop:bg-slate-900/50"
      aria-labelledby={`details-${word.id}`}
    >
      <div className="max-h-[85vh] overflow-y-auto p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 id={`details-${word.id}`} className="break-words text-2xl font-bold">{word.word}</h2>
            <p className="bn text-xl text-teal-800" lang="bn">
              {word.bnPronunciation ?? <span className="font-sans text-base text-slate-400">no Bangla spelling</span>}
              {!word.pronReliable && <span className="ml-2 chip font-sans" title="Guessed spelling (not from the dictionary)">?</span>}
            </p>
          </div>
          <SpeakButton word={word.word} audioUrl={word.audioUrl} />
          <button className="btn-icon text-slate-500 hover:bg-slate-100" onClick={() => ref.current?.close()} aria-label="Close">✕</button>
        </div>

        {!editing ? (
          <div className="space-y-4">
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Bangla meaning</h3>
              {word.bnMeaning ? <MeaningView bn={word.bnMeaning} lemma={word.meaningLemma} /> : <p className="text-sm text-slate-400">Not found</p>}
            </section>
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Definition {word.partOfSpeech && <span className="chip ml-1 normal-case">{word.partOfSpeech}</span>}
              </h3>
              {word.definition ? <p>{word.definition}</p> : (
                <p className="text-sm text-slate-400">{word.definitionStatus === "notfound" ? "No definition found" : "Not loaded"}</p>
              )}
            </section>
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Sentence</h3>
              {word.sentence ? <p className="italic">“{word.sentence}”</p> : <p className="text-sm text-slate-400">None</p>}
            </section>
            <section className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center text-sm">
              <div><div className="text-lg font-semibold tabular-nums">{word.stats.attempts}</div>attempts</div>
              <div><div className="text-lg font-semibold tabular-nums">{word.stats.correct}</div>correct</div>
              <div><div className="text-lg font-semibold tabular-nums">{word.stats.streak}</div>streak</div>
              <p className="col-span-3 text-xs text-slate-500">
                Last practised: {word.stats.lastPracticedAt ? new Date(word.stats.lastPracticedAt).toLocaleString() : "never"}
              </p>
            </section>
            <div className="flex flex-wrap gap-2">
              {needsRetry(word) && (
                <button className="btn-primary" onClick={retry} disabled={retrying}>{retrying ? "Retrying…" : "Retry lookup"}</button>
              )}
              <button className="btn-secondary" onClick={() => setEditing(true)}>Edit</button>
              {!confirmDelete ? (
                <button className="btn-ghost text-rose-700" onClick={() => setConfirmDelete(true)}>Delete</button>
              ) : (
                <span className="flex items-center gap-2">
                  <button className="btn-danger" onClick={del}>Delete “{word.word}”</button>
                  <button className="btn-ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
                </span>
              )}
            </div>
          </div>
        ) : (
          <form className="space-y-3" onSubmit={onEdit}>
            <div>
              <label className="label" htmlFor="e-pron">Bangla pronunciation</label>
              <input id="e-pron" name="bnPronunciation" className="input bn text-lg" lang="bn" defaultValue={word.bnPronunciation ?? ""} />
            </div>
            <div>
              <label className="label" htmlFor="e-mean">Bangla meaning</label>
              <textarea id="e-mean" name="bnMeaning" className="input bn" lang="bn" rows={2} defaultValue={word.bnMeaning ?? ""} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="label" htmlFor="e-def">Definition</label>
                <textarea id="e-def" name="definition" className="input" rows={2} defaultValue={word.definition ?? ""} />
              </div>
              <div>
                <label className="label" htmlFor="e-pos">Part of speech</label>
                <input id="e-pos" name="partOfSpeech" className="input" defaultValue={word.partOfSpeech ?? ""} />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="e-sent">Example sentence</label>
              <textarea id="e-sent" name="sentence" className="input" rows={2} defaultValue={word.sentence ?? ""} />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">Save</button>
              <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}
