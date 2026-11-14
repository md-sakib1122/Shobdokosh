import { useMemo, useRef, useState, type FormEvent } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import { IconChevronDown, IconPencil, IconPlus, IconSearch, IconTrash, IconWarning } from "../components/Icons";
import { useToast } from "../components/Toast";
import {
  UNCATEGORIZED_ID, categoryNameError, cleanCategoryName, createCategory, deleteCategory, renameCategory,
  restoreCategory, type Category,
} from "../lib/storage";
import { useAccount, useDB } from "../state/DBContext";
import { useCategories } from "../state/useCategories";

const PAGE = 50;
const SORT_THRESHOLD = 12;
type Sort = "az" | "most";

const wordCount = (n: number) => (n === 0 ? "No words" : n === 1 ? "1 word" : `${n} words`);

/** Inline name field shared by Create and Rename: live validation, Save disabled while invalid. */
function NameForm({ initial = "", exceptId, submitLabel, onSubmit, onCancel }: {
  initial?: string;
  exceptId?: string;
  submitLabel: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const account = useAccount();
  const [name, setName] = useState(initial);
  const [touched, setTouched] = useState(false);
  const fieldId = useRef(`cat-name-${Math.random().toString(36).slice(2)}`).current;
  const error = categoryNameError(name, account.categories, exceptId);
  const unchanged = exceptId !== undefined && cleanCategoryName(name) === initial;
  const showError = (touched || name.length > 0) && !!error && !unchanged;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (unchanged) { onCancel(); return; }
    if (!error) onSubmit(name);
  };

  return (
    <form className="flex w-full flex-col gap-2 py-3 sm:flex-row sm:items-start" onSubmit={submit} noValidate>
      <div className="flex-1">
        <label htmlFor={fieldId} className="sr-only">Category name</label>
        <input
          id={fieldId} className="input" autoFocus autoComplete="off" value={name} maxLength={80}
          placeholder="Category name"
          aria-invalid={showError || undefined} aria-describedby={showError ? `${fieldId}-err` : undefined}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); onCancel(); } }}
          onFocus={(e) => e.currentTarget.select()}
        />
        {showError && (
          <p id={`${fieldId}-err`} className="field-error"><IconWarning className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>
        )}
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={!!error && !unchanged}>{submitLabel}</button>
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function Categories() {
  const account = useAccount();
  const { update } = useDB();
  const toast = useToast();
  const cats = useCategories();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("az");
  const [limit, setLimit] = useState(PAGE);
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const newButton = useRef<HTMLButtonElement>(null);

  const builtIn = cats.byId.get(UNCATEGORIZED_ID)!;
  const userCats = cats.categories.filter((c) => c.id !== UNCATEGORIZED_ID);
  const total = (id: string) => cats.counts.get(id)?.total ?? 0;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle ? userCats.filter((c) => c.name.toLowerCase().includes(needle)) : userCats;
    return sort === "most" ? [...list].sort((a, b) => total(b.id) - total(a.id) || a.name.localeCompare(b.name)) : list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userCats, q, sort, cats.counts]);
  const page = filtered.slice(0, limit);
  const showBuiltIn = !q.trim() || builtIn.name.toLowerCase().includes(q.trim().toLowerCase());

  const create = (name: string) => {
    try {
      let made = "";
      update((db) => { const r = createCategory(db, account.email, name); made = r.category.name; return r.db; });
      toast(`Category “${made}” created.`, "success");
      setCreating(false);
      setQ("");
    } catch (e) {
      toast(`Couldn't save the category. ${(e as Error).message}`, "error");
    }
  };

  const rename = (id: string, name: string) => {
    try {
      update((db) => renameCategory(db, account.email, id, name));
      toast(`Renamed to “${cleanCategoryName(name)}”.`, "success");
      setRenaming(null);
    } catch (e) {
      toast(`Couldn't save the category. ${(e as Error).message}`, "error");
    }
  };

  const remove = (c: Category) => {
    try {
      let undo: ReturnType<typeof deleteCategory>["undo"] | null = null;
      update((db) => { const r = deleteCategory(db, account.email, c.id); undo = r.undo; return r.db; });
      const moved = undo!.wordIds.length;
      const movedText = moved === 0 ? "" : moved === 1 ? " 1 word moved to Uncategorized." : ` ${moved} words moved to Uncategorized.`;
      toast(`“${c.name}” deleted.${movedText}`, "info", {
        action: {
          label: "Undo",
          onAction: () => {
            update((db) => restoreCategory(db, account.email, undo!));
            toast(`“${c.name}” restored.`, "success");
          },
        },
      });
    } catch {
      toast(`Couldn't delete “${c.name}”. Nothing was changed.`, "error");
    }
  };

  const delCounts = deleting ? cats.counts.get(deleting.id) ?? { total: 0, practice: 0, learned: 0 } : null;

  return (
    <div className="page space-y-6">
      <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
        <h1 className="page-title">Categories</h1>
        <p className="pb-1 text-sm text-text-secondary">{cats.categories.length} {cats.categories.length === 1 ? "category" : "categories"}</p>
      </div>

      {userCats.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="cat-search" className="label">Search categories</label>
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary" />
              <input id="cat-search" type="search" className="input pl-10" value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} />
            </div>
          </div>
          {userCats.length > SORT_THRESHOLD && (
            <div className="sm:w-44">
              <label htmlFor="cat-sort" className="label">Sort</label>
              <div className="relative">
                <select id="cat-sort" className="input" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                  <option value="az">A to Z</option>
                  <option value="most">Most words</option>
                </select>
                <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              </div>
            </div>
          )}
          {!creating && (
            <button ref={newButton} type="button" className="btn-secondary" onClick={() => setCreating(true)}>
              <IconPlus className="h-5 w-5" />New category
            </button>
          )}
        </div>
      )}

      <ul className="max-w-[48rem]" aria-label="Categories">
        {creating && (
          <li className="border-b border-border-subtle">
            <NameForm submitLabel="Create" initial={q.trim()} onSubmit={create} onCancel={() => { setCreating(false); newButton.current?.focus(); }} />
          </li>
        )}
        {showBuiltIn && (
          <li className="flex min-h-[56px] flex-wrap items-center gap-x-4 gap-y-1 border-b border-border-subtle py-2">
            <span className="w-full min-w-0 truncate font-medium sm:w-auto sm:flex-1" title={builtIn.name}>{builtIn.name}</span>
            <span className="text-sm text-text-secondary">Built in – can't be renamed or deleted</span>
            <span className="text-sm tabular-nums text-text-secondary sm:w-20 sm:text-right">{wordCount(total(builtIn.id))}</span>
          </li>
        )}
        {page.map((c) => (
          <li key={c.id} className="border-b border-border-subtle transition-colors duration-micro hover:bg-surface-hover">
            {renaming === c.id ? (
              <NameForm initial={c.name} exceptId={c.id} submitLabel="Save" onSubmit={(n) => rename(c.id, n)} onCancel={() => setRenaming(null)} />
            ) : (
              <div className="flex min-h-[56px] flex-wrap items-center gap-x-4 gap-y-1 py-1">
                <span className="w-full min-w-0 truncate pt-2 font-medium sm:w-auto sm:flex-1 sm:pt-0" title={c.name}>{c.name}</span>
                <span className="text-sm tabular-nums text-text-secondary sm:w-20 sm:text-right">{wordCount(total(c.id))}</span>
                <span className="-ml-3 flex sm:ml-0">
                  <button type="button" className="btn-ghost" onClick={() => setRenaming(c.id)} aria-label={`Rename ${c.name}`}>
                    <IconPencil className="h-5 w-5" />Rename
                  </button>
                  <button type="button" className="btn-ghost text-error-11 hover:bg-error-3" onClick={() => setDeleting(c)} aria-label={`Delete ${c.name}`}>
                    <IconTrash className="h-5 w-5" />Delete
                  </button>
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>

      {userCats.length > 0 && filtered.length > page.length && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-text-secondary" role="status">Showing {page.length} of {filtered.length}</p>
          <button type="button" className="btn-secondary" onClick={() => setLimit((l) => l + PAGE)}>Show 50 more</button>
        </div>
      )}

      {userCats.length > 0 && q.trim() && filtered.length === 0 && (
        <div className="space-y-3" role="status">
          <p className="text-text-secondary">No categories match “{q.trim()}”.</p>
          {!creating && !categoryNameError(q, account.categories) && (
            <button type="button" className="btn-secondary" onClick={() => create(q)}>
              <IconPlus className="h-5 w-5" />Create “{cleanCategoryName(q)}”
            </button>
          )}
        </div>
      )}

      {userCats.length === 0 && !creating && (
        <section className="panel">
          <h2 className="text-lg font-medium">Group your words into lists</h2>
          <p className="mt-1 text-text-secondary">
            Categories let you practice one list at a time. Words you add without one go in Uncategorized.
          </p>
          <button ref={newButton} type="button" className="btn-primary mt-5" onClick={() => setCreating(true)}>Create a category</button>
        </section>
      )}

      {deleting && delCounts && (
        <ConfirmDialog
          title={`Delete “${deleting.name}”?`}
          confirmLabel="Delete category"
          onConfirm={() => remove(deleting)}
          onCancel={() => setDeleting(null)}
        >
          {delCounts.total === 0 ? (
            <p>It has no words.</p>
          ) : (
            <p>
              Its {delCounts.total === 1 ? "1 word moves" : `${delCounts.total} words move`} to Uncategorized ({delCounts.practice} in practice, {delCounts.learned} learned).
              {" "}The words themselves are not deleted.
            </p>
          )}
        </ConfirmDialog>
      )}
    </div>
  );
}
