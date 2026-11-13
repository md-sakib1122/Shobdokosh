// Phone inventory and lookup tables — copied verbatim from bn_phonetic.py.

export const VOWELS = new Set([
  "AA", "AE", "AH", "AO", "AW", "AY", "EH", "ER", "EY",
  "IH", "IY", "OW", "OY", "UH", "UW",
]);

export const VOWELS_STRESSED = new Set(
  [...VOWELS].flatMap((v) => ["0", "1", "2"].map((d) => v + d)),
);

export const isVowel = (p: string | null | undefined): boolean => p != null && VOWELS.has(p);

export const CONSONANTS: Record<string, string> = {
  B: "ব", CH: "চ", D: "ড", DH: "দ", F: "ফ", G: "গ", HH: "হ",
  JH: "জ", K: "ক", L: "ল", M: "ম", N: "ন", NG: "ং", P: "প",
  R: "র", S: "স", SH: "শ", T: "ট", TH: "থ", V: "ভ", Z: "জ",
  ZH: "জ",
};

export type Forms = [indep: string, kar: string, glide: string];

// Default vowel forms: (independent, kar after consonant, glide after vowel)
export const VOWEL_FORMS: Record<string, Forms> = {
  AA: ["আ", "া", "য়া"], AE: ["অ্যা", "্যা", "য়া"], AH: ["আ", "া", "য়া"],
  AO: ["অ", "", "য়"], AW: ["আউ", "াউ", "য়াউ"], AY: ["আই", "াই", "য়াই"],
  EH: ["এ", "ে", "য়ে"], ER: ["আ", "া", "য়া"], EY: ["এ", "ে", "য়ে"],
  IH: ["ই", "ি", "য়ি"], IY: ["ই", "ি", "য়ি"], OW: ["ও", "ো", "য়ো"],
  OY: ["অয়", "য়", "য়"], UH: ["উ", "ু", "য়ু"], UW: ["উ", "ু", "য়ু"],
};

// W + vowel.  (independent/medial form, kar form after an onset consonant)
export const W_FORMS: Record<string, [string, string]> = {
  IH: ["উই", "ুই"], IY: ["উই", "ুই"], EH: ["ওয়ে", "োয়ে"], EY: ["ওয়ে", "োয়ে"],
  AE: ["ওয়্যা", "োয়্যা"], AA: ["ওয়া", "োয়া"], AH: ["ওয়া", "োয়া"], AO: ["ওয়া", "োয়া"],
  AY: ["ওয়াই", "োয়াই"], AW: ["ওয়াউ", "োয়াউ"], ER: ["ওয়া", "োয়া"], OW: ["ও", "ো"],
  UH: ["উ", "ু"], UW: ["উ", "ু"], OY: ["ওয়", "োয়"],
};

const pairs = (xs: [string, string][]) => new Set(xs.map(([a, b]) => `${a}|${b}`));

// Medial clusters Bangla loanword spelling actually writes as conjuncts.
export const CONJUNCTS = pairs([
  ["ন", "ট"], ["ন", "ড"], ["ন", "থ"], ["ঞ", "চ"], ["ঞ", "জ"],
  ["ম", "প"], ["ম", "ব"], ["ক", "ট"], ["ক", "স"], ["স", "ট"], ["স", "ক"],
  ["ল", "ট"], ["ল", "ড"], ["ল", "প"], ["ল", "ম"],
]);
export const UNSTRESSED_CONJUNCTS = pairs([["ন", "স"]]);
export const FINAL_ONLY_CONJUNCTS = pairs([["ল", "ক"], ["ল", "ফ"], ["প", "ট"], ["ন", "স"]]);

export const HASANTA = "্";
export const ZWJ = "‍";

// Spelling letters each vowel phone usually comes from (for alignment cost)
export const TYPICAL: Record<string, string> = {
  AA: "ao", AE: "a", AH: "aeoui", AO: "aou", AW: "ou",
  AY: "iy", EH: "ea", ER: "eioua", EY: "aei", IH: "iey",
  IY: "eiy", OW: "o", OY: "o", UH: "ou", UW: "ou",
};

export const LETTER_NAMES: Record<string, string> = {
  a: "এ", b: "বি", c: "সি", d: "ডি", e: "ই", f: "এফ", g: "জি",
  h: "এইচ", i: "আই", j: "জে", k: "কে", l: "এল", m: "এম", n: "এন",
  o: "ও", p: "পি", q: "কিউ", r: "আর", s: "এস", t: "টি", u: "ইউ",
  v: "ভি", w: "ডাবলিউ", x: "এক্স", y: "ওয়াই", z: "জেড",
};

// Only words the pipeline cannot derive (see bn_phonetic.py for the rationale).
export const BUILTIN_OVERRIDES: Record<string, string> = {
  // function words (weak forms)
  the: "দ্য", a: "আ", an: "অ্যান", of: "অফ", and: "অ্যান্ড", to: "টু",
  for: "ফর", or: "অর", are: "আর", were: "ওয়্যার", your: "ইওর",
  one: "ওয়ান", two: "টু", once: "ওয়ান্স",
  // irregular spelling-to-sound the rules misread
  colour: "কালার", color: "কালার", schedule: "শিডিউল", pizza: "পিৎজা",
  hello: "হ্যালো", genre: "জঁরা", debris: "ডেব্রি", biscuit: "বিস্কিট",
  lieutenant: "লেফটেন্যান্ট", television: "টেলিভিশন",
  environment: "এনভায়রনমেন্ট", environmental: "এনভায়রনমেন্টাল",
  government: "গভর্নমেন্ট", governments: "গভর্নমেন্টস", career: "ক্যারিয়ার",
  whereas: "হোয়্যারঅ্যাজ", america: "আমেরিকা", either: "আইদার", neither: "নাইদার", women: "উইমেন", woman: "উওম্যান",
  // well-known acronyms read as words or with a fixed form
  ielts: "আইইএলটিএস", toefl: "টোফেল", gre: "জিআরই", gmat: "জিম্যাট",
  unesco: "ইউনেস্কো", unicef: "ইউনিসেফ", nato: "ন্যাটো", nasa: "নাসা",
  covid: "কোভিড",
  // Bangladeshi proper nouns (silent letters / missing or wrong CMU entries)
  bangladesh: "বাংলাদেশ", dhaka: "ঢাকা", sylhet: "সিলেট", ayesha: "আয়েশা",
  chittagong: "চিটাগং", rajshahi: "রাজশাহী", khulna: "খুলনা", barisal: "বরিশাল",
  "cox's": "কক্সেস", padma: "পদ্মা", jamuna: "যমুনা", bangla: "বাংলা",
  bengali: "বেঙ্গলি", taka: "টাকা", rahman: "রহমান", hasina: "হাসিনা",
};
