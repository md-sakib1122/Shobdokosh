import { useState } from "react";
import { parseMeaning } from "../lib/meaning";

/** First 5 comma-separated meanings, "(Adj.)"-style tags as chips, "more" toggle. */
export default function MeaningView({ bn, lemma }: { bn: string; lemma?: string | null }) {
  const [all, setAll] = useState(false);
  const items = parseMeaning(bn);
  const shown = all ? items : items.slice(0, 5);
  return (
    <div>
      {lemma && <p className="mb-1 text-xs text-text-secondary">meaning of <em className="font-medium">{lemma}</em></p>}
      <ul className="flex flex-wrap gap-x-1.5 gap-y-1" lang="bn">
        {shown.map((m, i) => (
          <li key={i} className="bn inline-flex items-center gap-1 rounded-sm bg-surface-hover px-2 py-0.5 text-base">
            {m.text}
            {m.tag && <span className="font-body text-xs text-text-secondary" lang="en">{m.tag}</span>}
          </li>
        ))}
      </ul>
      {items.length > 5 && (
        <button type="button" className="btn-link mt-1" onClick={() => setAll(!all)}>
          {all ? "less" : `more (${items.length - 5})`}
        </button>
      )}
    </div>
  );
}
