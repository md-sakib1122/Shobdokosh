import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { needsRetry, retryLookups } from "../lib/lookup";
import { removeWord, updateWord, type Word } from "../lib/storage";
import { useCategories } from "../state/useCategories";
import CategoryChip from "./CategoryChip";
import CategoryCombobox from "./CategoryCombobox";
import ConfirmDialog from "./ConfirmDialog";
import { IconClose } from "./Icons";
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
  const [changing, setChanging] = useState(false);
  const cats = useCategories();
  const category = cats.of(word.categoryId);

  const changeCategory = (id: string) => {
    setChanging(false);
    if (id === word.categoryId) return;
    update((db) => updateWord(db, account.email, word.id, { categoryId: id }));
    toast(`Moved to ${cats.of(id).name}.`, "success");
  };

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
      className="dialog max-w-[36rem]"
      aria-labelledby={`details-${word.id}`}
    >
      <div className="max-h-[85vh] overflow-y-auto p-6">
        <div className="mb-5 flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h2 id={`details-${word.id}`} className="display break-words text-2xl font-medium md:text-3xl">{word.word}</h2>
            <p className="bn mt-1 text-lg text-text-secondary" lang="bn">
              {word.bnPronunciation ?? <span className="font-body text-base">No Bangla spelling</span>}
              {!word.pronReliable && <span className="chip ml-2 font-body" title="Guessed spelling (not from the dictionary)">?</span>}
            </p>
          </div>
          <SpeakButton word={word.word} audioUrl={word.audioUrl} />
          <button className="btn-icon -mr-2" onClick={() => ref.current?.close()} aria-label="Close"><IconClose /></button>
        </div>

        <section className="mb-5" aria-labelledby={`cat-${word.id}`}>
          <h3 id={`cat-${word.id}`} className="section-title mb-1.5">Category</h3>
          {changing ? (
            <CategoryCombobox
              label="Category"
              hideLabel
              categories={cats.categories}
              counts={cats.counts}
              value={word.categoryId}
              onChange={changeCategory}
              emptyHint={<>Create categories in the Categories tab. <Link className="font-semibold text-accent-text underline underline-offset-4" to="/categories">Go to Categories</Link></>}
            />
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <CategoryChip category={category} wrap />
              <button type="button" className="btn-ghost" onClick={() => setChanging(true)}>Change</button>
            </div>
          )}
        </section>

        {!editing ? (
          <div className="space-y-4">
            <section>
              <h3 className="section-title mb-1.5">Bangla meaning</h3>
              {word.bnMeaning ? <MeaningView bn={word.bnMeaning} lemma={word.meaningLemma} /> : <p className="text-sm text-text-secondary">Not found</p>}
            </section>
            <section>
              <h3 className="section-title mb-1.5">
                Definition {word.partOfSpeech && <span className="chip ml-1">{word.partOfSpeech}</span>}
              </h3>
              {word.definition ? <p>{word.definition}</p> : (
                <p className="text-sm text-text-secondary">{word.definitionStatus === "notfound" ? "No definition found" : "Not loaded"}</p>
              )}
            </section>
            <section>
              <h3 className="section-title mb-1.5">Example sentence</h3>
              {word.sentence ? <p className="display text-lg">“{word.sentence}”</p> : <p className="text-sm text-text-secondary">None</p>}
            </section>
            <section className="divider grid grid-cols-3 gap-2 pt-4 text-sm text-text-secondary">
              <div><div className="text-lg font-semibold tabular-nums text-text">{word.stats.attempts}</div>attempts</div>
              <div><div className="text-lg font-semibold tabular-nums text-text">{word.stats.correct}</div>correct</div>
              <div><div className="text-lg font-semibold tabular-nums text-text">{word.stats.streak}</div>streak</div>
              <p className="col-span-3 text-xs">
                Last practised: {word.stats.lastPracticedAt ? new Date(word.stats.lastPracticedAt).toLocaleString() : "never"}
              </p>
            </section>
            <div className="flex flex-wrap gap-2">
              {needsRetry(word) && (
                <button className="btn-primary" onClick={retry} disabled={retrying}>{retrying ? "Retrying…" : "Retry lookup"}</button>
              )}
              <button className="btn-secondary" onClick={() => setEditing(true)}>Edit</button>
              <button className="btn-ghost text-error-11 hover:bg-error-3" onClick={() => setConfirmDelete(true)}>Delete word</button>
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
      {confirmDelete && (
        <ConfirmDialog
          title={`Delete “${word.word}”?`}
          confirmLabel="Delete word"
          onConfirm={del}
          onCancel={() => setConfirmDelete(false)}
        >
          <p>This can't be undone.</p>
        </ConfirmDialog>
      )}
    </dialog>
  );
}
