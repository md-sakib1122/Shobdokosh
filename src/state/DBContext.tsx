import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import {
  closeSession, loadDB, saveDB, storageAvailable, type Account, type DB,
} from "../lib/storage";

interface DBContextValue {
  db: DB;
  account: Account | null;
  /** Apply a pure update (db → db) and persist it. */
  update: (fn: (db: DB) => DB) => void;
  logout: () => void;
  persistent: boolean;
}

const Ctx = createContext<DBContextValue | null>(null);

export function DBProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(() => loadDB());
  const [persistent, setPersistent] = useState(() => storageAvailable());
  const current = useRef(db);

  // Synchronous: the new document is computed, saved and published in one step,
  // so callers can read results right after update() returns.
  const update = useCallback((fn: (db: DB) => DB) => {
    const next = fn(current.current);
    if (next === current.current) return;
    current.current = next;
    saveDB(next);
    setDb(next);
    setPersistent(storageAvailable());
  }, []);

  const logout = useCallback(() => update(closeSession), [update]);

  const value = useMemo<DBContextValue>(() => ({
    db,
    account: db.session ? db.accounts[db.session] ?? null : null,
    update,
    logout,
    persistent,
  }), [db, update, logout, persistent]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDB(): DBContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDB outside DBProvider");
  return v;
}

/** The signed-in account (only used under the auth guard). */
export function useAccount(): Account {
  const { account } = useDB();
  if (!account) throw new Error("no account");
  return account;
}
