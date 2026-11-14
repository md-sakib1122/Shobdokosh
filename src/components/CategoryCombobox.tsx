import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  ALL_CATEGORIES, categoryKey, categoryNameError, cleanCategoryName, type Category, type CategoryCount,
} from "../lib/storage";
import { IconCheck, IconChevronDown, IconPlus, IconWarning } from "./Icons";

/** How many matches the listbox renders at once; more are reached by typing. */
export const RESULT_CAP = 50;

type Option =
  | { kind: "all"; id: string }
  | { kind: "category"; id: string; category: Category }
  | { kind: "create"; id: string; name: string };

interface Props {
  /** Visible label text. */
  label: string;
  /** Hide the label visually (it is still announced). */
  hideLabel?: boolean;
  /** Categories in display order (Uncategorized first, then A–Z). */
  categories: Category[];
  counts?: Map<string, CategoryCount>;
  /** Selected category id, or ALL_CATEGORIES when `includeAll`. */
  value: string;
  onChange: (id: string) => void;
  /** filter mode: first option is "All categories". */
  includeAll?: boolean;
  /** create mode: offer "+ Create '…'" when the query has no exact match. Returns an error message on failure. */
  onCreate?: (name: string) => string | null;
  /** Shown first when the query is empty (e.g. the last category used). */
  pinnedId?: string;
  /** Extra hint row when the list is short (e.g. a link to the Categories tab). */
  emptyHint?: ReactNode;
  className?: string;
}

const ALL_LABEL = "All categories";

/**
 * Searchable single-select for categories (ARIA 1.2 editable combobox + listbox).
 * Typing filters; ↑/↓ move; Enter picks; Esc closes and restores the selection.
 * The value is never empty: leaving the field with half-typed text reverts it.
 */
export default function CategoryCombobox({
  label, hideLabel, categories, counts, value, onChange, includeAll, onCreate, pinnedId, emptyHint, className = "",
}: Props) {
  const uid = useId();
  const inputId = `${uid}-input`;
  const listId = `${uid}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<string | null>(null); // null = not typing; show the selection
  const [active, setActive] = useState(0);

  const selected = categories.find((c) => c.id === value);
  const selectedLabel = value === ALL_CATEGORIES && includeAll ? ALL_LABEL : selected?.name ?? "";

  const { options, total, createError, exact } = useMemo(() => {
    const q = (query ?? "").trim().toLowerCase();
    let matches = q ? categories.filter((c) => c.name.toLowerCase().includes(q)) : categories;
    if (q) {
      // names that start with the query rank first
      matches = [...matches].sort((a, b) => Number(!a.name.toLowerCase().startsWith(q)) - Number(!b.name.toLowerCase().startsWith(q)));
    } else if (pinnedId) {
      const pinned = matches.find((c) => c.id === pinnedId);
      if (pinned) matches = [pinned, ...matches.filter((c) => c !== pinned)];
    }
    const opts: Option[] = [];
    if (includeAll && (!q || ALL_LABEL.toLowerCase().includes(q))) opts.push({ kind: "all", id: ALL_CATEGORIES });
    for (const c of matches.slice(0, RESULT_CAP)) opts.push({ kind: "category", id: c.id, category: c });
    let err: string | null = null;
    const name = cleanCategoryName(query ?? "");
    const exactMatch = q ? categories.find((c) => categoryKey(c.name) === categoryKey(name)) : undefined;
    if (onCreate && q && !exactMatch) {
      err = categoryNameError(name, categories);
      if (!err) opts.push({ kind: "create", id: "__create__", name });
    }
    return { options: opts, total: matches.length, createError: err, exact: exactMatch };
  }, [categories, query, includeAll, onCreate, pinnedId]);

  const optionId = (i: number) => `${uid}-opt-${i}`;

  const openList = () => {
    if (open) return;
    setOpen(true);
    const idx = options.findIndex((o) => o.id === value);
    setActive(idx >= 0 ? idx : 0);
  };

  const close = () => {
    setOpen(false);
    setQuery(null);
  };

  const choose = (o: Option) => {
    if (o.kind === "create") {
      const err = onCreate?.(o.name);
      if (err) return; // stays open; the reason row explains
    } else {
      onChange(o.id);
    }
    close();
  };

  const move = (delta: number) => {
    if (!open) { openList(); return; }
    if (!options.length) return;
    const next = (active + delta + options.length) % options.length;
    setActive(next);
    listRef.current?.querySelector(`#${CSS.escape(optionId(next))}`)?.scrollIntoView({ block: "nearest" });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (e.altKey) openList(); else move(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        if (e.altKey) setOpen(false); else move(-1);
        break;
      case "Enter":
        if (open) {
          e.preventDefault();
          const o = options[active];
          if (o) choose(o);
        }
        break;
      case "Escape":
        // first press closes the list, second restores the committed value
        if (open) { e.preventDefault(); e.stopPropagation(); setOpen(false); }
        else if (query !== null) { e.preventDefault(); e.stopPropagation(); setQuery(null); }
        break;
      case "Tab":
        close();
        break;
    }
  };

  // Open upward when the space below the field (minus the phone tab bar) can't hold the list.
  const [dropUp, setDropUp] = useState(false);
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!open || !el) return;
    const r = el.getBoundingClientRect();
    const viewH = window.visualViewport?.height ?? window.innerHeight;
    const bottomBar = window.innerWidth < 768 ? 64 : 8;
    const below = viewH - bottomBar - r.bottom;
    const above = r.top - 72; // sticky header
    const needed = Math.min(288, 44 * Math.max(1, options.length) + 52);
    setDropUp(below < needed && above > below);
  }, [open, options.length]);

  // Typing highlights the exact match, else the first category, else the create row.
  useEffect(() => {
    if (query === null) return;
    const exactIdx = exact ? options.findIndex((o) => o.id === exact.id) : -1;
    const firstCat = options.findIndex((o) => o.kind === "category");
    setActive(exactIdx >= 0 ? exactIdx : firstCat >= 0 ? firstCat : 0);
  }, [query, exact, options]);

  // Polite result announcement, 300ms after typing settles.
  const [status, setStatus] = useState("");
  const shownCount = options.filter((o) => o.kind === "category").length;
  const noMatch = !!query?.trim() && shownCount === 0;
  const message = !open ? ""
    : exact && onCreate ? `${shownCount} ${shownCount === 1 ? "category" : "categories"}. “${exact.name}” already exists. Press Enter to use it.`
    : createError && query?.trim() ? createError
    : noMatch ? `No categories match “${query!.trim()}”.`
    : total > RESULT_CAP ? `${RESULT_CAP} of ${total} categories shown.`
    : `${shownCount} ${shownCount === 1 ? "category" : "categories"}.`;
  useEffect(() => {
    const t = setTimeout(() => setStatus(message), 300);
    return () => clearTimeout(t);
  }, [message]);

  return (
    <div className={`relative ${className}`}>
      <label htmlFor={inputId} className={hideLabel ? "sr-only" : "label"}>{label}</label>
      <div className="relative">
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          role="combobox"
          className="input pr-11"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={createError && query?.trim() ? true : undefined}
          title={query === null ? selectedLabel : undefined}
          aria-activedescendant={open && options[active] ? optionId(active) : undefined}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={onCreate ? "Search or create a category" : "Search categories"}
          value={query ?? selectedLabel}
          onFocus={(e) => e.currentTarget.select()}
          onClick={openList}
          onChange={(e) => { setQuery(e.target.value); if (!open) setOpen(true); }}
          onKeyDown={onKeyDown}
          onBlur={(e) => {
            // clicks inside the list keep focus logic in onMouseDown; anything else closes and reverts
            if (!e.relatedTarget || !listRef.current?.contains(e.relatedTarget as Node)) close();
          }}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={open ? `Close ${label} list` : `Open ${label} list`}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center text-text-secondary"
          onMouseDown={(e) => { e.preventDefault(); if (open) close(); else { inputRef.current?.focus(); openList(); } }}
        >
          <IconChevronDown className={`h-4 w-4 transition-transform duration-standard ease-out ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      <p className="sr-only" role="status" aria-live="polite">{status}</p>

      {open && (
        <div className={`listbox-panel ${dropUp ? "listbox-up" : ""}`}>
          <ul id={listId} ref={listRef} role="listbox" aria-label="Categories" className="max-h-[min(18rem,50dvh)] overflow-y-auto py-1">
            {options.map((o, i) => {
              const isSel = o.id === value && o.kind !== "create";
              const isActive = i === active;
              return (
                <li
                  key={o.id}
                  id={optionId(i)}
                  role="option"
                  aria-selected={isSel}
                  className={`option ${isActive ? "option-active" : ""} ${o.kind === "create" ? "border-t border-border" : ""}`}
                  title={o.kind === "category" ? o.category.name : undefined}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseMove={() => setActive(i)}
                  onClick={() => choose(o)}
                >
                  {o.kind === "create" ? (
                    <span className="flex min-w-0 items-center gap-2 font-medium text-accent-text">
                      <IconPlus className="h-5 w-5 shrink-0" />
                      <span className="truncate">Create “{o.name}”</span>
                    </span>
                  ) : (
                    <>
                      <span className="w-5 shrink-0">{isSel && <IconCheck className="h-5 w-5 text-accent-text" />}</span>
                      <span className="min-w-0 flex-1 truncate">{o.kind === "all" ? ALL_LABEL : o.category.name}</span>
                      {counts && (
                        <span className="shrink-0 text-sm tabular-nums text-text-secondary">
                          {o.kind === "all" ? [...counts.values()].reduce((n, c) => n + c.total, 0) : counts.get(o.id)?.total ?? 0}
                        </span>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
          {noMatch && !createError && (
            <p role="presentation" className="listbox-note">No categories match “{query!.trim()}”.</p>
          )}
          {exact && onCreate && (
            <p role="presentation" className="listbox-note border-t border-border-subtle">“{exact.name}” already exists. Press Enter to use it.</p>
          )}
          {createError && query?.trim() && (
            <p role="presentation" className="listbox-note border-t border-border-subtle text-error-11">
              <IconWarning className="mt-0.5 h-4 w-4 shrink-0" />{createError}
            </p>
          )}
          {onCreate && !query?.trim() && categories.length <= 1 && (
            <p role="presentation" className="listbox-note border-t border-border-subtle">Type a name to create a category.</p>
          )}
          {!onCreate && emptyHint && categories.length <= 1 && (
            <div role="presentation" className="listbox-note border-t border-border-subtle">{emptyHint}</div>
          )}
          {total > RESULT_CAP && (
            <p role="presentation" className="listbox-note border-t border-border-subtle">
              Showing {RESULT_CAP} of {total} – keep typing to narrow.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
