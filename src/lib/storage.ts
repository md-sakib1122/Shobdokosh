// User data: one JSON document in localStorage (key "shobdo:v1" — the key is kept for
// continuity; the document itself carries its schema version), with an in-memory
// fallback when storage is unavailable (private mode, quota, blocked site data).

export const STORAGE_KEY = "shobdo:v1";

export type WordStatus = "practice" | "all";
export type DefinitionStatus = "ok" | "notfound" | "error";

/** The built-in category: always present, cannot be renamed or deleted. */
export const UNCATEGORIZED_ID = "uncategorized";
export const UNCATEGORIZED_NAME = "Uncategorized";
export const CATEGORY_NAME_MAX = 40;

export interface Category {
  id: string;
  name: string;
  createdAt: string;
}

export interface WordStats {
  attempts: number;
  correct: number;
  streak: number;
  lastPracticedAt: string | null;
}

export interface Word {
  id: string;
  word: string; // as typed, trimmed
  categoryId: string; // exactly one category; UNCATEGORIZED_ID by default
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

/** Remembered per-account selections. Ids are validated on read (see resolve* helpers). */
export interface AccountPrefs {
  practiceCategory: string; // "all" or a category id
  lastAddCategory: string | null;
}

export const ALL_CATEGORIES = "all";

export interface Account {
  email: string;
  createdAt: string; // ISO
  words: Word[];
  categories: Category[];
  prefs: AccountPrefs;
}

export interface DB {
  version: 2;
  accounts: Record<string, Account>; // key: normalized email
  session: string | null; // current email
}

export const emptyDB = (): DB => ({ version: 2, accounts: {}, session: null });

const now = () => new Date().toISOString();

const uuid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`; // non-secure contexts

const uncategorized = (createdAt: string): Category => ({ id: UNCATEGORIZED_ID, name: UNCATEGORIZED_NAME, createdAt });

const defaultPrefs = (): AccountPrefs => ({ practiceCategory: ALL_CATEGORIES, lastAddCategory: null });

// ───────────────────────────── validation ─────────────────────────────
const isStr = (x: unknown): x is string => typeof x === "string";
const isStrOrNull = (x: unknown) => x === null || isStr(x);
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const isCount = (x: unknown) => typeof x === "number" && Number.isFinite(x) && x >= 0;

/** Every field except categoryId (absent in v1 documents). */
function validateWordBody(x: unknown): x is Record<string, unknown> {
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

export function validateWord(x: unknown): x is Word {
  return validateWordBody(x) && isStr(x.categoryId);
}

export function validateCategory(x: unknown): x is Category {
  return isObj(x) && isStr(x.id) && x.id.length > 0 && isStr(x.name) && isStr(x.createdAt);
}

const validatePrefs = (x: unknown): x is AccountPrefs =>
  isObj(x) && isStr(x.practiceCategory) && isStrOrNull(x.lastAddCategory);

export function validateAccount(x: unknown): x is Account {
  return isObj(x) && isStr(x.email) && isStr(x.createdAt) &&
    Array.isArray(x.words) && x.words.every(validateWord) &&
    Array.isArray(x.categories) && x.categories.every(validateCategory) &&
    validatePrefs(x.prefs);
}

export function validateDB(x: unknown): x is DB {
  return isObj(x) && x.version === 2 && isStrOrNull(x.session) && isObj(x.accounts) &&
    Object.values(x.accounts).every(validateAccount);
}

/** v1 shapes (no categories / prefs, words without categoryId). */
function validateAccountV1(x: unknown): boolean {
  return isObj(x) && isStr(x.email) && isStr(x.createdAt) && Array.isArray(x.words) && x.words.every(validateWordBody);
}

function validateDBV1(x: unknown): boolean {
  return isObj(x) && x.version === 1 && isStrOrNull(x.session) && isObj(x.accounts) &&
    Object.values(x.accounts).every(validateAccountV1);
}

// ───────────────────────────── migration ─────────────────────────────
/** v1 account → v2: one built-in category, every word in it, default prefs. */
function upgradeAccountV1(acc: Record<string, unknown>): Account {
  const words = (acc.words as Record<string, unknown>[]).map((w) => ({ ...w, categoryId: UNCATEGORIZED_ID }) as unknown as Word);
  return {
    email: acc.email as string,
    createdAt: acc.createdAt as string,
    words,
    categories: [uncategorized(acc.createdAt as string)],
    prefs: defaultPrefs(),
  };
}

/**
 * Repair referential problems in a structurally valid account: make sure the built-in
 * category exists with its fixed name, drop duplicate category ids, and move words whose
 * category is missing into Uncategorized. Returns the same object when nothing changed.
 */
export function normalizeAccount(acc: Account): Account {
  let changed = false;
  const seen = new Set<string>();
  const categories: Category[] = [];
  for (const c of acc.categories) {
    if (seen.has(c.id)) { changed = true; continue; }
    seen.add(c.id);
    if (c.id === UNCATEGORIZED_ID && c.name !== UNCATEGORIZED_NAME) {
      categories.push({ ...c, name: UNCATEGORIZED_NAME });
      changed = true;
    } else categories.push(c);
  }
  if (!seen.has(UNCATEGORIZED_ID)) {
    categories.unshift(uncategorized(acc.createdAt));
    seen.add(UNCATEGORIZED_ID);
    changed = true;
  }
  const words = acc.words.map((w) => {
    if (seen.has(w.categoryId)) return w;
    changed = true;
    return { ...w, categoryId: UNCATEGORIZED_ID };
  });
  return changed ? { ...acc, categories, words } : acc;
}

/** Upgrade older documents to the current version. Refuses unknown versions rather than corrupt them. */
export function migrate(raw: unknown): DB | null {
  if (!raw || typeof raw !== "object") return null;
  const version = (raw as { version?: unknown }).version;
  switch (version) {
    case 1: {
      if (!validateDBV1(raw)) return null;
      const v1 = raw as { accounts: Record<string, Record<string, unknown>>; session: string | null };
      const accounts: Record<string, Account> = {};
      for (const [k, a] of Object.entries(v1.accounts)) accounts[k] = upgradeAccountV1(a);
      return { version: 2, accounts, session: v1.session };
    }
    case 2: {
      if (!validateDB(raw)) return null;
      const accounts: Record<string, Account> = {};
      for (const [k, a] of Object.entries(raw.accounts)) accounts[k] = normalizeAccount(a);
      return { ...raw, accounts };
    }
    default:
      return null;
  }
}

// ───────────────────────────── persistence ─────────────────────────────
let memoryOnly = false;
let memoryCopy: string | null = null;

/** False once localStorage has failed; data then lives only in memory for this tab. */
export const storageAvailable = (): boolean => !memoryOnly;

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

// ───────────────────────────── accounts ─────────────────────────────
export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;

const newAccount = (email: string): Account => {
  const t = now();
  return { email, createdAt: t, words: [], categories: [uncategorized(t)], prefs: defaultPrefs() };
};

/** Open (and silently create) the account for `email` and make it the session. */
export function openAccount(db: DB, email: string): DB {
  const key = normalizeEmail(email);
  const accounts = db.accounts[key] ? db.accounts : { ...db.accounts, [key]: newAccount(key) };
  return { ...db, accounts, session: key };
}

export const closeSession = (db: DB): DB => ({ ...db, session: null });

export function deleteAccount(db: DB, email: string): DB {
  const accounts = { ...db.accounts };
  delete accounts[email];
  return { ...db, accounts, session: db.session === email ? null : db.session };
}

function withAccount(db: DB, email: string, fn: (acc: Account) => Account): DB {
  const acc = db.accounts[email];
  if (!acc) return db;
  const next = fn(acc);
  return next === acc ? db : { ...db, accounts: { ...db.accounts, [email]: next } };
}

function withWords(db: DB, email: string, fn: (words: Word[]) => Word[]): DB {
  return withAccount(db, email, (acc) => ({ ...acc, words: fn(acc.words) }));
}

export const setPrefs = (db: DB, email: string, patch: Partial<AccountPrefs>): DB =>
  withAccount(db, email, (acc) => {
    const prefs = { ...acc.prefs, ...patch };
    return prefs.practiceCategory === acc.prefs.practiceCategory && prefs.lastAddCategory === acc.prefs.lastAddCategory
      ? acc
      : { ...acc, prefs };
  });

// ───────────────────────────── categories ─────────────────────────────
/** Trim and collapse internal whitespace. */
export const cleanCategoryName = (s: string): string => s.trim().replace(/\s+/g, " ");

/** Comparison key for duplicate names: case-insensitive, whitespace collapsed. */
export const categoryKey = (s: string): string => cleanCategoryName(s).toLowerCase();

// JOURNEY.md › Microcopy › Allowed category characters (English only — user decision).
const CATEGORY_CHARS = /^[A-Za-z0-9 \-'&,.()/]+$/;

/** The reason a category name is not acceptable, or null when it is. `exceptId` allows a rename to its own name. */
export function categoryNameError(raw: string, categories: Category[], exceptId?: string): string | null {
  const name = cleanCategoryName(raw);
  if (!name) return "Enter a category name.";
  if (name.length > CATEGORY_NAME_MAX) return `Use ${CATEGORY_NAME_MAX} characters or fewer (${name.length}/${CATEGORY_NAME_MAX}).`;
  if (!CATEGORY_CHARS.test(name)) return "Use English letters, numbers, spaces and - ' & , . ( ) / only.";
  if (!/[A-Za-z0-9]/.test(name)) return "Include at least one letter or number.";
  const dup = findCategoryByName(categories, name);
  if (dup && dup.id !== exceptId) return `You already have a category called “${dup.name}”.`;
  return null;
}

export const findCategoryByName = (categories: Category[], name: string): Category | undefined => {
  const k = categoryKey(name);
  return categories.find((c) => categoryKey(c.name) === k);
};

export const getCategory = (acc: Account, id: string): Category | undefined => acc.categories.find((c) => c.id === id);

/** Uncategorized first, then A–Z. */
export function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort((a, b) => {
    if (a.id === UNCATEGORIZED_ID) return -1;
    if (b.id === UNCATEGORIZED_ID) return 1;
    return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
  });
}

export interface CategoryCount { total: number; practice: number; learned: number }

export function categoryCounts(acc: Account): Map<string, CategoryCount> {
  const m = new Map<string, CategoryCount>(acc.categories.map((c) => [c.id, { total: 0, practice: 0, learned: 0 }]));
  for (const w of acc.words) {
    const c = m.get(w.categoryId);
    if (!c) continue;
    c.total++;
    if (w.status === "practice") c.practice++;
    else c.learned++;
  }
  return m;
}

/** True when the account has categories beyond the built-in one (filters are hidden otherwise). */
export const hasUserCategories = (acc: Account): boolean => acc.categories.some((c) => c.id !== UNCATEGORIZED_ID);

/** Practice filter: the remembered id if it still exists, else "all". */
export const resolvePracticeCategory = (acc: Account): string =>
  acc.prefs.practiceCategory === ALL_CATEGORIES || getCategory(acc, acc.prefs.practiceCategory)
    ? acc.prefs.practiceCategory
    : ALL_CATEGORIES;

/** Add default: explicit request (e.g. ?category=), else the last used, else Uncategorized — whichever exists first. */
export function resolveAddCategory(acc: Account, requested?: string | null): string {
  for (const id of [requested, acc.prefs.lastAddCategory]) if (id && getCategory(acc, id)) return id;
  return UNCATEGORIZED_ID;
}

export function createCategory(db: DB, email: string, rawName: string): { db: DB; category: Category } {
  const acc = db.accounts[email];
  if (!acc) throw new Error("No such account.");
  const err = categoryNameError(rawName, acc.categories);
  if (err) throw new Error(err);
  const category: Category = { id: uuid(), name: cleanCategoryName(rawName), createdAt: now() };
  return { db: withAccount(db, email, (a) => ({ ...a, categories: [...a.categories, category] })), category };
}

export function renameCategory(db: DB, email: string, id: string, rawName: string): DB {
  if (id === UNCATEGORIZED_ID) throw new Error("The built-in category can't be renamed.");
  const acc = db.accounts[email];
  if (!acc || !getCategory(acc, id)) throw new Error("That category no longer exists.");
  const err = categoryNameError(rawName, acc.categories, id);
  if (err) throw new Error(err);
  const name = cleanCategoryName(rawName);
  return withAccount(db, email, (a) => ({ ...a, categories: a.categories.map((c) => (c.id === id ? { ...c, name } : c)) }));
}

/** Everything needed to undo a delete: the category and exactly the words that moved. */
export interface DeletedCategory {
  category: Category;
  wordIds: string[];
  prefs: AccountPrefs;
}

/** Delete a category; its words move to Uncategorized and remembered selections pointing at it reset. */
export function deleteCategory(db: DB, email: string, id: string): { db: DB; undo: DeletedCategory } {
  if (id === UNCATEGORIZED_ID) throw new Error("The built-in category can't be deleted.");
  const acc = db.accounts[email];
  const category = acc && getCategory(acc, id);
  if (!acc || !category) throw new Error("That category no longer exists.");
  const wordIds = acc.words.filter((w) => w.categoryId === id).map((w) => w.id);
  const moved = new Set(wordIds);
  const prefs: AccountPrefs = {
    practiceCategory: acc.prefs.practiceCategory === id ? ALL_CATEGORIES : acc.prefs.practiceCategory,
    lastAddCategory: acc.prefs.lastAddCategory === id ? UNCATEGORIZED_ID : acc.prefs.lastAddCategory,
  };
  const next = withAccount(db, email, (a) => ({
    ...a,
    categories: a.categories.filter((c) => c.id !== id),
    words: a.words.map((w) => (moved.has(w.id) ? { ...w, categoryId: UNCATEGORIZED_ID } : w)),
    prefs,
  }));
  return { db: next, undo: { category, wordIds, prefs: acc.prefs } };
}

/** Reverse deleteCategory: restore the category (same id + name) and re-assign the moved words still in Uncategorized. */
export function restoreCategory(db: DB, email: string, undo: DeletedCategory): DB {
  return withAccount(db, email, (a) => {
    if (getCategory(a, undo.category.id)) return a;
    // A same-name category created meanwhile would make a duplicate; give the restored one a distinct name.
    let name = undo.category.name;
    for (let n = 2; findCategoryByName(a.categories, name); n++) {
      const suffix = ` (${n})`;
      name = undo.category.name.slice(0, CATEGORY_NAME_MAX - suffix.length) + suffix;
    }
    const ids = new Set(undo.wordIds);
    const prefs: AccountPrefs = {
      practiceCategory: a.prefs.practiceCategory === ALL_CATEGORIES && undo.prefs.practiceCategory === undo.category.id
        ? undo.category.id : a.prefs.practiceCategory,
      lastAddCategory: a.prefs.lastAddCategory === UNCATEGORIZED_ID && undo.prefs.lastAddCategory === undo.category.id
        ? undo.category.id : a.prefs.lastAddCategory,
    };
    return {
      ...a,
      categories: [...a.categories, { ...undo.category, name }],
      words: a.words.map((w) => (ids.has(w.id) && w.categoryId === UNCATEGORIZED_ID ? { ...w, categoryId: undo.category.id } : w)),
      prefs,
    };
  });
}

// ───────────────────────────── words ─────────────────────────────
/** Comparison key for duplicates: case-insensitive, internal whitespace collapsed. */
export const wordKey = (w: string): string => w.trim().toLowerCase().replace(/\s+/g, " ");

export function findDuplicate(words: Word[], text: string): Word | undefined {
  const k = wordKey(text);
  return words.find((w) => wordKey(w.word) === k);
}

export type NewWordFields = Omit<Word, "id" | "status" | "stats" | "createdAt" | "updatedAt">;

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
  version: 2;
  exportedAt: string;
  account: Account;
}

export function exportAccount(acc: Account): string {
  const file: ExportFile = { app: "shobdo-practice", version: 2, exportedAt: now(), account: acc };
  return JSON.stringify(file, null, 2);
}

export type ImportMode = "merge" | "replace";

/** What an import file holds. `categories` is null for v1 files (they predate categories). */
export interface ImportPayload {
  words: Word[];
  categories: Category[] | null;
}

function pickAccount<T>(accounts: Record<string, T>, currentEmail: string): T {
  const accs = Object.values(accounts);
  const acc = accounts[currentEmail] ?? (accs.length === 1 ? accs[0] : undefined);
  if (!acc) throw new Error("This file holds several accounts and none of them is yours.");
  return acc;
}

const NOT_AN_EXPORT = "This file doesn't look like a ShobdoPractice export.";

/** Read an export file (or a whole DB document), v1 or v2. Throws a readable Error. */
export function parseImport(text: string, currentEmail: string): ImportPayload {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON. Choose a ShobdoPractice export (.json).");
  }
  if (isObj(data) && typeof data.version === "number" && data.version > 2) {
    throw new Error("This file was made by a newer version of ShobdoPractice and can't be imported.");
  }
  if (!isObj(data) || (data.version !== 1 && data.version !== 2)) throw new Error(NOT_AN_EXPORT);
  const v1 = data.version === 1;
  if (isObj(data.account)) {
    if (v1 ? !validateAccountV1(data.account) : !validateAccount(data.account)) {
      throw new Error(NOT_AN_EXPORT);
    }
    if (v1) return { words: upgradeAccountV1(data.account).words, categories: null };
    const acc = data.account as unknown as Account;
    return { words: acc.words, categories: acc.categories };
  }
  if (isObj(data.accounts)) {
    const db = migrate(data);
    if (!db) throw new Error(NOT_AN_EXPORT);
    const acc = pickAccount(db.accounts, currentEmail);
    return { words: acc.words, categories: v1 ? null : acc.categories };
  }
  throw new Error(NOT_AN_EXPORT);
}

export interface ImportResult {
  db: DB;
  added: number;
  updated: number;
  /** Categories created from the file. */
  created: number;
  /** File categories matched by name to an existing one. */
  merged: number;
  /** Imported words that fell back to Uncategorized (v1 file, or missing/invalid category). */
  uncategorized: number;
}

/**
 * merge: categories map by name (case-insensitive) onto existing ones, new names are created;
 *   for words matched by id then by text, the newer updatedAt wins whole-word (imported-wins takes
 *   the mapped category, except from a v1 file; existing-wins leaves the word untouched).
 * replace: the file's categories and words only (Uncategorized always ensured).
 */
export function importWords(db: DB, email: string, payload: ImportPayload, mode: ImportMode): ImportResult {
  const acc = db.accounts[email];
  const result: ImportResult = { db, added: 0, updated: 0, created: 0, merged: 0, uncategorized: 0 };
  if (!acc) return result;

  const base: Category[] = mode === "replace" ? [uncategorized(now())] : [...acc.categories];
  const idMap = new Map<string, string>(); // file category id → local id
  for (const c of payload.categories ?? []) {
    if (c.id === UNCATEGORIZED_ID || categoryKey(c.name) === categoryKey(UNCATEGORIZED_NAME)) {
      idMap.set(c.id, UNCATEGORIZED_ID);
      continue;
    }
    if (categoryNameError(c.name, []) !== null) continue; // invalid name → its words go to Uncategorized
    const existing = findCategoryByName(base, c.name);
    if (existing) {
      idMap.set(c.id, existing.id);
      if (mode === "merge" && acc.categories.includes(existing)) result.merged++;
      continue;
    }
    const id = base.some((b) => b.id === c.id) ? uuid() : c.id;
    base.push({ id, name: cleanCategoryName(c.name), createdAt: c.createdAt });
    idMap.set(c.id, id);
    result.created++;
  }

  /** Local category for an imported word, counting fallbacks. */
  const mapCategory = (w: Word): string => {
    const id = payload.categories ? idMap.get(w.categoryId) : undefined;
    if (id) return id;
    result.uncategorized++;
    return UNCATEGORIZED_ID;
  };

  let words: Word[];
  if (mode === "replace") {
    words = payload.words.map((w) => ({ ...w, categoryId: mapCategory(w) }));
    result.added = words.length;
  } else {
    words = [...acc.words];
    for (const w of payload.words) {
      const idx = words.findIndex((c) => c.id === w.id || wordKey(c.word) === wordKey(w.word));
      if (idx === -1) {
        words.push({ ...w, categoryId: mapCategory(w) });
        result.added++;
      } else if (w.updatedAt > words[idx].updatedAt) {
        const categoryId = payload.categories ? mapCategory(w) : words[idx].categoryId;
        words[idx] = { ...w, id: words[idx].id, categoryId };
        result.updated++;
      }
    }
  }

  const next = normalizeAccount({ ...acc, categories: base, words });
  const prefs: AccountPrefs = {
    practiceCategory: resolvePracticeCategory(next),
    lastAddCategory: next.prefs.lastAddCategory && getCategory(next, next.prefs.lastAddCategory) ? next.prefs.lastAddCategory : null,
  };
  result.db = { ...db, accounts: { ...db.accounts, [email]: { ...next, prefs } } };
  return result;
}
