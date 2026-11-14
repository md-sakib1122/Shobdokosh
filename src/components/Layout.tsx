import { useEffect, type ComponentType, type SVGProps } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAccount, useDB } from "../state/DBContext";
import { useResources, warmResources } from "../state/resources";
import { IconAdd, IconCategories, IconPractice, IconSettings, IconWarning, IconWords, LogoMark } from "./Icons";

interface Item {
  to: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  count?: number;
  countLabel?: (n: number) => string;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function Wordmark({ className = "text-xl" }: { className?: string }) {
  return (
    <span className={`display text-text ${className}`}>
      <span className="font-medium">Shobdo</span><span className="font-normal">Practice</span>
    </span>
  );
}

export default function Layout() {
  const account = useAccount();
  const { logout, persistent } = useDB();
  const res = useResources();
  const navigate = useNavigate();
  useEffect(warmResources, []);

  const practice = account.words.filter((w) => w.status === "practice").length;
  const learned = account.words.length - practice;
  const loading = res.phonetic === "loading" || res.meanings === "loading";

  const items: Item[] = [
    { to: "/practice", label: "Practice", Icon: IconPractice, count: practice, countLabel: (n) => `${plural(n, "word", "words")} in practice` },
    { to: "/words", label: "Words", Icon: IconWords, count: learned, countLabel: (n) => plural(n, "word", "words") },
    { to: "/add", label: "Add", Icon: IconAdd },
    { to: "/categories", label: "Categories", Icon: IconCategories },
    { to: "/settings", label: "Settings", Icon: IconSettings },
  ];

  return (
    <div className="min-h-screen pb-24 md:pb-12">
      <header className="sticky top-0 z-30 border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-content items-center gap-6 px-4 md:h-16 md:px-8">
          <NavLink to="/practice" className="flex min-h-control shrink-0 items-center gap-2 rounded" aria-label="ShobdoPractice – Practice">
            <LogoMark className="h-7 w-7" />
            <Wordmark />
          </NavLink>

          <nav aria-label="Main" className="nav-bar">
            {items.map(({ to, label, Icon, count, countLabel }) => (
              <NavLink
                key={to}
                to={to}
                className="nav-item"
              >
                {({ isActive }) => (
                  <>
                    <span className="relative">
                      <Icon className="h-6 w-6 md:h-5 md:w-5" strokeWidth={isActive ? 2 : 1.5} />
                      {count !== undefined && count > 0 && (
                        <span className="badge absolute -right-3 -top-1.5 md:hidden" aria-hidden>{count}</span>
                      )}
                    </span>
                    <span>{label}</span>
                    {count !== undefined && (
                      <>
                        <span className="badge hidden md:inline-flex" aria-hidden>{count}</span>
                        <span className="sr-only">, {countLabel!(count)}</span>
                      </>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto hidden shrink-0 items-center md:flex">
            <button
              className="btn-ghost whitespace-nowrap"
              title={`Signed in as ${account.email}`}
              onClick={() => { logout(); navigate("/login"); }}
            >
              Switch account
            </button>
          </div>
        </div>
        {loading && <div className="h-0.5 w-full bg-accent-solid opacity-40" role="progressbar" aria-label="Loading dictionaries" />}
      </header>

      {!persistent && (
        <div className="mx-auto mt-4 max-w-content px-4 md:px-8">
          <p role="alert" className="note-warning">
            <IconWarning className="mt-0.5 h-4 w-4 shrink-0" />
            This browser isn't saving data right now. Changes are kept only until you close this tab. Export your words from Settings to keep a copy.
          </p>
        </div>
      )}

      <main className="mx-auto max-w-content px-4 pt-6 md:px-8 md:pt-10">
        <Outlet />
      </main>
    </div>
  );
}
