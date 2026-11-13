// Bangla meaning lookup over public/data/E2Bdatabase.json (~103k entries, 7.9 MB).
// Parsed once, then cached in IndexedDB so later visits skip the download and parse.

export interface MeaningEntry { en: string; bn: string }
export type MeaningMap = Map<string, string>;

export interface MeaningHit {
  bn: string;
  matched: string; // dictionary key that matched
  lemma: string | null; // set when found via a lemma fallback ("meaning of <lemma>")
}

/** lowercase en → bn; duplicate keys are merged with ", ". */
export function buildMeaningMap(entries: MeaningEntry[]): MeaningMap {
  const map: MeaningMap = new Map();
  for (const e of entries) {
    if (!e || typeof e.en !== "string" || typeof e.bn !== "string") continue;
    const key = e.en.trim().toLowerCase();
    const bn = e.bn.trim();
    if (!key || !bn) continue;
    const prev = map.get(key);
    if (prev === undefined) map.set(key, bn);
    else if (prev !== bn) map.set(key, `${prev}, ${bn}`);
  }
  return map;
}

/** air-port ↔ airport ↔ air port */
function spellingVariants(w: string): string[] {
  const out = [w, w.replace(/[-\s]+/g, ""), w.replace(/-/g, " "), w.replace(/\s+/g, "-")];
  return [...new Set(out)];
}

const VOWEL = /[aeiou]/;

/** Simple lemma candidates: -s, -es, -ies→y, -ed, -ing, doubled consonant. */
export function lemmaCandidates(w: string): string[] {
  const c: string[] = [];
  const add = (x: string) => { if (x.length >= 2 && x !== w) c.push(x); };
  if (w.endsWith("ies") && w.length > 4) add(w.slice(0, -3) + "y");
  if (w.endsWith("ied") && w.length > 4) add(w.slice(0, -3) + "y");
  if (w.endsWith("es") && w.length > 3) add(w.slice(0, -2));
  if (w.endsWith("s") && !w.endsWith("ss") && w.length > 3) add(w.slice(0, -1));
  for (const suf of ["ed", "ing"]) {
    if (w.endsWith(suf) && w.length > suf.length + 2) {
      const stem = w.slice(0, -suf.length);
      if (VOWEL.test(stem)) {
        const last = stem[stem.length - 1];
        if (stem.length > 2 && last === stem[stem.length - 2] && !"aeiouls".includes(last)) add(stem.slice(0, -1)); // stopped → stop
        add(stem); // walked → walk
        add(stem + "e"); // making → make, used → use
      }
    }
  }
  return [...new Set(c)];
}

export function lookupIn(map: MeaningMap, word: string): MeaningHit | null {
  const w = word.trim().toLowerCase().replace(/\s+/g, " ").replace(/’/g, "'");
  if (!w) return null;
  for (const v of spellingVariants(w)) {
    const bn = map.get(v);
    if (bn) return { bn, matched: v, lemma: null };
  }
  for (const lemma of lemmaCandidates(w)) {
    for (const v of spellingVariants(lemma)) {
      const bn = map.get(v);
      if (bn) return { bn, matched: v, lemma: v };
    }
  }
  return null;
}

export interface MeaningItem { text: string; tag: string | null }

/** "সত্য (Adj.), প্রকৃত (Adj.)" → [{text: "সত্য", tag: "Adj."}, …] */
export function parseMeaning(bn: string): MeaningItem[] {
  return bn
    .split(/\s*,\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const m = /^(.*?)\s*\(([^()]{1,12})\)$/.exec(part);
      return m && m[1] ? { text: m[1], tag: m[2] } : { text: part, tag: null };
    });
}

// ───────────────────────────── loading + IndexedDB cache ─────────────────────────────
const IDB_NAME = "shobdo-cache";
const IDB_STORE = "kv";
const IDB_KEY = "meaning-v1"; // bump when E2Bdatabase.json changes

function idbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("no IndexedDB"));
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await idbOpen();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const req = db.transaction(IDB_STORE, "readonly").objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await idbOpen();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

let loading: Promise<MeaningMap> | null = null;
let loaded: MeaningMap | null = null;

export const meaningsLoaded = (): boolean => loaded !== null;

/** Load the dictionary once: IndexedDB cache first, else fetch + parse (+ cache). */
export function loadMeanings(): Promise<MeaningMap> {
  loading ??= (async () => {
    try {
      const cached = await idbGet<MeaningMap>(IDB_KEY);
      if (cached instanceof Map && cached.size > 0) return (loaded = cached);
    } catch {
      /* no cache available: fall through to the network */
    }
    const res = await fetch(`${import.meta.env.BASE_URL}data/E2Bdatabase.json`);
    if (!res.ok) throw new Error(`dictionary HTTP ${res.status}`);
    const map = buildMeaningMap((await res.json()) as MeaningEntry[]);
    idbSet(IDB_KEY, map).catch(() => undefined); // caching is best-effort
    return (loaded = map);
  })();
  loading.catch(() => { loading = null; }); // allow a retry
  return loading;
}

export async function lookupMeaning(word: string): Promise<MeaningHit | null> {
  return lookupIn(await loadMeanings(), word);
}
