// Port of bn_phonetic/test_bn_phonetic.py (plus sweep_cmu.validate).
// Not ported: test_thread_safety (JS is single-threaded) and the accuracy-floor tests
// that shell out to the Python benchmark scripts — parity with Python covers both.
import { afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest";
import * as bn from "../src/lib/bnPhonetic";
import { setNeuralDisabled } from "../src/lib/bnPhonetic/neural";
import { readJson, setupBn } from "./setup";

beforeAll(setupBn);

// ── sweep_cmu.validate ───────────────────────────────────────────────────────
const KAR = "ািীুূৃেৈোৌ";
const INDEP = "অআইঈউঊঋএঐওঔ";
const HAS = "্";
const ZWJ = "‍";
const CHECKS: [string, RegExp][] = [
  ["starts with vowel sign/hasanta/ং", new RegExp(`^[${KAR}${HAS}ংঃঁ]`)],
  ["vowel sign after independent vowel", new RegExp(`[${INDEP}][${KAR}]`)],
  ["two vowel signs in a row", new RegExp(`[${KAR}][${KAR}]`)],
  ["trailing hasanta", new RegExp(`${HAS}$`)],
  ["hasanta before vowel/ং", new RegExp(`${HAS}[${KAR}${INDEP}ংঃঁ]`)],
  ["double hasanta", new RegExp(`${HAS}${HAS}`)],
  ["vowel sign after ং", new RegExp(`ং[${KAR}${HAS}]`)],
  ["non-Bangla character", new RegExp(`[^ঀ-৿${ZWJ}]`)],
  ["hasanta on য় (not য়্য)", new RegExp(`য়${HAS}(?!য)`)],
  ["ZWJ not in র‍্য", new RegExp(`(?<!র)${ZWJ}|${ZWJ}(?!${HAS}য)`)],
];
export function validate(s: string): string[] {
  if (!s) return ["empty"];
  return CHECKS.filter(([, rx]) => rx.test(s)).map(([name]) => name);
}

// ── core regressions: words whose spelling must never drift ──────────────────
const GOLDEN: Record<string, string> = {
  // original examples
  computer: "কম্পিউটার", doctor: "ডক্টর", chair: "চেয়ার",
  // vowel alignment / British vowels
  teacher: "টিচার", market: "মার্কেট", message: "মেসেজ", office: "অফিস",
  glass: "গ্লাস", hospital: "হসপিটাল", football: "ফুটবল", mobile: "মোবাইল",
  // glides
  player: "প্লেয়ার", power: "পাওয়ার", quality: "কোয়ালিটি", music: "মিউজিক",
  sandwich: "স্যান্ডউইচ", software: "সফটওয়্যার", white: "হোয়াইট",
  language: "ল্যাঙ্গুয়েজ", equality: "ইকুয়ালিটি", graduate: "গ্র্যাজুয়েট",
  // clusters and boundaries
  international: "ইন্টারন্যাশনাল", understand: "আন্ডারস্ট্যান্ড",
  unemployment: "আনএমপ্লয়মেন্ট", complete: "কমপ্লিট", replace: "রিপ্লেস",
  problem: "প্রবলেম", transport: "ট্রান্সপোর্ট", fluency: "ফ্লুয়েন্সি",
  // silent letters
  island: "আইলান্ড", through: "থ্রু", knowledge: "নলেজ", honest: "অনেস্ট",
  rhythm: "রিদম",
  // IELTS vocabulary
  significant: "সিগনিফিকেন্ট", democracy: "ডিমক্রেসি", education: "এজুকেশন",
  artificial: "আর্টিফিশিয়াল", efficient: "ইফিশিয়েন্ট", sustainable: "সাস্টেইনেবল",
  approximately: "অ্যাপ্রক্সিমেটলি", duty: "ডিউটি", society: "সসাইটি",
  // out of dictionary
  decarbonisation: "ডিকার্বনাইজেশন", microplastics: "মাইক্রোপ্লাস্টিকস",
  greenwashing: "গ্রিনওয়াশিং", upskilling: "আপস্কিলিং",
};

describe("golden", () => {
  test.each(Object.entries(GOLDEN))("%s", (word, expected) => {
    expect(bn.transliterate(word)).toBe(expected);
  });
});

// ── pipeline sources ─────────────────────────────────────────────────────────
test.each([
  ["computer", "cmudict"], ["analyse", "british"], ["microplastics", "morphology"],
  ["smartwatch", "compound"], ["netizen", "neural"], ["IELTS", "override"],
  ["GDP", "acronym"], ["dhaka", "override"],
])("source of %s is %s", (word, src) => {
  expect(bn.pronounce(word).source).toBe(src);
});

test("pronunciation fields", () => {
  const p = bn.pronounce("Doctor");
  expect(p.word).toBe("Doctor");
  expect(p.bangla).toBe("ডক্টর");
  expect(p.arpabet).toBeTruthy();
  expect(p.reliable).toBe(true);
  expect(bn.pronounce("zorblaxian").reliable).toBe(false);
});

// ── text handling ────────────────────────────────────────────────────────────
test("text keeps punctuation, digits, hyphens", () => {
  expect(bn.transliterateText("Well-being matters, in 2026!")).toBe("ওয়েল-বিইং ম্যাটারস, ইন 2026!");
});

test.each([
  ["UK", "ইউকে"], ["GDP", "জিডিপি"], ["USA", "ইউএসএ"], ["AI", "এআই"],
  ["NASA", "নাসা"], ["I", "আই"],
])("acronym %s", (token, expected) => {
  expect(bn.transliterateText(token)).toBe(expected);
});

test("shouting text is read as words", () => {
  expect(bn.transliterateText("PLEASE HELP ME")).toBe("প্লিজ হেল্প মি");
});

test("contractions, possessives, camelCase", () => {
  expect(bn.transliterate("don't")).toBe("ডোন্ট");
  expect(bn.transliterate("It’s")).toBe("ইটস");
  expect(bn.transliterate("Bangladesh's")).toBe("বাংলাদেশেজ");
  expect(bn.transliterate("ChatGPT")).toBe("চ্যাটজিপিটি");
  expect(bn.transliterate("YouTube")).toBe("ইউটিউব");
});

test("analyzeText order", () => {
  expect(bn.analyzeText("The UK, AI and you.").map((p) => p.word)).toEqual(["The", "UK", "AI", "and", "you"]);
});

test("empty and non-alpha", () => {
  expect(bn.transliterate("")).toBe("");
  expect(bn.transliterate("2026")).toBe("2026");
  expect(bn.transliterateText("")).toBe("");
});

// ── overrides ────────────────────────────────────────────────────────────────
describe("overrides", () => {
  let before = new Map<string, string>();
  beforeEach(() => { before = new Map(bn.OVERRIDES); });
  afterEach(() => {
    bn.OVERRIDES.clear();
    for (const [k, v] of before) bn.OVERRIDES.set(k, v);
    bn.clearCache();
  });

  test("load from dict and JSON, replace keeps built-ins", () => {
    expect(bn.transliterate("hospital")).toBe("হসপিটাল");
    bn.loadOverrides({ Hospital: "হাসপাতাল" });
    expect(bn.transliterate("hospital")).toBe("হাসপাতাল"); // cache invalidated
    bn.loadOverrides(JSON.parse(JSON.stringify({ doctor: "ডাক্তার" })), { replace: true });
    expect(bn.transliterate("doctor")).toBe("ডাক্তার");
    expect(bn.transliterate("hospital")).toBe("হসপিটাল"); // replaced set dropped it
    expect(bn.transliterate("dhaka")).toBe("ঢাকা"); // built-ins survive replace
  });

  test("overrides.json is merged and '_' keys are ignored", () => {
    const file = readJson<Record<string, string>>("public/data/overrides.json");
    expect(bn.transliterate("englishjoy")).toBe(file.englishjoy);
    expect(bn.OVERRIDES.has("_comment")).toBe(false);
  });
});

// ── robustness ───────────────────────────────────────────────────────────────
test("works without the neural model", () => {
  setNeuralDisabled(true);
  try {
    const p = bn.pronounceUncached("zorblaxian");
    expect(p.source).toBe("rules");
    expect(p.bangla).toBeTruthy();
    expect(validate(p.bangla)).toEqual([]);
  } finally {
    setNeuralDisabled(false);
  }
});

test.each(["zzz", "qwrtp", "aaaaaa", "x", "rhythms", "strengths",
  "antidisestablishmentarianism", "pneumonoultramicroscopic"])("weird input %s is valid Bangla", (word) => {
  const out = bn.transliterate(word);
  expect(out).toBeTruthy();
  expect(validate(out)).toEqual([]);
});

test("dictionary sample is valid Bangla", async () => {
  const { dictionary } = await import("cmu-pronouncing-dictionary");
  const ws = [...new Set(Object.keys(dictionary).map((k) => k.replace(/\(\d+\)$/, "")).filter((w) => /^[a-z]+$/.test(w)))]
    .sort()
    .filter((_, i) => i % 25 === 0);
  const bad = ws.map((w) => [w, bn.transliterate(w)] as const).filter(([, b]) => validate(b).length);
  expect(bad.slice(0, 10)).toEqual([]);
});
