import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ConfirmDialog from "../components/ConfirmDialog";
import { IconWarning } from "../components/Icons";
import { useToast } from "../components/Toast";
import {
  deleteAccount, exportAccount, importWords, parseImport, type ImportMode, type ImportPayload,
} from "../lib/storage";
import { useAccount, useDB } from "../state/DBContext";

const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export default function Settings() {
  const account = useAccount();
  const { update, logout } = useDB();
  const toast = useToast();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ImportMode>("merge");
  const [importError, setImportError] = useState<string | null>(null);
  const [pendingReplace, setPendingReplace] = useState<ImportPayload | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const doExport = () => {
    const blob = new Blob([exportAccount(account)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shobdo-${account.email.replace(/[^a-z0-9]+/gi, "_")}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const apply = (payload: ImportPayload, how: ImportMode) => {
    let r: ReturnType<typeof importWords> | null = null;
    update((db) => { r = importWords(db, account.email, payload, how); return r.db; });
    const res = r!;
    if (how === "replace") {
      toast(`Import done. Your data was replaced with ${n(res.added, "word", "words")}.`, "success");
    } else {
      const parts = [`Import done. Added ${n(res.added, "word", "words")}, updated ${res.updated}.`];
      const catParts = [res.created && `${res.created} created`, res.merged && `${res.merged} merged into existing`].filter(Boolean);
      if (catParts.length) parts.push(`Categories: ${catParts.join(", ")}.`);
      if (res.uncategorized) parts.push(`${n(res.uncategorized, "word", "words")} placed in Uncategorized.`);
      toast(parts.join(" "), "success", { duration: 12000 });
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const doImport = async () => {
    setImportError(null);
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setImportError("Choose a file first.");
      return;
    }
    try {
      const payload = parseImport(await file.text(), account.email);
      if (mode === "replace") setPendingReplace(payload);
      else apply(payload, "merge");
    } catch (e) {
      setImportError((e as Error).message);
    }
  };

  const doDelete = () => {
    update((db) => deleteAccount(db, account.email));
    navigate("/login", { replace: true });
  };

  const practice = account.words.filter((w) => w.status === "practice").length;
  const fileCats = pendingReplace ? (pendingReplace.categories ?? []).filter((c) => c.id !== "uncategorized").length + 1 : 0;

  return (
    <div className="page max-w-[44rem] space-y-6">
      <h1 className="page-title">Settings</h1>

      <section className="panel max-w-none space-y-3" aria-labelledby="s-account">
        <h2 id="s-account" className="text-lg font-medium">Account</h2>
        <div>
          <p className="break-all">Signed in as <span className="font-medium">{account.email}</span></p>
          <p className="text-sm text-text-secondary">
            {n(account.words.length, "word", "words")} ({practice} in practice, {account.words.length - practice} learned) ·{" "}
            {n(account.categories.length, "category", "categories")} · created {new Date(account.createdAt).toLocaleDateString()}
          </p>
        </div>
        <button className="btn-secondary" onClick={() => { logout(); navigate("/login"); }}>Switch account</button>
      </section>

      <section className="panel max-w-none space-y-5" aria-labelledby="s-data">
        <div>
          <h2 id="s-data" className="text-lg font-medium">Your data</h2>
          <p className="mt-1 text-sm text-text-secondary">Everything is stored in this browser only. Export a backup to keep a copy or move it to another device.</p>
        </div>
        <div>
          <button className="btn-primary" onClick={doExport}>Export my data (.json)</button>
          <p className="hint">Includes your words and categories.</p>
        </div>

        <div className="divider space-y-4 pt-5">
          <h3 className="section-title">Import</h3>
          <div>
            <label htmlFor="import-file" className="label">Choose a .json file</label>
            <input
              id="import-file" ref={fileRef} type="file" accept="application/json,.json"
              className="input py-2 file:mr-3 file:rounded-sm file:border-0 file:bg-surface-hover file:px-3 file:py-1 file:text-sm file:font-medium file:text-text"
              aria-invalid={!!importError || undefined} aria-describedby={importError ? "import-error" : undefined}
              onChange={() => setImportError(null)}
            />
            {importError && (
              <p id="import-error" role="alert" className="field-error"><IconWarning className="mt-0.5 h-4 w-4 shrink-0" />{importError}</p>
            )}
          </div>
          <fieldset>
            <legend className="label">If a word or category already exists</legend>
            <div className="space-y-1">
              <label className="flex min-h-control cursor-pointer items-start gap-3 rounded py-2">
                <input type="radio" name="mode" className="radio mt-0.5" checked={mode === "merge"} onChange={() => setMode("merge")} />
                <span>
                  <span className="font-medium">Merge</span>
                  <span className="block text-sm text-text-secondary">Keep what you have and add the file's words and categories. Categories with the same name are combined.</span>
                </span>
              </label>
              <label className="flex min-h-control cursor-pointer items-start gap-3 rounded py-2">
                <input type="radio" name="mode" className="radio mt-0.5" checked={mode === "replace"} onChange={() => setMode("replace")} />
                <span>
                  <span className="font-medium">Replace everything</span>
                  <span className="flex items-start gap-1.5 text-sm text-warning-11">
                    <IconWarning className="mt-0.5 h-4 w-4 shrink-0" />Deletes your current words and categories and uses only the file's.
                  </span>
                </span>
              </label>
            </div>
          </fieldset>
          <button className="btn-secondary" onClick={doImport}>Import</button>
        </div>
      </section>

      <section className="panel max-w-none space-y-3" aria-labelledby="s-delete">
        <h2 id="s-delete" className="text-lg font-medium">Delete account</h2>
        <p className="text-sm text-text-secondary">Removes {account.email} and all its words and categories from this browser.</p>
        <button className="btn-danger" onClick={() => setConfirmDelete(true)}>Delete account…</button>
      </section>

      {pendingReplace && (
        <ConfirmDialog
          title="Replace everything?"
          confirmLabel="Replace everything"
          onConfirm={() => apply(pendingReplace, "replace")}
          onCancel={() => setPendingReplace(null)}
        >
          <p>
            Your {n(account.words.length, "word", "words")} and {n(account.categories.length, "category", "categories")} will be
            replaced with the file's {n(pendingReplace.words.length, "word", "words")} and {n(fileCats, "category", "categories")}.
            {" "}This can't be undone. Export first if you want a copy.
          </p>
        </ConfirmDialog>
      )}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete this account?"
          confirmLabel="Delete account"
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(false)}
        >
          <p>All words and categories saved here for {account.email} are removed from this browser. This can't be undone.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
