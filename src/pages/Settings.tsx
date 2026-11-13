import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";
import { deleteAccount, exportAccount, importWords, parseImport, type ImportMode } from "../lib/storage";
import { useAccount, useDB } from "../state/DBContext";

export default function Settings() {
  const account = useAccount();
  const { update } = useDB();
  const toast = useToast();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ImportMode>("merge");
  const [importError, setImportError] = useState<string | null>(null);
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

  const doImport = async () => {
    setImportError(null);
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setImportError("Choose a .json file first.");
      return;
    }
    try {
      const words = parseImport(await file.text(), account.email);
      let summary = "";
      update((db) => {
        const r = importWords(db, account.email, words, mode);
        summary = mode === "replace" ? `Replaced with ${r.added} words.` : `Added ${r.added}, updated ${r.updated}.`;
        return r.db;
      });
      toast(`Import done. ${summary}`, "success");
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      setImportError((e as Error).message);
    }
  };

  const doDelete = () => {
    update((db) => deleteAccount(db, account.email));
    navigate("/login", { replace: true });
  };

  const practice = account.words.filter((w) => w.status === "practice").length;

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h1 className="text-2xl font-bold">Settings</h1>

      <section className="card p-5">
        <h2 className="font-semibold">Account</h2>
        <p className="mt-1 break-all text-slate-700">{account.email}</p>
        <p className="text-sm text-slate-500">
          {account.words.length} words ({practice} in Practice, {account.words.length - practice} in All Words) · created{" "}
          {new Date(account.createdAt).toLocaleDateString()}
        </p>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-semibold">Your data</h2>
        <p className="text-sm text-slate-600">Everything is stored in this browser only. Export a backup or move it to another device.</p>
        <button className="btn-primary" onClick={doExport}>Export my data (.json)</button>

        <fieldset className="space-y-2 border-t border-slate-100 pt-3">
          <legend className="pt-2 font-medium">Import (.json)</legend>
          <label htmlFor="import-file" className="label">File</label>
          <input id="import-file" ref={fileRef} type="file" accept="application/json,.json" className="input py-2" onChange={() => setImportError(null)} />
          <div className="flex flex-wrap gap-4 text-sm" role="radiogroup" aria-label="Import mode">
            <label className="flex min-h-[44px] items-center gap-2">
              <input type="radio" name="mode" checked={mode === "merge"} onChange={() => setMode("merge")} /> Merge (keep my words, add new ones)
            </label>
            <label className="flex min-h-[44px] items-center gap-2">
              <input type="radio" name="mode" checked={mode === "replace"} onChange={() => setMode("replace")} /> Replace all my words
            </label>
          </div>
          {importError && <p role="alert" className="text-sm text-rose-700">{importError}</p>}
          <button className="btn-secondary" onClick={doImport}>Import</button>
        </fieldset>
      </section>

      <section className="card space-y-3 border-rose-200 p-5">
        <h2 className="font-semibold text-rose-800">Delete account</h2>
        <p className="text-sm text-slate-600">Removes {account.email} and all its words from this device. This can't be undone.</p>
        {!confirmDelete ? (
          <button className="btn-secondary text-rose-700" onClick={() => setConfirmDelete(true)}>Delete account…</button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button className="btn-danger" onClick={doDelete}>Yes, delete everything</button>
            <button className="btn-ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
          </div>
        )}
      </section>
    </div>
  );
}
