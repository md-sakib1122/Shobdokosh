import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import CategoryCombobox from "../components/CategoryCombobox";
import { IconChevronDown, IconSearch } from "../components/Icons";
import { useToast } from "../components/Toast";
import WordCard from "../components/WordCard";
import WordDetails from "../components/WordDetails";
import { ALL_CATEGORIES, setPrefs, updateWord, type Word } from "../lib/storage";
import { useAccount, useDB } from "../state/DBContext";
import { useCategories } from "../state/useCategories";

type Sort = "newest" | "az";

const words = (n: number) => `${n} ${n === 1 ? "word" : "words"}`;

export default function Words() {
  const account = useAccount();
  const { update } = useDB();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const cats = useCategories();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  // The Words filter is not remembered; ?category= seeds it (unknown ids are ignored).
  const [catState, setCategory] = useState(() => params.get("category") ?? ALL_CATEGORIES);
  const category = catState !== ALL_CATEGORIES && cats.hasUser ? cats.byId.get(catState) : undefined;

  const learned = useMemo(() => account.words.filter((w) => w.status === "all"), [account.words]);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const hit = (w: Word) => (!category || w.categoryId === category.id) &&
      (!needle || [w.word, w.bnPronunciation, w.bnMeaning].some((f) => f?.toLowerCase().includes(needle)));
    const list = learned.filter(hit);
    return sort === "az"
      ? [...list].sort((a, b) => a.word.localeCompare(b.word, "en", { sensitivity: "base" }))
      : [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [learned, q, sort, category]);

  const openId = params.get("open");
  const openWord = openId ? account.words.find((w) => w.id === openId) : undefined;
  const closeDetails = () => {
    const next = new URLSearchParams(params);
    next.delete("open");
    setParams(next);
  };

  const toPractice = (w: Word) => {
    update((db) => updateWord(db, account.email, w.id, { status: "practice", stats: { ...w.stats, streak: 0 } }));
    toast(`“${w.word}” moved to Practice.`, "success");
  };

  const active = !!q.trim() || !!category;
  const clearAll = () => { setQ(""); setCategory(ALL_CATEGORIES); };
  const stillInPractice = category ? cats.counts.get(category.id)?.practice ?? 0 : 0;
  const details = openWord && <WordDetails key={openWord.id} word={openWord} onClose={closeDetails} />;

  if (learned.length === 0) {
    return (
      <div className="page">
        <h1 className="page-title">Words</h1>
        <section className="panel mt-6">
          <h2 className="text-lg font-medium">No learned words yet</h2>
          <p className="mt-1 text-text-secondary">Words you finish in Practice are kept here.</p>
          <Link to="/practice" className="btn-primary mt-5">Go to Practice</Link>
        </section>
        {details}
      </div>
    );
  }

  const query = q.trim();
  return (
    <div className="page space-y-6">
      <h1 className="page-title flex items-center gap-3">Words <span className="badge font-body">{learned.length}</span></h1>

      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex-1">
          <label htmlFor="search" className="label">Search words</label>
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary" />
            <input id="search" type="search" className="input pl-10" placeholder="English or Bangla" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        {cats.hasUser && (
          <CategoryCombobox
            label="Category"
            className="md:w-72"
            categories={cats.categories}
            counts={cats.counts}
            value={category ? category.id : ALL_CATEGORIES}
            onChange={setCategory}
            includeAll
          />
        )}
        <div className="md:w-44">
          <label htmlFor="sort" className="label">Sort</label>
          <div className="relative">
            <select id="sort" className="input" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="newest">Newest first</option>
              <option value="az">A to Z</option>
            </select>
            <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          </div>
        </div>
      </div>

      <div className="flex min-h-control flex-wrap items-center gap-2">
        <p className="text-sm text-text-secondary" role="status">{shown.length} of {words(learned.length)} shown</p>
        {active && <button type="button" className="btn-ghost" onClick={clearAll}>Clear filters</button>}
      </div>

      {shown.length === 0 ? (
        <section className="panel">
          <h2 className="text-lg font-medium">No words match</h2>
          <p className="mt-1 text-text-secondary">
            {query && category ? <>Nothing matches “{query}” in {category.name}.</>
              : query ? <>Nothing matches “{query}”.</>
              : <>No learned words in {category?.name} yet.</>}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button type="button" className="btn-secondary" onClick={clearAll}>Clear filters</button>
            {category && !query && stillInPractice > 0 && (
              <Link
                to="/practice"
                className="btn-link"
                onClick={() => update((db) => setPrefs(db, account.email, { practiceCategory: category.id }))}
              >
                {words(stillInPractice)} in {category.name} {stillInPractice === 1 ? "is" : "are"} still in Practice
              </Link>
            )}
          </div>
        </section>
      ) : (
        <div className="card-grid card-grid-3">
          {shown.map((w) => (
            <WordCard
              key={w.id}
              word={w}
              category={cats.hasUser ? cats.of(w.categoryId) : undefined}
              onMove={() => toPractice(w)}
              onDetails={() => { const n = new URLSearchParams(params); n.set("open", w.id); setParams(n); }}
            />
          ))}
        </div>
      )}
      {details}
    </div>
  );
}
