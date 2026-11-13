// Spelling alignment: each vowel phone → one vowel-letter group (port of _align & co.).
import { pyIn } from "./py";
import { TYPICAL } from "./tables";

/** (text, start index) of a vowel-letter run. */
export type Group = readonly [text: string, start: number];

/** Maximal runs of vowel letters (y/w join a run when acting as vowels). */
export function vowelGroups(word: string): Group[] {
  const groups: Group[] = [];
  let i = 0;
  const n = word.length;
  while (i < n) {
    const ch = word[i];
    const isV = pyIn(ch, "aeiou") || (ch === "y" && i > 0 && !pyIn(word[i - 1], "aeiou"));
    if (!isV) {
      i += 1;
      continue;
    }
    const start = i;
    i += 1;
    while (i < n && pyIn(word[i], "aeiou")) i += 1;
    if (i < n && pyIn(word[i], "wy") && i > start) i += 1; // renew|able, play|er: w/y closes it
    groups.push([word.slice(start, i), start]);
  }
  return groups;
}

export function skipCost(word: string, g: Group): number {
  const [text, start] = g;
  const rest = word.slice(start + text.length);
  if (text === "e" && (rest === "" || rest === "s" || rest === "d")) {
    return rest === "" ? 0.1 : 0.3; // silent e / -es / -ed
  }
  return 1.0;
}

export function pairCost(word: string, g: Group, phone: string): number {
  const ph = phone.replace(/[012]+$/, "");
  const [text, start] = g;
  let c = [...TYPICAL[ph]].some((ch) => pyIn(ch, text)) ? 0.0 : 1.0;
  const after = word.slice(start + text.length);
  if (ph === "ER" && !pyIn("r", after.slice(0, 2))) c += 0.5; // ER should sit before an r
  if (pyIn(text, "io") && after.length === 2 && after[1] === "e" && !pyIn(after[0], "aeiouwy")) {
    // magic e (mobile, time, cake): prefer the long vowel
    if (["IH", "AH", "AE", "EH", "AA"].includes(ph)) c += 0.3;
    else if (ph === "IY" && text === "i") c += 0.15;
  }
  return c;
}

type Best = [cost: number, path: (number | null)[]];

/** Monotonic DP: each vowel phone → one spelling group; groups may be skipped
 * (silent) or shared by two phones (radio 'io' → IY OW). */
export function align(word: string, vphones: string[]): [number, (Group | null)[]] {
  const groups = vowelGroups(word);
  const n = vphones.length;
  const m = groups.length;
  if (m === 0) return [n, new Array(n).fill(null)];

  const memo = new Map<number, Best>();
  const best = (i: number, j: number, lastUsed: boolean): Best => {
    const key = (i * (m + 1) + j) * 2 + (lastUsed ? 1 : 0);
    const hit = memo.get(key);
    if (hit) return hit;
    let res: Best;
    if (i === n) {
      let s = 0;
      for (let k = j; k < m; k++) s += skipCost(word, groups[k]);
      res = [s, []];
    } else {
      const options: Best[] = [];
      if (j < m) {
        // assign phone i to group j
        const c = pairCost(word, groups[j], vphones[i]);
        let [sub, path] = best(i + 1, j + 1, true);
        options.push([c + sub, [j, ...path]]);
        [sub, path] = best(i, j + 1, false); // skip group j
        options.push([skipCost(word, groups[j]) + sub, path]);
      }
      if (vphones[i] === "AH0") {
        // epenthetic schwa: rhythm, -ism
        const [sub, path] = best(i + 1, j, lastUsed);
        options.push([0.45 + sub, [null, ...path]]);
      }
      if (lastUsed && j > 0) {
        // share previous group; sharing a one-letter group is unlikely (prism ≠ pri-sim)
        const c = (groups[j - 1][0].length > 1 ? 0.4 : 0.9) + pairCost(word, groups[j - 1], vphones[i]);
        const [sub, path] = best(i + 1, j, true);
        options.push([c + sub, [j - 1, ...path]]);
      }
      if (options.length === 0) {
        // out of groups
        res = [(n - i) * 1.5, new Array(n - i).fill(null)];
      } else {
        res = options[0];
        for (let k = 1; k < options.length; k++) if (options[k][0] < res[0]) res = options[k];
      }
    }
    memo.set(key, res);
    return res;
  };

  const [cost, path] = best(0, 0, false);
  return [cost, path.map((k) => (k !== null ? groups[k] : null))];
}
