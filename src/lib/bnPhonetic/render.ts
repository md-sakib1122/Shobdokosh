// Phones → Bangla: vowel resolution, tokenisation and conjunct-aware rendering.
import { align, type Group } from "./align";
import { endsWithAny, pyIn, pySlice, pySplit } from "./py";
import {
  CONJUNCTS, CONSONANTS, FINAL_ONLY_CONJUNCTS, HASANTA, UNSTRESSED_CONJUNCTS,
  VOWEL_FORMS, W_FORMS, ZWJ, isVowel, type Forms,
} from "./tables";

/** [phone, stress digit or ""] */
export type Phone = [string, string];

export function parse(pron: string): Phone[] {
  return pySplit(pron).map((ph) => {
    const m = /^([A-Z]+)(\d?)/.exec(ph);
    if (!m) throw new Error(`bad phone: ${ph}`);
    return [m[1], m[2]];
  });
}

/** 'e' in a closed syllable (mark-et, pock-et, want-ed) or before -ge (college). */
export function closedE(word: string, grp: Group | null, nxt: string | null): boolean {
  if (!grp) return false;
  const after = word.slice(grp[1] + grp[0].length);
  if (nxt === "JH") return true;
  return after.length > 0 && !pyIn(after[0], "aeiouy") && (after.length === 1 || !pyIn(after[1], "aeiouy"));
}

const R_ING = /^(?:r(ing|ed|er|ers))$/;
const A_TAIL = /^(?:n(t|ts|ce|ces|cy|cies|tly)|cy|cies|ble|bles|bly|[^aeiou]e(ly|s|d|ness)?)$/;

/** Resolve one vowel phone in context → (independent, kar, glide, emits_R).
 * shared: this vowel shares its spelling group with the previous vowel (radio 'io'). */
export function vowelForms(
  word: string, phones: Phone[], i: number, grp: Group | null, shared = false,
): [string, string, string, boolean] {
  const [p, s] = phones[i];
  if (shared && grp && grp[0].length > 1) grp = [grp[0].slice(1), grp[1] + 1]; // influ-e-ncer
  const nxt = i + 1 < phones.length ? phones[i + 1][0] : null;
  const nxt2 = i + 2 < phones.length ? phones[i + 2][0] : null;
  const isLast = i === phones.length - 1;
  const g = grp ? grp[0] : "";
  let [indep, kar, glide]: Forms = VOWEL_FORMS[p];
  const rClosed = nxt === "R" && (nxt2 === null || !isVowel(nxt2));
  let age = g.includes("a") && (nxt === "JH" || (nxt === "N" && nxt2 === "JH")); // message, orange
  if (grp && g === "a" && s === "0") {
    // chocolate, private, palace (-aCe)
    const tail = word.slice(grp[1] + 1);
    age = age || (tail.length === 2 && tail[1] === "e");
  }
  if (grp && g === "ai" && s === "0") age = true; // captain, mountain

  const aringAhead = nxt === "R" && g === "a" && grp !== null && R_ING.test(word.slice(grp[1] + 1));
  if (p === "ER") {
    if (s === "0" && g.includes("o") && !g.includes("e") && !g.includes("ou")) {
      return ["অ", "", "য়", true]; // doctor → -অর
    }
    return ["আ", "া", "য়া", true];
  }

  // British bath-trap /ɑː/: glass, class, bath, chance, answer, plant, advantage
  const nxt3 = i + 3 < phones.length ? phones[i + 3][0] : null;
  const bath =
    ((nxt === "S" || nxt === "F") && (nxt2 === null || !isVowel(nxt2))) ||
    (nxt === "TH" && (nxt2 === null || nxt2 === "R")) ||
    (nxt === "N" && (nxt2 === "S" || nxt2 === "CH")) ||
    (nxt === "N" && nxt2 === "T" && (nxt3 === null || !isVowel(nxt3) ||
      (nxt3 === "IH" && i + 4 < phones.length && phones[i + 4][0] === "JH")));
  if (p === "AE" && bath) [indep, kar, glide] = ["আ", "া", "য়া"];
  // US merges marry/Mary: EH before R+vowel spelled 'a' → ্যা (parents, charity)
  if (p === "EH" && s === "1" && nxt === "R" && isVowel(nxt2) && g === "a" && i > 0 && !aringAhead) {
    [indep, kar, glide] = ["অ্যা", "্যা", "য়া"];
  }
  // cause, because, law: US AA spelled au/aw → British অ
  if (p === "AA" && (g === "au" || g === "aw")) [indep, kar, glide] = ["অ", "", "য়"];
  // train, sustain, entertain: ai → েই
  if (p === "EY" && g === "ai") [indep, kar, glide] = ["এই", "েই", "য়েই"];

  if (p === "AA" && g.includes("o") && !g.includes("a")) {
    [indep, kar, glide] = ["অ", "", "য়"]; // British o: doctor, office, shop
  } else if (p === "IY" && g === "ay" && isLast) {
    [indep, kar, glide] = ["এ", "ে", "য়ে"]; // monday, friday
  } else if (p === "AO") {
    if (["oa", "ou"].some((x) => g.includes(x))) [indep, kar, glide] = ["ও", "ো", "য়ো"]; // board, course
    const port = nxt === "R" && nxt2 !== null && !isVowel(nxt2) && i > 0 && phones[i - 1][0] === "P";
    if (((nxt === "R" && nxt2 === null) || port) && kar === "") {
      [indep, kar, glide] = ["ও", "ো", "য়ো"]; // door, four, airport
    }
  } else if (p === "AH") {
    if (s === "0") {
      const tail = grp ? word.slice(grp[1] + grp[0].length) : "";
      const prevP = i > 0 ? phones[i - 1][0] : null;
      if (g.includes("u") && (prevP === "JH" || prevP === "CH")) {
        [indep, kar, glide] = ["উ", "ু", "য়ু"]; // education এজুকেশন
      } else if ((g === "ia" || g === "ie") && (prevP === "SH" || prevP === "ZH" || prevP === "CH")) {
        const before = grp![1] >= 2 ? pySlice(word, grp![1] - 2, grp![1] - 1) : "";
        if (g === "ie") [indep, kar, glide] = ["ইয়ে", "িয়ে", "য়িয়ে"]; // efficient, ancient
        else if (before === "e" || before === "o" || before === "a") [indep, kar, glide] = ["অ্যা", "্যা", "য়া"]; // social
        else [indep, kar, glide] = ["ইয়া", "িয়া", "য়িয়া"]; // artificial, essential
      } else if (g === "a" && A_TAIL.test(tail)) {
        [indep, kar, glide] = ["এ", "ে", "য়ে"]; // significant, democracy, -able
      } else if (isLast && g === "o") {
        [indep, kar, glide] = ["ও", "ো", "য়ো"]; // auto|mation → অটোমেশন
      } else if (isLast) {
        [indep, kar, glide] = ["আ", "া", "য়া"]; // pizza, camera, India
      } else if (age) {
        [indep, kar, glide] = ["এ", "ে", "য়ে"]; // orange
      } else if (grp && g === "e" && grp[1] > 0 && word[grp[1] - 1] === "l" &&
        ["", "s", "d"].includes(word.slice(grp[1] + 1))) {
        [indep, kar, glide] = ["অ", "", "য়"]; // table, apple, noodles
      } else if (g.includes("o") || g === "au") {
        [indep, kar, glide] = ["অ", "", "য়"]; // computer, button, authority
      } else if (g.startsWith("e")) {
        [indep, kar, glide] = ["এ", "ে", "য়ে"]; // problem, student
      } else if (g.includes("i")) {
        [indep, kar, glide] = ["ই", "ি", "য়ি"]; // pencil, university
      } else if (g.includes("a") || g.includes("u")) {
        [indep, kar, glide] = ["আ", "া", "য়া"]; // hospital, minus
      } else {
        [indep, kar, glide] = ["অ", "", "য়"];
      }
      if (g === "a" && indep === "আ" && !isLast) indep = "অ্যা"; // about, adult
    }
  } else if (p === "IH" && s === "0" && i === 0 && g === "e" &&
    ((nxt === "K" && nxt2 === "S") || ((nxt === "N" || nxt === "M") && !isVowel(nxt2)))) {
    [indep, kar, glide] = ["এ", "ে", "য়ে"]; // explain → এক্স, environment → এন
  } else if (p === "IH" && s === "0" && (age || (g.startsWith("e") && closedE(word, grp, nxt))) &&
    phones.slice(0, i).some(([q]) => isVowel(q))) {
    [indep, kar, glide] = ["এ", "ে", "য়ে"]; // market, pocket, college (not re-/tele)
  }

  // -air / -ear / -eer : chair চেয়ার, near নিয়ার ; preparing, caring → েয়ারিং
  const aring = p === "EH" && nxt === "R" && g === "a" && grp !== null && R_ING.test(word.slice(grp[1] + 1));
  if ((p === "EH" || p === "AE") && (rClosed || aring)) {
    [indep, kar, glide] = ["এয়া", "েয়া", "য়েয়া"];
  } else if ((p === "IH" || p === "IY") && (rClosed || (
    nxt === "R" && grp !== null && (g === "e" || g === "ea" || g === "ee") &&
    /^r(e|a|ing)/.test(word.slice(grp[1] + g.length))))) {
    [indep, kar, glide] = ["ইয়া", "িয়া", "য়িয়া"]; // here, coherence, appearance
  }

  // diphthong before vowel or R: fire ফায়ার, power পাওয়ার, hour আওয়ার
  if (p === "AY" && rClosed) return ["আয়া", "ায়া", "য়ায়া", false];
  if (p === "AW" && rClosed) return ["আওয়া", "াওয়া", "য়াওয়া", false];
  if (isVowel(nxt) && !(p === "AY" && nxt === "AH" && word.includes("iet"))) {
    if (p === "AY") [indep, kar, glide] = ["আ", "া", "য়া"];
    else if (p === "AW") [indep, kar, glide] = ["আও", "াও", "য়াও"];
  }
  return [indep, kar, glide, false];
}

export class Tok {
  stress = ""; // stress digit of the vowel phone right after this consonant
  weakR = false; // র from unstressed ER: exercise এক্সারসাইজ, not এক্সার্সাইজ
  lastSyll = false; // the vowel after this consonant is the word's last vowel
  noReph = false;
  brk = false;
  constructor(public kind: "C" | "V", public text: string, public onset = false) {}
}

const GLIDE_R_ENDS = ["েয়া", "িয়া", "ায়া", "াওয়া", "এয়া", "ইয়া", "আয়া", "আওয়া", "োয়্যা", "ওয়্যা"];

const sameGroup = (a: Group | null, b: Group | null) => a !== null && b !== null && a[0] === b[0] && a[1] === b[1];

/** marks: phone index → '|' (word/prefix boundary: new onset, no cluster across,
 * vowel written independent after a consonant) or '+' (suffix: no cluster across). */
export function phonesToTokens(word: string, phones: Phone[], marks: Map<number, string> = new Map()): Tok[] {
  const vidx: number[] = [];
  phones.forEach(([p], k) => { if (isVowel(p)) vidx.push(k); });
  const [, groups] = align(word, vidx.map((k) => phones[k][0] + (phones[k][0] === "AH" ? phones[k][1] : "")));
  const grpOf = new Map<number, Group | null>();
  vidx.forEach((k, idx) => grpOf.set(k, groups[idx]));
  const sharedOf = new Map<number, boolean>();
  for (let k = 1; k < vidx.length; k++) sharedOf.set(vidx[k], groups[k] !== null && sameGroup(groups[k], groups[k - 1]));

  const toks: Tok[] = [];
  let seenVowel = false;
  let pendingBrk = false;
  let i = 0;
  const n = phones.length;
  const strongAt = [...marks.entries()].filter(([, m]) => m === "|").map(([k]) => k).sort((a, b) => a - b);

  const nextStrong = (k: number) => strongAt.find((b) => b > k) ?? n;
  const mark = (t: Tok) => {
    if (pendingBrk) {
      t.brk = true;
      pendingBrk = false;
    }
    return t;
  };
  const pushVowel = (text: string) => {
    if (text) toks.push(mark(new Tok("V", text)));
    else if (toks.length && toks[toks.length - 1].kind === "C") toks.push(mark(new Tok("V", ""))); // inherent vowel
    seenVowel = true;
  };
  const pushCons = (text: string) => {
    const t = mark(new Tok("C", text, !seenVowel));
    const j = i + 1;
    if (j < n && isVowel(phones[j][0])) {
      t.stress = phones[j][1];
      t.lastSyll = !phones.slice(j + 1).some(([q]) => isVowel(q));
    }
    // chair-type glides (এয়ার, ফায়ার, আওয়ার) never take reph: এয়ারপোর্ট
    const last = toks[toks.length - 1];
    if (text === "র" && last && last.kind === "V" && endsWithAny(last.text, GLIDE_R_ENDS)) t.noReph = true;
    toks.push(t);
  };
  const lastTok = () => toks[toks.length - 1];

  while (i < n) {
    const [p, s] = phones[i];
    const strong = marks.get(i) === "|";
    if (marks.has(i) && toks.length) {
      pendingBrk = true;
      if (strong) seenVowel = false;
    }
    let prevKind: "C" | "V" | null = toks.length ? lastTok().kind : null;
    const nxt = i + 1 < n ? phones[i + 1][0] : null;

    const seg = phones.slice(0, nextStrong(i)); // boundary acts as word end (more|over)
    if (isVowel(p)) {
      if (p === "AH" && s === "0" && i > 0 && phones[i - 1][0] === "AY" && word.includes("iet")) {
        i += 1; // society → সোসাইটি
        continue;
      }
      const [indep, kar, glide, emitR] = vowelForms(word, seg, i, grpOf.get(i) ?? null, sharedOf.get(i) ?? false);
      if (strong && prevKind === "C") {
        pushVowel(indep); // over|all → ওভারঅল
      } else if (prevKind === "C") {
        if (kar.startsWith("্যা") && lastTok().text === "র" && !(toks.length > 1 && toks[toks.length - 2].kind === "C")) {
          lastTok().text = "র" + ZWJ; // র‍্যা
        }
        pushVowel(kar);
      } else if (prevKind === "V") {
        const prevP = phones[i - 1][0];
        if ((prevP === "IY" || prevP === "IH") && (p === "OW" || p === "IH")) {
          pushVowel(p === "OW" ? "ও" : "ই"); // radio রেডিও, being বিইং
        } else {
          pushVowel(glide);
        }
      } else {
        pushVowel(indep);
      }
      if (emitR) {
        pushCons("র");
        lastTok().weakR = s === "0";
      }
      i += 1;
      continue;
    }

    if (p === "W" && i === 0 && word.startsWith("wh") && isVowel(nxt)) {
      pushCons("হ");
      prevKind = "C";
    }
    if ((p === "W" || p === "Y") && isVowel(nxt)) {
      const v = nxt!;
      const gw = grpOf.get(i + 1) ?? null;
      if (p === "W" && gw && gw[0].startsWith("u") && gw[0].length > 1) {
        grpOf.set(i + 1, [gw[0].slice(1), gw[1] + 1]); // conseq-ue-nce → e
      }
      if (prevKind === "C" && lastTok().text === "ং") prevKind = null; // Pyongyang → পিয়ংইয়াং
      const [, kar, glide, emitR] = vowelForms(word, seg, i + 1, grpOf.get(i + 1) ?? null);
      const rSpecial = kar === "েয়া" || kar === "িয়া";
      const qu = p === "W" && prevKind === "C" && ["ক", "গ", "ঙ্গ"].includes(lastTok().text) &&
        !lastTok().onset && /[qg]u/.test(word);
      const front = v === "IH" || v === "IY";
      const back = v === "UW" || v === "UH";
      let text: string;
      if (p === "W" && prevKind === "V" && endsWithAny(lastTok().text, ["ু", "উ"])) {
        text = glide; // u + w-glide → য়
      } else if (qu) {
        text = front ? "ুই" : "ু" + glide; // equality, language
      } else if (p === "W") {
        const afterOnset = prevKind === "C" && lastTok().onset;
        if (rSpecial && front) text = afterOnset ? "ুইয়া" : "উইয়া"; // queer, weird
        else if (rSpecial) text = afterOnset ? "োয়্যা" : "ওয়্যা"; // software
        else text = afterOnset ? W_FORMS[v][1] : W_FORMS[v][0];
      } else if (prevKind === "C") {
        if (back) text = "িউ"; // music, computer
        else if (phones[i + 1][1] === "0" && (v === "AH" || v === "ER") && (grpOf.get(i + 1)?.[0] ?? "").includes("u")) {
          text = "ু"; // regular, popular
        } else text = "ি" + glide;
      } else if (prevKind === "V") {
        text = !back ? "য়" + kar : "ইউ"; // lawyer
      } else {
        text = back ? "ইউ" : "ই" + (rSpecial ? "য়া" : glide); // you, yes, year
      }
      pushVowel(text);
      if (emitR) {
        pushCons("র");
        lastTok().weakR = phones[i + 1][1] === "0";
      }
      i += 2;
      continue;
    }

    if (p === "W") { pushVowel("উ"); i += 1; continue; }
    if (p === "Y") { pushVowel("ই"); i += 1; continue; }

    // consonants
    const afterCj = i + 2 < n && isVowel(phones[i + 2][0]) ? phones[i + 2][1] : "";
    if (p === "N" && (nxt === "CH" || nxt === "JH") && (afterCj === "" || afterCj === "0")) {
      pushCons("ঞ");
    } else if (p === "NG") {
      if (nxt === "G") {
        const after = i + 2 < n ? phones[i + 2][0] : null;
        const after2 = i + 3 < n ? phones[i + 3][0] : null;
        const glideV = (after === "Y" || after === "W") && isVowel(after2); // angular
        pushCons(isVowel(after) || glideV ? "ঙ্গ" : "ং");
        i += 2;
        continue;
      }
      pushCons(isVowel(nxt) ? "ঙ্গ" : "ং");
    } else if (p === "Z" && i === n - 1 && word.endsWith("s") && prevKind === "C") {
      pushCons("স");
    } else if (p === "ZH") {
      const sion = nxt === "AH" && i + 2 < n && phones[i + 2][0] === "N";
      pushCons(sion ? "শ" : "জ");
    } else {
      const c = CONSONANTS[p];
      if (c === undefined) throw new Error(`unknown phone: ${p}`);
      pushCons(c);
    }
    i += 1;
  }
  return toks;
}

export function isFinalCluster(toks: Tok[], k: number): boolean {
  for (let j = k; j < toks.length; j++) {
    if (j > k && toks[j].brk) return true; // trans|port: segment end counts as word end
    if (toks[j].kind !== "C") return false;
  }
  return true;
}

const L_ONSET = new Set(["প", "ক", "ফ"]); // re-PLACE, in-CLUDE, in-FLAtion — but PROB-lem, PUB-lic

export function render(toks: Tok[]): string {
  const n = toks.length;
  const pair = (k: number): [Tok, Tok] | null => {
    if (k + 1 >= n || toks[k].kind !== "C" || toks[k + 1].kind !== "C" || toks[k + 1].brk) return null;
    return [toks[k], toks[k + 1]];
  };
  const lOnset = (k: number): boolean => {
    // consonant k + ল start a syllable: stressed, or after a coda
    const p = pair(k);
    if (!(p && p[1].text === "ল" && L_ONSET.has(p[0].text))) return false;
    const afterCoda = k > 0 && toks[k - 1].kind === "C" && !toks[k].brk;
    return p[1].stress === "1" || p[1].stress === "2" || afterCoda;
  };

  const out: string[] = [];
  toks.forEach((t, k) => {
    out.push(t.text);
    const p = pair(k);
    if (!p) return;
    const a = t.text;
    const b = p[1].text;
    if (a === "ং" || a === "ঙ্গ" || b === "ং") return;
    const reph = a.startsWith("র") && !t.onset && !t.noReph && !(t.weakR && p[1].stress === "1");
    let join: boolean;
    if (b.startsWith("র") || reph || t.onset) {
      join = true; // ra-phala, reph, word-initial cluster
    } else if (lOnset(k)) {
      join = true; // রিপ্লেস, ইনক্লুড
    } else if (lOnset(k + 1)) {
      join = false; // কমপ্লিট, এমপ্লয় (coda stays apart)
    } else {
      const key = `${a}|${b[0]}`;
      join = CONJUNCTS.has(key) ||
        (FINAL_ONLY_CONJUNCTS.has(key) && isFinalCluster(toks, k + 1)) ||
        (UNSTRESSED_CONJUNCTS.has(key) && p[1].stress === "0" && p[1].lastSyll);
    }
    if (join) out.push(HASANTA);
  });
  return out.join("");
}

// ───────────────────────────── grapheme fallback (OOV) ─────────────────────────────
const G_DIGRAPH: Record<string, string> = {
  sh: "শ", ch: "চ", th: "থ", ph: "ফ", ck: "ক", ng: "ং",
  gh: "গ", wh: "ও", qu: "কু", tch: "চ",
};
const G_CONS: Record<string, string> = {
  b: "ব", c: "ক", d: "ড", f: "ফ", g: "গ", h: "হ", j: "জ",
  k: "ক", l: "ল", m: "ম", n: "ন", p: "প", q: "ক", r: "র",
  s: "স", t: "ট", v: "ভ", w: "ও", x: "ক্স", z: "জ",
};
const G_VOW: Record<string, [string, string]> = {
  ee: ["ই", "ি"], ea: ["ই", "ি"], oo: ["উ", "ু"], ou: ["আউ", "াউ"],
  ai: ["এ", "ে"], ay: ["এ", "ে"], oa: ["ও", "ো"], a: ["আ", "া"],
  e: ["এ", "ে"], i: ["ই", "ি"], o: ["ও", "ো"], u: ["আ", "া"], y: ["ই", "ি"],
};
const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

export function graphemeFallback(word: string): string {
  let w = word.toLowerCase();
  if (w.length > 2 && w.endsWith("e") && !pyIn(w[w.length - 2], "aeiou")) w = w.slice(0, -1); // silent e
  const toks: Tok[] = [];
  let i = 0;
  let seenV = false;
  while (i < w.length) {
    let used = 1;
    for (const L of [3, 2, 1]) {
      const chunk = w.slice(i, i + L);
      if (has(G_VOW, chunk) && !(chunk === "y" && i === 0)) {
        const [indep, kar] = G_VOW[chunk];
        toks.push(new Tok("V", toks.length && toks[toks.length - 1].kind === "C" ? kar : indep));
        seenV = true;
        used = L;
        break;
      }
      if (has(G_DIGRAPH, chunk) || (L === 1 && has(G_CONS, chunk))) {
        let c = G_DIGRAPH[chunk] || G_CONS[chunk];
        const next = w.slice(i + 1, i + 2);
        if (chunk === "c" && ["e", "i", "y"].includes(next)) c = "স";
        if (chunk === "g" && ["e", "i"].includes(next)) c = "জ";
        if (chunk === "y") c = "য়";
        toks.push(new Tok("C", c, !seenV));
        used = L;
        break;
      }
    }
    i += used;
  }
  return render(toks);
}
