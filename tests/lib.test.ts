import { describe, expect, test, vi } from "vitest";
import { diffChars, isCorrect, normalizeAnswer } from "../src/lib/diff";
import { fetchDefinition, parseEntries } from "../src/lib/definition";
import { maskSentence } from "../src/lib/mask";
import { buildMeaningMap, lookupIn, parseMeaning } from "../src/lib/meaning";
import { pickVoice } from "../src/lib/speech";
import {
  ALL_CATEGORIES, UNCATEGORIZED_ID, addWord, categoryCounts, categoryNameError, createCategory, createWord,
  deleteCategory, emptyDB, exportAccount, findDuplicate, importWords, isValidEmail, migrate, normalizeEmail,
  openAccount, parseImport, recordAttempt, removeWord, renameCategory, resolveAddCategory, resolvePracticeCategory,
  restoreCategory, setPrefs, sortCategories, updateWord, validateDB, type DB, type NewWordFields,
} from "../src/lib/storage";

const fields = (word: string, categoryId = UNCATEGORIZED_ID): NewWordFields => ({
  word, categoryId, bnPronunciation: null, pronSource: null, pronReliable: true, bnMeaning: null,
  definition: null, partOfSpeech: null, audioUrl: null, sentence: null,
});

const A = "a@test.com";
const acc = (db: DB) => db.accounts[A];

describe("diff", () => {
  test("normalises before comparing", () => {
    expect(normalizeAnswer("  Look   UP ")).toBe("look up");
    expect(isCorrect(" Necessary ", "necessary")).toBe(true);
  });
  test("neccesary → extra c, missing s", () => {
    const ops = diffChars("neccesary", "necessary");
    expect(ops.filter((o) => o.type === "extra").map((o) => o.char)).toEqual(["c"]);
    expect(ops.filter((o) => o.type === "missing").map((o) => o.char)).toEqual(["s"]);
    expect(ops.filter((o) => o.type === "wrong")).toEqual([]);
  });
  test("a plain typo is one wrong letter", () => {
    expect(diffChars("cut", "cat")).toEqual([
      { type: "correct", char: "c" }, { type: "wrong", char: "u", expected: "a" }, { type: "correct", char: "t" },
    ]);
  });
  test("empty input → all missing", () => {
    expect(diffChars("", "ab").map((o) => o.type)).toEqual(["missing", "missing"]);
  });
});

describe("meaning", () => {
  const map = buildMeaningMap([
    { en: "true", bn: "সত্য (Adj.), প্রকৃত (Adj.)" }, { en: "airport", bn: "বিমানবন্দর" },
    { en: "look up", bn: "খোঁজা" }, { en: "Run", bn: "দৌড়ানো" }, { en: "run", bn: "চালানো" },
    { en: "city", bn: "শহর" }, { en: "make", bn: "তৈরি করা" }, { en: "box", bn: "বাক্স" },
  ]);
  test("duplicates merge with ', '", () => expect(map.get("run")).toBe("দৌড়ানো, চালানো"));
  test("exact and variants", () => {
    expect(lookupIn(map, "TRUE")?.lemma).toBeNull();
    expect(lookupIn(map, "air-port")?.bn).toBe("বিমানবন্দর");
    expect(lookupIn(map, "look-up")?.bn).toBe("খোঁজা");
  });
  test("lemma fallbacks", () => {
    expect(lookupIn(map, "cities")?.lemma).toBe("city");
    expect(lookupIn(map, "boxes")?.lemma).toBe("box");
    expect(lookupIn(map, "running")?.lemma).toBe("run");
    expect(lookupIn(map, "making")?.lemma).toBe("make");
    expect(lookupIn(map, "runs")?.lemma).toBe("run");
    expect(lookupIn(map, "zzzz")).toBeNull();
  });
  test("POS tags become chips", () => {
    expect(parseMeaning("সত্য (Adj.), প্রকৃত (Adj.), ঠিক")).toEqual([
      { text: "সত্য", tag: "Adj." }, { text: "প্রকৃত", tag: "Adj." }, { text: "ঠিক", tag: null },
    ]);
  });
});

describe("definition", () => {
  const sample = [{
    phonetics: [{ audio: "" }, { audio: "https://x/necessary-us.mp3" }, { audio: "https://x/necessary-uk.mp3" }],
    meanings: [
      { partOfSpeech: "noun", definitions: [{ definition: "A thing that is needed." }] },
      { partOfSpeech: "adjective", definitions: [{ definition: "Required.", example: "It is necessary to rest." }] },
    ],
  }];
  test("parses first meaning, first example, UK audio", () => {
    expect(parseEntries(sample)).toEqual({
      definition: "A thing that is needed.", partOfSpeech: "noun",
      example: "It is necessary to rest.", audioUrl: "https://x/necessary-uk.mp3",
    });
  });
  test("404 is notfound, network failure is error", async () => {
    const r404 = await fetchDefinition("x", { fetchImpl: vi.fn(async () => new Response("", { status: 404 })) });
    expect(r404.status).toBe("notfound");
    const err = await fetchDefinition("x", { fetchImpl: vi.fn(async () => { throw new TypeError("offline"); }) });
    expect(err.status).toBe("error");
    const ok = await fetchDefinition("x", { fetchImpl: vi.fn(async () => new Response(JSON.stringify(sample))) });
    expect(ok.status).toBe("ok");
  });
  test("times out via AbortController", async () => {
    const hang: typeof fetch = (_u, init) => new Promise((_, rej) =>
      init?.signal?.addEventListener("abort", () => rej(new DOMException("aborted", "AbortError"))));
    expect((await fetchDefinition("x", { fetchImpl: hang, timeoutMs: 20 })).status).toBe("error");
  });
});

describe("mask", () => {
  test("masks the word and inflections, case-insensitively", () => {
    expect(maskSentence("It is Necessary to rest.", "necessary")).toBe("It is ____ to rest.");
    expect(maskSentence("She was running late; he runs.", "run")).toBe("She was ____ late; he ____.");
    expect(maskSentence("Look up the word, then look it up.", "look up")).toBe("____ the word, then look it up.");
    expect(maskSentence("A runner ran.", "ran")).toBe("A runner ____.");
  });
});

describe("storage", () => {
  test("emails", () => {
    expect(normalizeEmail("  A@Test.COM ")).toBe("a@test.com");
    expect(isValidEmail("a@test.com")).toBe(true);
    expect(isValidEmail("a@test")).toBe(false);
  });
  test("accounts are created silently and kept separate", () => {
    let db = openAccount(emptyDB(), "A@test.com");
    expect(db.session).toBe("a@test.com");
    const w = createWord(fields("necessary"));
    expect(w.status).toBe("practice");
    db = addWord(db, "a@test.com", w);
    db = openAccount(db, "b@test.com");
    expect(db.accounts["b@test.com"].words).toEqual([]);
    db = openAccount(db, "a@test.com");
    expect(db.accounts["a@test.com"].words).toHaveLength(1);
    expect(findDuplicate(db.accounts["a@test.com"].words, " NECESSARY")?.id).toBe(w.id);
    db = updateWord(db, "a@test.com", w.id, { status: "all" });
    expect(db.accounts["a@test.com"].words[0].status).toBe("all");
    expect(validateDB(db)).toBe(true);
    expect(migrate(JSON.parse(JSON.stringify(db)))).toEqual(db);
    expect(migrate({ version: 2 })).toBeNull();
    expect(migrate({ version: 3, accounts: {}, session: null })).toBeNull();
    db = removeWord(db, "a@test.com", w.id);
    expect(db.accounts["a@test.com"].words).toEqual([]);
  });
  test("stats and streaks", () => {
    let s = { attempts: 0, correct: 0, streak: 0, lastPracticedAt: null as string | null };
    s = recordAttempt(s, true); s = recordAttempt(s, true); s = recordAttempt(s, false); s = recordAttempt(s, true);
    expect([s.attempts, s.correct, s.streak]).toEqual([4, 3, 1]);
    expect(s.lastPracticedAt).toBeTruthy();
  });
  test("export → import merge/replace with validation", () => {
    let db = openAccount(emptyDB(), "a@test.com");
    db = addWord(db, "a@test.com", createWord(fields("alpha")));
    const file = exportAccount(db.accounts["a@test.com"]);
    let other = openAccount(emptyDB(), "c@test.com");
    other = addWord(other, "c@test.com", createWord(fields("beta")));
    const words = parseImport(file, "c@test.com");
    expect(words.categories).not.toBeNull();
    const merged = importWords(other, "c@test.com", words, "merge");
    expect(merged.added).toBe(1);
    expect(merged.db.accounts["c@test.com"].words.map((w) => w.word).sort()).toEqual(["alpha", "beta"]);
    const again = importWords(merged.db, "c@test.com", words, "merge");
    expect(again.added).toBe(0);
    const replaced = importWords(other, "c@test.com", words, "replace");
    expect(replaced.db.accounts["c@test.com"].words.map((w) => w.word)).toEqual(["alpha"]);
    expect(() => parseImport("{nope", "c@test.com")).toThrow(/JSON/);
    expect(() => parseImport(JSON.stringify({ version: 1, account: { email: 1 } }), "c@test.com")).toThrow(/look like/);
    expect(() => parseImport(JSON.stringify({ version: 3 }), "c@test.com")).toThrow(/newer version/);
  });
});

describe("categories", () => {
  const v1Doc = () => ({
    version: 1,
    session: A,
    accounts: {
      [A]: {
        email: A, createdAt: "2026-01-01T00:00:00.000Z",
        words: [(({ categoryId: _c, ...rest }) => rest)(createWord(fields("legacy")))],
      },
    },
  });

  test("a v1 document migrates losslessly into Uncategorized", () => {
    const raw = v1Doc();
    const db = migrate(JSON.parse(JSON.stringify(raw)))!;
    expect(db.version).toBe(2);
    expect(validateDB(db)).toBe(true);
    expect(acc(db).categories.map((c) => c.id)).toEqual([UNCATEGORIZED_ID]);
    expect(acc(db).words[0].word).toBe("legacy");
    expect(acc(db).words[0].categoryId).toBe(UNCATEGORIZED_ID);
    expect(acc(db).prefs).toEqual({ practiceCategory: ALL_CATEGORIES, lastAddCategory: null });
    expect(migrate({ ...raw, accounts: { [A]: { email: A } } })).toBeNull(); // invalid v1 is refused
  });

  test("v2 repair: missing built-in and dangling category ids", () => {
    let db = openAccount(emptyDB(), A);
    db = addWord(db, A, createWord(fields("orphan", "gone")));
    const broken = JSON.parse(JSON.stringify(db));
    broken.accounts[A].categories = [];
    const fixed = migrate(broken)!;
    expect(acc(fixed).categories.map((c) => c.name)).toEqual(["Uncategorized"]);
    expect(acc(fixed).words[0].categoryId).toBe(UNCATEGORIZED_ID);
    broken.accounts[A].categories = "nope";
    expect(migrate(broken)).toBeNull(); // structurally invalid v2 is refused
  });

  test("name rules", () => {
    let db = openAccount(emptyDB(), A);
    db = createCategory(db, A, "  IELTS   Band 7 ").db;
    const cats = acc(db).categories;
    expect(cats[1].name).toBe("IELTS Band 7");
    expect(categoryNameError("", cats)).toMatch(/name/);
    expect(categoryNameError("x".repeat(41), cats)).toMatch(/40/);
    expect(categoryNameError("শব্দ", cats)).toMatch(/English/);
    expect(categoryNameError("---", cats)).toMatch(/letter/);
    expect(categoryNameError("ielts band 7", cats)).toMatch(/already/);
    expect(categoryNameError("uncategorized", cats)).toMatch(/already/);
    expect(categoryNameError("ielts BAND 7", cats, cats[1].id)).toBeNull(); // own-name case change
    expect(categoryNameError("Food & Drink (A/B) - it's", cats)).toBeNull();
    expect(() => createCategory(db, A, "IELTS band 7")).toThrow(/already/);
  });

  test("create, rename, sort, count", () => {
    let db = openAccount(emptyDB(), A);
    const food = createCategory(db, A, "Food"); db = food.db;
    const travel = createCategory(db, A, "travel"); db = travel.db;
    db = addWord(db, A, createWord(fields("apple", food.category.id)));
    db = addWord(db, A, createWord(fields("bread", food.category.id)));
    db = updateWord(db, A, acc(db).words[0].id, { status: "all" });
    expect(sortCategories(acc(db).categories).map((c) => c.name)).toEqual(["Uncategorized", "Food", "travel"]);
    expect(categoryCounts(acc(db)).get(food.category.id)).toEqual({ total: 2, practice: 1, learned: 1 });
    db = renameCategory(db, A, travel.category.id, "Travel");
    expect(acc(db).categories.find((c) => c.id === travel.category.id)!.name).toBe("Travel");
    expect(() => renameCategory(db, A, travel.category.id, "food")).toThrow(/already/);
    expect(() => renameCategory(db, A, UNCATEGORIZED_ID, "Misc")).toThrow(/built-in/);
  });

  test("delete moves words to Uncategorized, resets prefs, and undo restores exactly", () => {
    let db = openAccount(emptyDB(), A);
    const food = createCategory(db, A, "Food"); db = food.db;
    db = addWord(db, A, createWord(fields("apple", food.category.id)));
    db = addWord(db, A, createWord(fields("loose")));
    db = setPrefs(db, A, { practiceCategory: food.category.id, lastAddCategory: food.category.id });
    const { db: after, undo } = deleteCategory(db, A, food.category.id);
    expect(acc(after).categories.map((c) => c.id)).toEqual([UNCATEGORIZED_ID]);
    expect(acc(after).words.every((w) => w.categoryId === UNCATEGORIZED_ID)).toBe(true);
    expect(acc(after).prefs).toEqual({ practiceCategory: ALL_CATEGORIES, lastAddCategory: UNCATEGORIZED_ID });
    const restored = restoreCategory(after, A, undo);
    expect(acc(restored).categories.find((c) => c.id === food.category.id)!.name).toBe("Food");
    expect(acc(restored).words.find((w) => w.word === "apple")!.categoryId).toBe(food.category.id);
    expect(acc(restored).words.find((w) => w.word === "loose")!.categoryId).toBe(UNCATEGORIZED_ID);
    expect(acc(restored).prefs).toEqual(acc(db).prefs);
    expect(() => deleteCategory(db, A, UNCATEGORIZED_ID)).toThrow(/built-in/);
    // undo after a same-name category was created meanwhile keeps names unique
    const clash = createCategory(after, A, "food").db;
    expect(sortCategories(acc(restoreCategory(clash, A, undo)).categories).map((c) => c.name)).toEqual(["Uncategorized", "food", "Food (2)"]);
  });

  test("remembered selections fall back when stale", () => {
    let db = openAccount(emptyDB(), A);
    const food = createCategory(db, A, "Food"); db = food.db;
    db = setPrefs(db, A, { practiceCategory: "missing", lastAddCategory: "missing" });
    expect(resolvePracticeCategory(acc(db))).toBe(ALL_CATEGORIES);
    expect(resolveAddCategory(acc(db))).toBe(UNCATEGORIZED_ID);
    expect(resolveAddCategory(acc(db), food.category.id)).toBe(food.category.id);
    db = setPrefs(db, A, { practiceCategory: food.category.id, lastAddCategory: food.category.id });
    expect(resolvePracticeCategory(acc(db))).toBe(food.category.id);
    expect(resolveAddCategory(acc(db), "bogus")).toBe(food.category.id);
  });

  test("import merge maps categories by name; collisions follow updatedAt", () => {
    // source account with categories "Food" and "Travel"
    let src = openAccount(emptyDB(), A);
    const sFood = createCategory(src, A, "Food"); src = sFood.db;
    const sTravel = createCategory(src, A, "Travel"); src = sTravel.db;
    src = addWord(src, A, createWord(fields("apple", sFood.category.id)));
    src = addWord(src, A, createWord(fields("plane", sTravel.category.id)));
    const shared = { ...createWord(fields("shared", sTravel.category.id)), updatedAt: "2026-06-01T00:00:00.000Z" };
    src = addWord(src, A, shared);
    const file = exportAccount(acc(src));

    // destination already has "FOOD" (different case) and an older copy of "shared"
    let dst = openAccount(emptyDB(), A);
    const dFood = createCategory(dst, A, "FOOD"); dst = dFood.db;
    dst = addWord(dst, A, { ...createWord(fields("shared", dFood.category.id)), updatedAt: "2026-01-01T00:00:00.000Z" });

    const r = importWords(dst, A, parseImport(file, A), "merge");
    const cats = acc(r.db).categories;
    expect(sortCategories(cats).map((c) => c.name)).toEqual(["Uncategorized", "FOOD", "Travel"]);
    expect([r.added, r.updated, r.created, r.merged, r.uncategorized]).toEqual([2, 1, 1, 1, 0]);
    const byWord = (w: string) => acc(r.db).words.find((x) => x.word === w)!;
    const travelId = cats.find((c) => c.name === "Travel")!.id;
    expect(byWord("apple").categoryId).toBe(dFood.category.id); // same-name → existing category
    expect(byWord("shared").categoryId).toBe(travelId); // imported wins → takes mapped category

    // existing wins → word left untouched, category included
    const newer = updateWord(dst, A, acc(dst).words[0].id, { sentence: "local" });
    const r2 = importWords(newer, A, parseImport(file, A), "merge");
    expect(acc(r2.db).words.find((x) => x.word === "shared")!.categoryId).toBe(dFood.category.id);
    expect(validateDB(r2.db)).toBe(true);
  });

  test("v1 export files import into Uncategorized; existing words keep their category", () => {
    let dst = openAccount(emptyDB(), A);
    const food = createCategory(dst, A, "Food"); dst = food.db;
    dst = addWord(dst, A, { ...createWord(fields("legacy", food.category.id)), updatedAt: "2000-01-01T00:00:00.000Z" });
    const v1Word = (({ categoryId: _c, ...rest }) => rest)(createWord(fields("legacy")));
    const fresh = (({ categoryId: _c, ...rest }) => rest)(createWord(fields("newone")));
    const file = JSON.stringify({ app: "shobdo-practice", version: 1, exportedAt: "x", account: { email: A, createdAt: "x", words: [v1Word, fresh] } });
    const payload = parseImport(file, A);
    expect(payload.categories).toBeNull();
    const r = importWords(dst, A, payload, "merge");
    expect([r.added, r.updated, r.uncategorized]).toEqual([1, 1, 1]);
    expect(acc(r.db).words.find((w) => w.word === "legacy")!.categoryId).toBe(food.category.id);
    expect(acc(r.db).words.find((w) => w.word === "newone")!.categoryId).toBe(UNCATEGORIZED_ID);
  });

  test("import replace swaps categories, keeps the built-in, and revalidates prefs", () => {
    let src = openAccount(emptyDB(), A);
    const s = createCategory(src, A, "Verbs"); src = s.db;
    src = addWord(src, A, createWord(fields("run", s.category.id)));
    src = addWord(src, A, createWord(fields("lost", "does-not-exist")));
    let dst = openAccount(emptyDB(), A);
    const d = createCategory(dst, A, "Old"); dst = d.db;
    dst = setPrefs(dst, A, { practiceCategory: d.category.id, lastAddCategory: d.category.id });
    const r = importWords(dst, A, parseImport(exportAccount(acc(src)), A), "replace");
    expect(sortCategories(acc(r.db).categories).map((c) => c.name)).toEqual(["Uncategorized", "Verbs"]);
    expect(acc(r.db).words.map((w) => w.word).sort()).toEqual(["lost", "run"]);
    expect(acc(r.db).words.find((w) => w.word === "lost")!.categoryId).toBe(UNCATEGORIZED_ID);
    expect(r.uncategorized).toBe(1);
    expect(acc(r.db).prefs).toEqual({ practiceCategory: ALL_CATEGORIES, lastAddCategory: null });
  });
});

describe("speech", () => {
  test("prefers en-GB, then any en-*", () => {
    const v = (lang: string) => ({ lang } as SpeechSynthesisVoice);
    expect(pickVoice([v("fr-FR"), v("en-US"), v("en-GB")])?.lang).toBe("en-GB");
    expect(pickVoice([v("fr-FR"), v("en_US")])?.lang).toBe("en_US");
    expect(pickVoice([v("fr-FR")])).toBeNull();
  });
});
