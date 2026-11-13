import { useState } from "react";
import { parseMeaning } from "../lib/meaning";

/** First 5 comma-separated meanings, "(Adj.)"-style tags as chips, "more" toggle. */
export default function MeaningView({ bn, lemma }: { bn: string; lemma?: string | null }) {
  const [all, setAll] = useState(false);
  const items = parseMeaning(bn);
  const shown = all ? items : items.slice(0, 5);
  return (
    <div>
      {lemma && <p className="mb-1 text-xs text-slate-500">meaning of <em className="font-medium">{lemma}</em></p>}
      <ul className="flex flex-wrap gap-1.5" lang="bn">
        {shown.map((m, i) => (
          <li key={i} className="bn inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-base ring-1 ring-slate-200">
            {m.text}
            {m.tag && <span className="chip font-sans" lang="en">{m.tag}</span>}
          </li>
        ))}
      </ul>
      {items.length > 5 && (
        <button type="button" className="mt-1 min-h-[44px] text-sm font-medium text-teal-700 underline-offset-2 hover:underline" onClick={() => setAll(!all)}>
          {all ? "less" : `more (${items.length - 5})`}
        </button>
      )}
    </div>
  );
}
