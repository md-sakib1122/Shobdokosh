// Background loading of the two big static resources (CMUdict chunk, meaning dictionary),
// started right after login so the Add page and offline use find them ready.
import { useSyncExternalStore } from "react";
import { ensureReady } from "../lib/bnPhonetic";
import { loadMeanings } from "../lib/meaning";

type State = "idle" | "loading" | "ready" | "error";
export interface Resources { phonetic: State; meanings: State }

let state: Resources = { phonetic: "idle", meanings: "idle" };
const listeners = new Set<() => void>();
const set = (patch: Partial<Resources>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

function start(key: keyof Resources, load: () => Promise<unknown>) {
  if (state[key] === "loading" || state[key] === "ready") return;
  set({ [key]: "loading" });
  load().then(() => set({ [key]: "ready" }), () => set({ [key]: "error" }));
}

export function warmResources(): void {
  start("phonetic", ensureReady);
  start("meanings", loadMeanings);
}

export function useResources(): Resources {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => state,
  );
}
