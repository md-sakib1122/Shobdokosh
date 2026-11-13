import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useToast } from "../components/Toast";
import WordCard from "../components/WordCard";
import WordDetails from "../components/WordDetails";
import { updateWord, type Word } from "../lib/storage";
import { useAccount, useDB } from "../state/DBContext";

export default function Practice() {
  const account = useAccount();
  const { update } = useDB();
  const toast = useToast();
  const [params, setParams] = useSearchParams();

  const words = useMemo(() => account.words.filter((w) => w.status === "practice"), [account.words]);
  const openId = params.get("open");
  const openWord = openId ? account.words.find((w) => w.id === openId) : undefined;

  const moveToAll = (w: Word) => {
    update((db) => updateWord(db, account.email, w.id, { status: "all" }));
    toast(`“${w.word}” moved to All Words.`, "success");
  };

  if (words.length === 0) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <p className="mb-1 text-4xl" aria-hidden>📝</p>
        <h1 className="text-xl font-semibold">No words in practice</h1>
        <p className="mt-1 text-slate-600">Add a word to start practising its spelling.</p>
        <Link to="/add" className="btn-primary mt-5">Add a word</Link>
        {openWord && <WordDetails word={openWord} onClose={() => setParams({})} />}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">
        Practice <span className="chip align-middle text-sm">{words.length}</span>
      </h1>

      <ul className="grid gap-3 sm:grid-cols-2">
        {words.map((w) => (
          <li key={w.id} className="flex">
            <WordCard
              word={w}
              onMove={() => moveToAll(w)}
              onDetails={() => setParams({ open: w.id })}
              footer={
                <p className="text-xs text-slate-500">
                  {w.stats.attempts} attempts · {w.stats.correct} correct · last{" "}
                  {w.stats.lastPracticedAt ? new Date(w.stats.lastPracticedAt).toLocaleDateString() : "never"}
                  {w.stats.streak >= 3 && <span className="chip ml-2 bg-teal-100 text-teal-800">looks learned</span>}
                </p>
              }
            />
          </li>
        ))}
      </ul>
      {openWord && <WordDetails key={openWord.id} word={openWord} onClose={() => setParams({})} />}
    </div>
  );
}
