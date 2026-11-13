// User data: one JSON document in localStorage (key "shobdo:v1"), with an in-memory
// fallback when storage is unavailable (private mode, quota, blocked site data).

export const STORAGE_KEY = "shobdo:v1";

export type WordStatus = "practice" | "all";
export type DefinitionStatus = "ok" | "notfound" | "error";

export interface WordStats {
  attempts: number;
  correct: number;
  streak: number;
  lastPracticedAt: string | null;
}

export interface Word {
  id: string;
  word: string; // as typed, trimmed
  bnPronunciation: string | null; // from bnPhonetic
  pronSource: string | null; // override | cmudict | ... | rules
  pronReliable: boolean; // false for neural/rules guesses → "?" badge
  bnMeaning: string | null; // from E2Bdatabase
  meaningLemma?: string | null; // set when the meaning came from a lemma ("meaning of …")
  definition: string | null; // first definition
  definitionStatus?: DefinitionStatus; // notfound = API had no entry (not an error)
  partOfSpeech: string | null;
  audioUrl: string | null;
  sentence: string | null; // optional, user or suggested
  status: WordStatus;
  stats: WordStats;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  email: string;
  createdAt: string; // ISO
  words: Word[];
}

export interface DB {
  version: 1;
  accounts: Record<string, Account>; // key: normalized email
  session: string | null; // current email
}

export const emptyDB = (): DB => ({ version: 1, accounts: {}, session: null });

// ───────────────────────────── persistence ─────────────────────────────
let memoryOnly = false;
let memoryCopy: string | null = null;

/** False once localStorage has failed; data then lives only in memory for this tab. */
export const storageAvailable = (): boolean => !memoryOnly;

/** Upgrade older documents. Only version 1 exists so far. */
export function migrate(raw: unknown): DB | null {
  if (!raw || typeof raw !== "object") return null;
  const version = (raw as { version?: unknown }).version;
  switch (version) {
    case 1:
      return validateDB(raw) ? raw : null;
    default:
      return null; // unknown future/past version: refuse rather than corrupt
  }
}

export function loadDB(): DB {
  let text: string | null = null;
  try {
    text = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    memoryOnly = true;
    text = memoryCopy;
  }
  if (!text) return emptyDB();
  try {
    return migrate(JSON.parse(text)) ?? emptyDB();
  } catch {
    return emptyDB();
  }
}

export function saveDB(db: DB): void {
  const text = JSON.stringify(db);
  memoryCopy = text;
  if (memoryOnly) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, text);
  } catch {
    memoryOnly = true;
  }
}

// ───────────────────────────── validation ─────────────────────────────
const isStr = (x: unknown): x is string => typeof x === "string";
const isStrOrNull = (x: unknown) => x === null || isStr(x);
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const isCount = (x: unknown) => typeof x === "number" && Number.isFinite(x) && x >= 0;

export function validateWord(x: unknown): x is Word {
  if (!isObj(x)) return false;
  const s = x.stats;
  return isStr(x.id) && isStr(x.word) && x.word.trim().length > 0 &&
    isStrOrNull(x.bnPronunciation) && isStrOrNull(x.pronSource) && typeof x.pronReliable === "boolean" &&
    isStrOrNull(x.bnMeaning) && (x.meaningLemma === undefined || isStrOrNull(x.meaningLemma)) &&
    isStrOrNull(x.definition) &&
    (x.definitionStatus === undefined || ["ok", "notfound", "error"].includes(x.definitionStatus as string)) &&
    isStrOrNull(x.partOfSpeech) && isStrOrNull(x.audioUrl) && isStrOrNull(x.sentence) &&
    (x.status === "practice" || x.status === "all") &&
    isObj(s) && isCount(s.attempts) && isCount(s.correct) && isCount(s.streak) && isStrOrNull(s.lastPracticedAt) &&
    isStr(x.createdAt) && isStr(x.updatedAt);
}

export function validateAccount(x: unknown): x is Account {
  return isObj(x) && isStr(x.email) && isStr(x.createdAt) && Array.isArray(x.words) && x.words.every(validateWord);
}

export function validateDB(x: unknown): x is DB {
  return isObj(x) && x.version === 1 && isStrOrNull(x.session) && isObj(x.accounts) &&
    Object.values(x.accounts).every(validateAccount);
}

// ───────────────────────────── accounts ─────────────────────────────
export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;

const now = () => new Date().toISOString();

/** Open (and silently create) the account for `email` and make it the session. */
export function openAccount(db: DB, email: string): DB {
  const key = normalizeEmail(email);
  const accounts = db.accounts[key]
    ? db.accounts
    : { ...db.accounts, [key]: { email: key, createdAt: now(), words: [] } };
  return { ...db, accounts, session: key };
}

export const closeSession = (db: DB): DB => ({ ...db, session: null });

export function deleteAccount(db: DB, email: string): DB {
  const accounts = { ...db.accounts };
  delete accounts[email];
  return { ...db, accounts, session: db.session === email ? null : db.session };
}

function withWords(db: DB, email: string, fn: (words: Word[]) => Word[]): DB {
  const acc = db.accounts[email];
  if (!acc) return db;
  return { ...db, accounts: { ...db.accounts, [email]: { ...acc, words: fn(acc.words) } } };
}

// ───────────────────────────── words ─────────────────────────────
/** Comparison key for duplicates: case-insensitive, internal whitespace collapsed. */
export const wordKey = (w: string): string => w.trim().toLowerCase().replace(/\s+/g, " ");

export function findDuplicate(words: Word[], text: string): Word | undefined {
  const k = wordKey(text);
  return words.find((w) => wordKey(w.word) === k);
}

export type NewWordFields = Omit<Word, "id" | "status" | "stats" | "createdAt" | "updatedAt">;

const uuid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`; // non-secure contexts

export function createWord(fields: NewWordFields): Word {
  const t = now();
  return {
    ...fields,
    word: fields.word.trim(),
    id: uuid(),
    status: "practice", // new words always start in Practice
    stats: { attempts: 0, correct: 0, streak: 0, lastPracticedAt: null },
    createdAt: t,
    updatedAt: t,
  };
}

export const addWord = (db: DB, email: string, word: Word): DB => withWords(db, email, (ws) => [word, ...ws]);

export const updateWord = (db: DB, email: string, id: string, patch: Partial<Omit<Word, "id">>): DB =>
  withWords(db, email, (ws) => ws.map((w) => (w.id === id ? { ...w, ...patch, updatedAt: now() } : w)));

export const removeWord = (db: DB, email: string, id: string): DB =>
  withWords(db, email, (ws) => ws.filter((w) => w.id !== id));

/** Record one practice attempt. */
export function recordAttempt(stats: WordStats, correct: boolean): WordStats {
  return {
    attempts: stats.attempts + 1,
    correct: stats.correct + (correct ? 1 : 0),
    streak: correct ? stats.streak + 1 : 0,
    lastPracticedAt: now(),
  };
}

// ───────────────────────────── export / import ─────────────────────────────
export interface ExportFile {
  app: "shobdo-practice";
  version: 1;
  exportedAt: string;
  account: Account;
}

export function exportAccount(acc: Account): string {
  const file: ExportFile = { app: "shobdo-practice", version: 1, exportedAt: now(), account: acc };
  return JSON.stringify(file, null, 2);
}

export type ImportMode = "merge" | "replace";

/** Pull the words out of an export file (or a whole DB document). Throws a readable Error. */
export function parseImport(text: string, currentEmail: string): Word[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("This file is not valid JSON.");
  }
  if (!isObj(data) || data.version !== 1) throw new Error("Unsupported file: expected a version 1 ShobdoPractice export.");
  if (isObj(data.account)) {
    if (!validateAccount(data.account)) throw new Error("The file's account data does not match the expected schema.");
    return data.account.words;
  }
  if (isObj(data.accounts)) {
    if (!validateDB(data)) throw new Error("The file's data does not match the expected schema.");
    const accs = Object.values(data.accounts);
    const acc = data.accounts[currentEmail] ?? (accs.length === 1 ? accs[0] : undefined);
    if (!acc) throw new Error("The file holds several accounts and none matches yours.");
    return acc.words;
  }
  throw new Error("Unsupported file: no account data found.");
}

/** merge: imported words win when newer (matched by id, then by word); replace: imported set only. */
export function importWords(db: DB, email: string, incoming: Word[], mode: ImportMode): { db: DB; added: number; updated: number } {
  let added = 0;
  let updated = 0;
  const next = withWords(db, email, (current) => {
    if (mode === "replace") {
      added = incoming.length;
      return [...incoming];
    }
    const out = [...current];
    for (const w of incoming) {
      const idx = out.findIndex((c) => c.id === w.id || wordKey(c.word) === wordKey(w.word));
      if (idx === -1) {
        out.push(w);
        added++;
      } else if (w.updatedAt > out[idx].updatedAt) {
        out[idx] = { ...w, id: out[idx].id };
        updated++;
      }
    }
    return out;
  });
  return { db: next, added, updated };
}
