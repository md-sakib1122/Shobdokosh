// British phone fixes (port of _britishize).
import { align, type Group } from "./align";
import { endsWithAny, listEq, pySplit, stripDigits } from "./py";
import { isVowel } from "./tables";

/** Nudge US-only CMU vowels toward the British forms Bangladeshi learners use.
 * Works on a marked phone string ('|'/'+' boundaries are preserved). */
export function britishize(word: string, pron: string): string {
  const toks = pySplit(pron);
  const pos: number[] = [];
  toks.forEach((t, k) => { if (t !== "|" && t !== "+") pos.push(k); });
  const ph = pos.map((k) => toks[k]);
  const base = ph.map(stripDigits);
  const nb = base.length;
  const setp = (j: number, val: string) => { toks[pos[j]] = val; };

  // mobile, fragile, missile: -ile → আইল
  if (endsWithAny(word, ["ile", "iles"]) && word.length > 5 && nb >= 2) {
    const k = nb - (word.endsWith("ile") ? 2 : 3);
    if (k >= 0 && (base[k] === "AH" || base[k] === "IH") && ph[k].endsWith("0") && base[k + 1] === "L") setp(k, "AY2");
  }
  // dictionary, necessary: -ary EH R IY → ারি ; category, territory: -ory AO R IY → রি
  if (nb >= 3 && listEq(base.slice(-2), ["R", "IY"]) && !word.endsWith("rary")) {
    if (word.endsWith("ary") && base[nb - 3] === "EH") setp(nb - 3, "AH0");
    else if (word.endsWith("ory") && base[nb - 3] === "AO" && !ph[nb - 3].endsWith("1")) setp(nb - 3, "AH0");
  }
  // organisation / globalization: -iz- before -ation → আইজেশন
  if (/i[sz]ation/.test(word)) {
    for (let k = 0; k < nb - 3; k++) {
      if ((base[k] === "AH" || base[k] === "IH") && listEq(base.slice(k + 1, k + 4), ["Z", "EY", "SH"])) setp(k, "AY0");
    }
  }
  // British /j/ after T D N: duty ডিউটি, produce প্রোডিউস, nuclear নিউক্লিয়ার
  const vowelIdx: number[] = [];
  base.forEach((b, k) => { if (isVowel(b)) vowelIdx.push(k); });
  const [, groups] = align(word, vowelIdx.map((k) => (base[k] === "AH" ? ph[k] : base[k])));
  const grp = new Map<number, Group | null>();
  vowelIdx.forEach((k, idx) => grp.set(k, groups[idx]));
  const inserts: number[] = [];
  base.forEach((b, k) => {
    if (b === "UW" && k > 0 && ["T", "D", "N"].includes(base[k - 1]) && !(k > 1 && base[k - 2] === "S") &&
      (k + 1 === nb || base[k + 1] !== "W")) {
      const g = grp.get(k)?.[0] ?? "";
      if ((g.includes("u") || g === "ew" || g === "eu") && !g.includes("oo") && !g.includes("ou")) inserts.push(pos[k]);
    }
  });
  for (const at of inserts.reverse()) toks.splice(at, 0, "Y");
  return toks.join(" ");
}
