import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useToast } from "../components/Toast";
import WordCard from "../components/WordCard";
import WordDetails from "../components/WordDetails";
import { updateWord, type Word } from "../lib/storage";
import { useAccount, useDB } from "../state/DBContext";

type Sort = "newest" | "az";

export default function AllWords() {
  const account = useAccount();
  const { update } = useDB();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("newest");

  const all = useMemo(() => account.words.filter((w) => w.status === "all"), [account.words]);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const hit = (w: Word) => !needle || [w.word, w.bnPronunciation, w.bnMeaning]
      .some((f) => f?.toLowerCase().includes(needle));
    const list = all.filter(hit);
    return sort === "az"
      ? [...list].sort((a, b) => a.word.localeCompare(b.word, "en", { sensitivity: "base" }))
      : [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [all, q, sort]);

  const openId = params.get("open");
  const openWord = openId ? account.words.find((w) => w.id === openId) : undefined;

  const toPractice = (w: Word) => {
    update((db) => updateWord(db, account.email, w.id, { status: "practice", stats: { ...w.stats, streak: 0 } }));
    toast(`Moved to Practice.`, "success");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold">All Words <span className="chip align-middle text-sm">{all.length}</span></h1>
      </div>

      {all.length === 0 ? (
        <div className="card mx-auto max-w-md p-8 text-center">
          <p className="mb-1 text-4xl" aria-hidden>📚</p>
          <h2 className="text-xl font-semibold">No learned words yet</h2>
          <p className="mt-1 text-slate-600">Words you move from Practice show up here.</p>
          <Link to="/practice" className="btn-primary mt-5">Go to Practice</Link>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex-1">
              <label htmlFor="search" className="sr-only">Search English or Bangla</label>
              <input id="search" type="search" className="input" placeholder="Search English or বাংলা…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div>
              <label htmlFor="sort" className="sr-only">Sort</label>
              <select id="sort" className="input sm:w-40" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                <option value="newest">Newest first</option>
                <option value="az">A–Z</option>
              </select>
            </div>
          </div>
          <p className="text-sm text-slate-500" aria-live="polite">{shown.length} of {all.length} shown</p>
          {shown.length === 0 ? (
            <p className="card p-6 text-center text-slate-600">No words match “{q}”.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((w) => (
                <WordCard key={w.id} word={w} onMove={() => toPractice(w)} onDetails={() => setParams({ open: w.id })} />
              ))}
            </div>
          )}
        </>
      )}
      {openWord && <WordDetails key={openWord.id} word={openWord} onClose={() => setParams({})} />}
    </div>
  );
}
