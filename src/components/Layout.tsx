import { useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAccount, useDB } from "../state/DBContext";
import { useResources, warmResources } from "../state/resources";

function Badge({ n }: { n: number }) {
  return (
    <span className="ml-1.5 inline-flex min-w-[1.5rem] justify-center rounded-full bg-black/10 px-1.5 text-xs font-semibold tabular-nums">
      {n}
    </span>
  );
}

const tab = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-[44px] flex-1 items-center justify-center rounded-xl px-2 text-sm font-medium transition sm:flex-none sm:px-4 ${
    isActive ? "bg-teal-700 text-white" : "text-slate-700 hover:bg-slate-100"
  }`;

export default function Layout() {
  const account = useAccount();
  const { logout, persistent } = useDB();
  const res = useResources();
  const navigate = useNavigate();
  useEffect(warmResources, []);

  const practice = account.words.filter((w) => w.status === "practice").length;
  const all = account.words.length - practice;
  const loading = res.phonetic === "loading" || res.meanings === "loading";

  return (
    <div className="min-h-screen pb-16">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 pt-3">
          <NavLink to="/practice" className="flex items-center gap-2 font-bold text-teal-800">
            <span className="bn grid h-9 w-9 place-items-center rounded-xl bg-teal-700 text-lg text-white" aria-hidden>শ</span>
            <span className="text-lg">ShobdoPractice</span>
          </NavLink>
          <div className="ml-auto flex min-w-0 items-center gap-2">
            <span className="hidden truncate text-sm text-slate-500 sm:inline" title={account.email}>{account.email}</span>
            <button className="btn-secondary whitespace-nowrap px-3" onClick={() => { logout(); navigate("/login"); }}>
              Switch account
            </button>
          </div>
        </div>
        <p className="mx-auto max-w-5xl truncate px-4 pt-1 text-xs text-slate-500 sm:hidden">{account.email}</p>
        <nav className="mx-auto flex max-w-5xl gap-1 px-4 py-2" aria-label="Main">
          <NavLink to="/practice" className={tab}>Practice<Badge n={practice} /></NavLink>
          <NavLink to="/all" className={tab}>All Words<Badge n={all} /></NavLink>
          <NavLink to="/add" className={tab}>Add</NavLink>
          <NavLink to="/settings" className={tab} aria-label="Settings">
            <span className="sm:hidden" aria-hidden>⚙️</span><span className="hidden sm:inline">Settings</span>
          </NavLink>
        </nav>
        {loading && <div className="h-0.5 w-full animate-pulse bg-teal-500/60" role="progressbar" aria-label="Loading dictionaries" />}
      </header>
      {!persistent && (
        <div role="alert" className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
          Storage is unavailable in this browser — your changes are kept in memory only and will be lost when you close the tab. Export them from Settings.
        </div>
      )}
      <main className="mx-auto max-w-5xl px-4 py-5">
        <Outlet />
      </main>
    </div>
  );
}
