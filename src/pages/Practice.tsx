import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import CategoryCombobox from "../components/CategoryCombobox";
import { IconCheck, IconClose, IconInfo } from "../components/Icons";
import { useToast } from "../components/Toast";
import WordCard from "../components/WordCard";
import WordDetails from "../components/WordDetails";
import { ALL_CATEGORIES, resolvePracticeCategory, setPrefs, updateWord, type Word } from "../lib/storage";
import { useAccount, useDB } from "../state/DBContext";
import { useCategories } from "../state/useCategories";

const words = (n: number) => `${n} ${n === 1 ? "word" : "words"}`;

export default function Practice() {
  const account = useAccount();
  const { update } = useDB();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const cats = useCategories();

  // A remembered category that no longer exists falls back to All (JOURNEY F5) with a one-time note.
  const selected = resolvePracticeCategory(account);
  const [staleNote, setStaleNote] = useState(() => account.prefs.practiceCategory !== selected);
  const stale = account.prefs.practiceCategory !== selected;
  useEffect(() => {
    if (stale) update((db) => setPrefs(db, account.email, { practiceCategory: selected }));
  }, [stale, selected, update, account.email]);
  const filterOn = selected !== ALL_CATEGORIES && cats.hasUser;
  const category = filterOn ? cats.byId.get(selected) : undefined;

  const practice = useMemo(() => account.words.filter((w) => w.status === "practice"), [account.words]);
  const shown = useMemo(
    () => (filterOn ? practice.filter((w) => w.categoryId === selected) : practice),
    [practice, filterOn, selected],
  );
  const openId = params.get("open");
  const openWord = openId ? account.words.find((w) => w.id === openId) : undefined;

  const choose = (id: string) => update((db) => setPrefs(db, account.email, { practiceCategory: id }));
  const clear = () => choose(ALL_CATEGORIES);

  const moveToWords = (w: Word) => {
    update((db) => updateWord(db, account.email, w.id, { status: "all" }));
    toast(`“${w.word}” moved to Words.`, "success");
  };

  const details = openWord && <WordDetails key={openWord.id} word={openWord} onClose={() => setParams({})} />;

  if (practice.length === 0) {
    return (
      <div className="page">
        <h1 className="page-title">Practice</h1>
        <section className="panel mt-6">
          <h2 className="text-lg font-medium">No words to practice</h2>
          <p className="mt-1 text-text-secondary">Add a word and it will appear here.</p>
          <Link to="/add" className="btn-primary mt-5">Add a word</Link>
        </section>
        {details}
      </div>
    );
  }

  const learnedInCategory = category ? cats.counts.get(category.id)?.learned ?? 0 : 0;

  return (
    <div className="page space-y-6">
      <h1 className="page-title flex items-center gap-3">
        Practice <span className="badge font-body">{practice.length}</span>
      </h1>

      {staleNote && (
        <p className="note-info max-w-[36rem]" role="status">
          <IconInfo className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">The category you picked no longer exists. Showing all words.</span>
          <button type="button" className="toast-close -my-3 -mr-3" aria-label="Dismiss" onClick={() => setStaleNote(false)}>
            <IconClose className="h-4 w-4" />
          </button>
        </p>
      )}

      {cats.hasUser && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <CategoryCombobox
            label="Category"
            className="w-full sm:w-80"
            categories={cats.categories}
            counts={cats.counts}
            value={filterOn ? selected : ALL_CATEGORIES}
            onChange={choose}
            includeAll
          />
          {category && (
            <div className="flex min-h-control items-center gap-1 sm:pb-0">
              <p className="text-sm text-text-secondary" role="status">
                {words(shown.length)} in <span className="font-medium text-text">{category.name}</span>
              </p>
              <button type="button" className="btn-ghost" onClick={clear}>Clear filter</button>
            </div>
          )}
        </div>
      )}

      {category && shown.length === 0 ? (
        learnedInCategory > 0 ? (
          <section className="panel-success">
            <h2 className="flex items-center gap-2 text-lg font-medium">
              <IconCheck className="h-5 w-5" />All words in {category.name} are learned
            </h2>
            <p className="mt-1">They're in Words if you want to look at them again.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to={`/words?category=${encodeURIComponent(category.id)}`} className="btn-primary">View in Words</Link>
              <button type="button" className="btn-ghost" onClick={clear}>Clear filter</button>
            </div>
          </section>
        ) : (
          <section className="panel">
            <h2 className="text-lg font-medium">{category.name} has no words yet</h2>
            <p className="mt-1 text-text-secondary">Add a word to start this list.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to={`/add?category=${encodeURIComponent(category.id)}`} className="btn-primary">Add a word to {category.name}</Link>
              <button type="button" className="btn-ghost" onClick={clear}>Clear filter</button>
            </div>
          </section>
        )
      ) : (
        <ul className="card-grid card-grid-3">
          {shown.map((w) => (
            <li key={w.id} className="flex">
              <WordCard
                word={w}
                category={cats.hasUser ? cats.of(w.categoryId) : undefined}
                onMove={() => moveToWords(w)}
                onDetails={() => setParams({ open: w.id })}
                footer={
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 tabular-nums">
                    <span>{w.stats.attempts} attempts · {w.stats.correct} correct · last {w.stats.lastPracticedAt ? new Date(w.stats.lastPracticedAt).toLocaleDateString() : "never"}</span>
                    {w.stats.streak >= 3 && <span className="chip-category">Looks learned</span>}
                  </p>
                }
              />
            </li>
          ))}
        </ul>
      )}
      {details}
    </div>
  );
}
