// Morphology, compounds and boundary marks (port of _morph, _compound, _detect_marks).
import { cmu, known } from "./cmu";
import { listEq, pySplit, stripDigits } from "./py";
import { VOWELS_STRESSED, isVowel } from "./tables";

const PLURAL = "<PL>";
const PAST = "<PAST>";
const byLenDesc = <T extends [string, string]>(xs: T[]) => [...xs].sort((a, b) => b[0].length - a[0].length);

export const SUFFIXES = byLenDesc([
  ["ization", "AY0 Z EY1 SH AH0 N"], ["izations", "AY0 Z EY1 SH AH0 N Z"],
  ["isation", "AY0 Z EY1 SH AH0 N"], ["isations", "AY0 Z EY1 SH AH0 N Z"],
  ["fulness", "F AH0 L N AH0 S"], ["lessness", "L AH0 S N AH0 S"],
  ["ments", "M AH0 N T S"], ["ment", "M AH0 N T"], ["ness", "N AH0 S"],
  ["lessly", "L AH0 S L IY0"], ["less", "L AH0 S"], ["fully", "F AH0 L IY0"],
  ["ful", "F AH0 L"], ["ably", "AH0 B L IY0"], ["able", "AH0 B AH0 L"],
  ["izing", "AY2 Z IH0 NG"], ["ized", "AY2 Z D"], ["izes", "AY2 Z IH0 Z"], ["ize", "AY2 Z"],
  ["ising", "AY2 Z IH0 NG"], ["ised", "AY2 Z D"], ["ises", "AY2 Z IH0 Z"], ["ise", "AY2 Z"],
  ["isms", "IH2 Z AH0 M Z"], ["ism", "IH2 Z AH0 M"], ["ists", "IH0 S T S"], ["ist", "IH0 S T"],
  ["ships", "SH IH2 P S"], ["ship", "SH IH2 P"], ["hoods", "HH UH2 D Z"], ["hood", "HH UH2 D"],
  ["wise", "W AY2 Z"], ["wards", "W ER0 D Z"], ["ward", "W ER0 D"], ["like", "L AY2 K"],
  ["proof", "P R UW2 F"], ["ingly", "IH0 NG L IY0"], ["ings", "IH0 NG Z"], ["ing", "IH0 NG"],
  ["ers", "ER0 Z"], ["er", "ER0"], ["est", "AH0 S T"], ["ly", "L IY0"],
  ["ed", PAST], ["'s", PLURAL], ["es", PLURAL], ["s", PLURAL],
]);

export const PREFIXES = byLenDesc([
  ["counter", "K AW2 N T ER0"], ["inter", "IH2 N T ER0"], ["under", "AH2 N D ER0"],
  ["over", "OW2 V ER0"], ["super", "S UW2 P ER0"], ["hyper", "HH AY2 P ER0"],
  ["cyber", "S AY2 B ER0"], ["multi", "M AH2 L T IY0"], ["micro", "M AY2 K R OW0"],
  ["macro", "M AE2 K R OW0"], ["trans", "T R AE2 N S"], ["socio", "S OW2 S IY0 OW0"],
  ["eco", "IY2 K OW0"], ["bio", "B AY2 OW0"], ["geo", "JH IY2 OW0"], ["auto", "AO2 T OW0"],
  ["tele", "T EH2 L IH0"], ["anti", "AE2 N T IY0"], ["semi", "S EH2 M IY0"],
  ["mega", "M EH2 G AH0"], ["mini", "M IH2 N IY0"], ["post", "P OW2 S T"],
  ["non", "N AA2 N"], ["pre", "P R IY0"], ["mis", "M IH0 S"], ["dis", "D IH0 S"],
  ["out", "AW2 T"], ["up", "AH2 P"], ["sub", "S AH2 B"], ["un", "AH0 N"], ["re", "R IY0"], ["de", "D IY0"],
  ["co", "K OW0"], ["im", "IH0 M"], ["in", "IH0 N"], ["ir", "IH0"], ["il", "IH0"],
]);

const SIBILANT = new Set(["S", "Z", "SH", "ZH", "CH", "JH"]);
const VOICELESS = new Set(["P", "T", "K", "F", "TH", "S", "SH", "CH"]);

export function suffixPhones(kind: string, stemPron: string): string {
  const parts = pySplit(stemPron);
  const last = stripDigits(parts[parts.length - 1]);
  if (kind === PLURAL) return SIBILANT.has(last) ? "IH0 Z" : VOICELESS.has(last) ? "S" : "Z";
  if (kind === PAST) return last === "T" || last === "D" ? "IH0 D" : VOICELESS.has(last) ? "T" : "D";
  return kind;
}

export function stemCandidates(base: string): string[] {
  const c = [base];
  if (base && !"aeiouy".includes(base[base.length - 1])) c.push(base + "e"); // making → make
  if (base.length > 2 && base[base.length - 1] === base[base.length - 2] && !"aeiouls".includes(base[base.length - 1])) {
    c.push(base.slice(0, -1)); // running → run
  }
  if (base.endsWith("i")) c.push(base.slice(0, -1) + "y"); // happiness → happy
  return c;
}

export const plain = (pron: string): string[] =>
  pySplit(pron).filter((p) => p !== "|" && p !== "+").map(stripDigits);

// stem-changing suffixes: (suffix, stem ending, stem tail phones, new tail phones)
type StemRule = [string, string, string, string];
const STEM_CHANGE: StemRule[] = [
  ["ability", "able", "AH B AH L", "AH0 B IH1 L AH0 T IY0"],
  ["ibility", "ible", "AH B AH L", "AH0 B IH1 L AH0 T IY0"],
  ["ically", "ic", "", "L IY0"],
  ["ation", "ate", "EY T", "EY1 SH AH0 N"],
  ["ations", "ate", "EY T", "EY1 SH AH0 N Z"],
];
const STEM_CHANGE_LOOSE: StemRule[] = [
  ["ation", "", "", "EY1 SH AH0 N"], // transform-ation
  ["ation", "e", "", "EY1 SH AH0 N"], // explore-ation
  ["ity", "", "", "AH0 T IY0"], // neutral-ity
];

function stemPron(stem: string, depth: number): string | null {
  const hit = known(stem);
  return hit ? hit[0] : morph(stem, depth + 1);
}

/** Prefix/suffix decomposition onto a known stem. Returns a phone string with
 * boundary markers: '|' after a prefix, '+' before a consonant-initial suffix. */
export function morph(word: string, depth = 0): string | null {
  if (depth > 2 || word.length < 5) return null;
  const hit = stemChange(word, depth, STEM_CHANGE);
  if (hit) return hit;
  for (const [suf, kind] of SUFFIXES) {
    if (word.endsWith(suf) && word.length - suf.length >= 3) {
      for (const stem of stemCandidates(word.slice(0, -suf.length))) {
        const pron = stemPron(stem, depth);
        if (pron) {
          const add = suffixPhones(kind, pron);
          const joint = !VOWELS_STRESSED.has(pySplit(add)[0]) ? "+" : "";
          return `${pron} ${joint} ${add}`.replaceAll("  ", " ");
        }
      }
    }
  }
  for (const [pre, ph] of PREFIXES) {
    const rest = word.slice(pre.length);
    if (word.startsWith(pre) && rest.length >= (pre.length <= 2 ? 5 : 4)) {
      const pron = stemPron(rest, depth);
      if (pron) return `${ph} | ${pron}`;
    }
  }
  return stemChange(word, depth, STEM_CHANGE_LOOSE);
}

export function stemChange(word: string, depth: number, table: StemRule[]): string | null {
  for (const [suf, stemEnd, tail, newTail] of table) {
    if (word.endsWith(suf) && word.length - suf.length >= 3) {
      const pron = stemPron(word.slice(0, -suf.length) + stemEnd, depth);
      if (!pron) continue;
      let ph = pySplit(pron);
      const t = pySplit(tail);
      if (t.length) {
        if (!listEq(plain(ph.slice(-t.length).join(" ")), t)) continue;
        ph = ph.slice(0, -t.length);
      }
      return [...ph, ...pySplit(newTail)].join(" ");
    }
  }
  return null;
}

/** Split into two dictionary words. Both halves ≥ 4 letters and the right half must
 * start with a consonant. */
export function compound(word: string): string | null {
  let best: string | null = null;
  let bestScore = -1;
  for (let i = 4; i < word.length - 3; i++) {
    const left = word.slice(0, i);
    const right = word.slice(i);
    if ("aeiouy".includes(right[0])) continue;
    const lh = known(left);
    if (!lh) continue;
    const rh = known(right);
    const rp = rh ? rh[0] : morph(right, 2);
    if (rp) {
      const score = left.length ** 2 + right.length ** 2 + (rh ? 5 : 0);
      if (score > bestScore) {
        best = `${lh[0]} | ${rp}`;
        bestScore = score;
      }
    }
  }
  return best;
}

const skel = (ph: string | string[]): string[] =>
  (typeof ph === "string" ? plain(ph) : ph).map((p) => (isVowel(p) ? "V" : p));

/** For dictionary words, find prefix / compound / suffix boundaries whose phones match
 * exactly (ignoring stress). Conservative: no exact phone match, no mark. */
export function detectMarks(word: string, pron: string): string {
  const ph = plain(pron);
  const raw = pySplit(pron);
  const matchesRest = (k: number, prons: string[]) => {
    const tail = skel(ph.slice(k));
    return prons.some((r) => listEq(skel(r), tail));
  };
  let cutLeft: number | null = null;
  for (const [pre, pp] of PREFIXES) {
    const rest = word.slice(pre.length);
    if (word.startsWith(pre) && rest.length >= 4) {
      const k = pySplit(pp).length;
      if (listEq(skel(ph.slice(0, k)), skel(pp)) && matchesRest(k, cmu(rest))) {
        cutLeft = k;
        break;
      }
    }
  }
  if (cutLeft === null) {
    // both halves ≥ 4 letters: CMU lists junk like 'mer', 'ing'
    for (let i = 4; i < word.length - 3; i++) {
      if ("aeiouy".includes(word[i])) continue;
      const L = cmu(word.slice(0, i));
      const R = cmu(word.slice(i));
      if (!(L.length && R.length)) continue;
      for (const lp of L) {
        const k = pySplit(lp).length;
        if (listEq(skel(ph.slice(0, k)), skel(lp)) && matchesRest(k, R)) {
          cutLeft = k;
          break;
        }
      }
      if (cutLeft !== null) break;
    }
  }
  let cutRight: number | null = null;
  outer: for (const [suf, kind] of SUFFIXES) {
    if (word.endsWith(suf) && word.length - suf.length >= 3) {
      for (const stem of stemCandidates(word.slice(0, -suf.length))) {
        for (const sp of cmu(stem)) {
          const add = pySplit(suffixPhones(kind, sp));
          if (VOWELS_STRESSED.has(add[0])) continue;
          if (listEq(ph, [...plain(sp), ...plain(add.join(" "))])) {
            cutRight = ph.length - add.length;
            break outer;
          }
        }
      }
    }
  }
  const out: string[] = [];
  raw.forEach((p, k) => {
    if (k === cutLeft && k > 0) out.push("|");
    else if (k === cutRight && k > 0) out.push("+");
    out.push(p);
  });
  return out.join(" ");
}

export function splitMarks(pron: string): [string, Map<number, string>] {
  const clean: string[] = [];
  const marks = new Map<number, string>();
  for (const p of pySplit(pron)) {
    if (p === "|" || p === "+") {
      if (clean.length) marks.set(clean.length, p);
    } else clean.push(p);
  }
  return [clean.join(" "), marks];
}
