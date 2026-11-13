// CMUdict access (lazy-loaded npm package) + British spelling variants.
import { align } from "./align";
import { listEq } from "./py";
import { parse } from "./render";
import { isVowel } from "./tables";

let LOOKUP: Map<string, string[]> | null = null;
let loading: Promise<void> | null = null;

/** Build the word → [pron, ...] index the way `pronouncing` does (variants in order). */
export function buildLookup(dict: Record<string, string>): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const key of Object.keys(dict)) {
    const w = key.toLowerCase().replace(/\(\d+\)$/, "");
    const list = out.get(w);
    if (list) list.push(dict[key]);
    else out.set(w, [dict[key]]);
  }
  return out;
}

/** Load CMUdict on first use (dynamic import keeps it out of the login bundle). */
export function loadCmu(): Promise<void> {
  if (LOOKUP) return Promise.resolve();
  loading ??= import("cmu-pronouncing-dictionary").then((m) => {
    LOOKUP = buildLookup(m.dictionary);
  });
  return loading;
}

export const cmuLoaded = (): boolean => LOOKUP !== null;

/** pronouncing.phones_for_word */
function phonesForWord(word: string): string[] {
  if (!LOOKUP) throw new Error("CMUdict not loaded — await ensureReady() first");
  return LOOKUP.get(word.toLowerCase()) ?? [];
}

export const EXCLUDE = new Set<string>(); // test hook: pretend these words are out of dictionary

export function cmu(word: string): string[] {
  if (EXCLUDE.has(word)) return [];
  const out: string[] = [];
  for (let pr of phonesForWord(word)) {
    pr = pr.split("#")[0].trim(); // some entries carry '# abbrev'
    if (pr && !out.includes(pr)) out.push(pr);
  }
  return out;
}

export const vowelsOf = (pron: string): string[] => parse(pron).filter(([p]) => isVowel(p)).map(([p]) => p);

/** Vowel phones for alignment; AH keeps its stress digit (AH0 may be epenthetic). */
export const vowelsAh = (pron: string): string[] =>
  parse(pron).filter(([p]) => isVowel(p)).map(([p, s]) => (p === "AH" ? p + s : p));

export function bestVariant(spelling: string, prons: string[]): string {
  let best = prons[0];
  let bestKey = Infinity;
  for (const pr of prons) {
    const key = align(spelling, vowelsAh(pr))[0] - (pr === prons[0] ? 0.45 : 0.0);
    if (key < bestKey) {
      bestKey = key;
      best = pr;
    }
  }
  // same vowels, but a variant with /j/ exists → prefer it (news → নিউজ)
  const bv = vowelsOf(best);
  const sib = prons.find((pr) => listEq(vowelsOf(pr), bv) && ` ${pr} `.includes(" Y "));
  return sib ?? best;
}

// British → American spelling, tried only when the British form is missing from CMU
export const BRITISH_RULES: [RegExp, string][] = [
  [/isation/g, "ization"], [/is(e|es|ed|er|ers|ing)$/g, "iz$1"],
  [/ys(e|es|ed|ing)$/g, "yz$1"], [/(?<=[^aeiou])our/g, "or"],
  [/tre(s|d)?$/g, "ter$1"], [/bre(s)?$/g, "ber$1"],
  [/(?<=[aeiou])ll(ed|ing|er|ers)$/g, "l$1"], [/ence$/g, "ense"],
  [/ogue(s?)$/g, "og$1"], [/amme(s?)$/g, "am$1"],
  [/ae/g, "e"], [/oe(?=[a-z])/g, "e"],
];

export function american(word: string): string {
  let out = word;
  for (const [rx, rep] of BRITISH_RULES) out = out.replace(rx, rep);
  return out;
}

export function britishVariants(word: string): string[] {
  const seen = new Set([word]);
  const out: string[] = [];
  for (const [rx, rep] of BRITISH_RULES) {
    const v = word.replace(rx, rep);
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  const full = american(word);
  if (!seen.has(full)) out.push(full);
  return out;
}

/** CMU or British-variant hit → [best pron, source]. */
export function known(word: string): [string, "cmudict" | "british"] | null {
  let prons = cmu(word);
  if (prons.length) return [bestVariant(word, prons), "cmudict"];
  for (const v of britishVariants(word)) {
    prons = cmu(v);
    if (prons.length) return [bestVariant(word, prons), "british"];
  }
  return null;
}

