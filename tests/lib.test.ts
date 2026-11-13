import { describe, expect, test, vi } from "vitest";
import { diffChars, isCorrect, normalizeAnswer } from "../src/lib/diff";
import { fetchDefinition, parseEntries } from "../src/lib/definition";
import { maskSentence } from "../src/lib/mask";
import { buildMeaningMap, lookupIn, parseMeaning } from "../src/lib/meaning";
import { pickVoice } from "../src/lib/speech";
import {
  addWord, createWord, emptyDB, exportAccount, findDuplicate, importWords, isValidEmail, migrate,
  normalizeEmail, openAccount, parseImport, recordAttempt, removeWord, updateWord, validateDB, type NewWordFields,
} from "../src/lib/storage";

const fields = (word: string): NewWordFields => ({
  word, bnPronunciation: null, pronSource: null, pronReliable: true, bnMeaning: null,
  definition: null, partOfSpeech: null, audioUrl: null, sentence: null,
});

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
    const merged = importWords(other, "c@test.com", words, "merge");
    expect(merged.added).toBe(1);
    expect(merged.db.accounts["c@test.com"].words.map((w) => w.word).sort()).toEqual(["alpha", "beta"]);
    const again = importWords(merged.db, "c@test.com", words, "merge");
    expect(again.added).toBe(0);
    const replaced = importWords(other, "c@test.com", words, "replace");
    expect(replaced.db.accounts["c@test.com"].words.map((w) => w.word)).toEqual(["alpha"]);
    expect(() => parseImport("{nope", "c@test.com")).toThrow(/JSON/);
    expect(() => parseImport(JSON.stringify({ version: 1, account: { email: 1 } }), "c@test.com")).toThrow(/schema/);
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
