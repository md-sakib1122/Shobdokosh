// bn_phonetic — English → Bangla pronunciation script (TypeScript port of bn_phonetic.py).
//
// Pipeline (first hit wins): overrides → CMUdict → British spelling → morphology →
// compounds → neural G2P → grapheme rules. ALL-CAPS tokens are spelled as acronyms.
//
// `pronounce` is synchronous once `ensureReady()` has loaded CMUdict + overrides.json.
// `pronounceAsync` additionally loads the neural model the first time a word needs it.
import { britishize } from "./britishize";
import { american, cmu, known, loadCmu, vowelsOf } from "./cmu";
import { compound, detectMarks, morph, splitMarks } from "./morph";
import { isAlpha, isUpper, pyIn } from "./py";
import { graphemeFallback, parse, phonesToTokens, render } from "./render";
import { BUILTIN_OVERRIDES, LETTER_NAMES } from "./tables";
import { loadNeural, neural, neuralTried, setNeuralLoader, type ManifestEntry } from "./neural";

export type Source =
  | "override" | "cmudict" | "british" | "morphology" | "compound"
  | "neural" | "acronym" | "rules" | "passthrough";

export interface Pronunciation {
  word: string;
  bangla: string;
  arpabet: string | null; // phones used (null for override / acronym / rules)
  source: Source;
  reliable: boolean; // false for model guesses — show a "?" badge
}

const make = (word: string, bangla: string, arpabet: string | null, source: Source): Pronunciation => ({
  word, bangla, arpabet, source, reliable: !["neural", "rules", "passthrough"].includes(source),
});

// ───────────────────────────── overrides ─────────────────────────────
export const OVERRIDES = new Map<string, string>(Object.entries(BUILTIN_OVERRIDES));

/** Add curated spellings {"word": "বাংলা"}. Keys starting with '_' are ignored.
 * `replace` drops previously loaded entries (built-ins are kept). */
export function loadOverrides(data: Record<string, unknown>, { replace = false } = {}): number {
  const clean: [string, string][] = [];
  for (const [k, v] of Object.entries(data)) {
    const key = String(k).trim().toLowerCase();
    if (key && !String(k).startsWith("_")) clean.push([key, String(v).trim()]);
  }
  if (replace) {
    OVERRIDES.clear();
    for (const [k, v] of Object.entries(BUILTIN_OVERRIDES)) OVERRIDES.set(k, v);
  }
  for (const [k, v] of clean) OVERRIDES.set(k, v);
  clearCache();
  return clean.length;
}

// ───────────────────────────── acronyms ─────────────────────────────
export const spellLetters = (word: string): string =>
  [...word.toLowerCase()].map((c) => LETTER_NAMES[c] ?? c).join("");

const countW = (raw: string) => (raw.toUpperCase().match(/W/g) ?? []).length;

/** CMU stores many acronyms letter by letter (USA, CEO): one vowel per letter. */
function letterSpelled(raw: string, prons: string[]): boolean {
  if (!prons.length || raw.length > 6) return false;
  return vowelsOf(prons[0]).length === raw.length + 2 * countW(raw);
}

/** ALL-CAPS token: ≤3 letters are spelled (UN, AI, GDP, CEO); longer ones are read
 * as a word only if the dictionary has a word reading (NASA, NATO), else spelled. */
function acronym(raw: string, w: string, acronymsMode = true): Pronunciation | null {
  if (!(isUpper(raw) && raw.length > 1 && isAlpha(raw))) return null;
  const prons = cmu(w);
  if (letterSpelled(raw, prons)) return make(raw, spellLetters(w), null, "acronym");
  if (!acronymsMode) return null;
  if (raw.length >= 4 && prons.length) {
    if (vowelsOf(prons[0]).length < raw.length - countW(raw) * 2) return null; // read as a word
  }
  return make(raw, spellLetters(w), null, "acronym");
}

// ───────────────────────────── public API ─────────────────────────────
const ALPHA = /^[a-z]+(?:'[a-z]+)?$/;
const CAMEL = /[A-Z]?[a-z]+|[A-Z]+(?![a-z])/g;

function possessive(bangla: string): string {
  const last = bangla.slice(-1);
  if (pyIn(last, "সশজচ")) return bangla + "েজ"; // Bangladesh's → বাংলাদেশেজ
  return bangla + (pyIn(last, "টপকফথ") ? "স" : "জ");
}

const CACHE = new Map<string, Pronunciation>();
const CACHE_MAX = 100_000;
let neuralWanted = false; // a word reached step 6 before the model was loaded

export function clearCache(): void { CACHE.clear(); }

/** English word → Pronunciation. With acronyms=true (default) ALL-CAPS tokens are
 * treated as acronyms (GDP → জিডিপি). Requires `ensureReady()`. */
export function pronounce(word: string, acronyms = true): Pronunciation {
  const key = `${acronyms ? 1 : 0}${word}`;
  const hit = CACHE.get(key);
  if (hit) return hit;
  const outer = neuralWanted;
  neuralWanted = false;
  const p = pronounceUncached(word, acronyms);
  const wanted = neuralWanted;
  neuralWanted = outer || wanted;
  if (!wanted) {
    // a result that skipped the not-yet-loaded model is provisional: don't cache it
    if (CACHE.size >= CACHE_MAX) CACHE.clear();
    CACHE.set(key, p);
  }
  return p;
}

type Step = "morphology" | "compound" | "neural";

export function pronounceUncached(
  word: string, acronyms = true, order: Step[] = ["morphology", "compound", "neural"],
): Pronunciation {
  const raw = word.trim().replaceAll("’", "'");
  const w = raw.toLowerCase();
  if (!w) return make(word, "", null, "passthrough");
  const ov = OVERRIDES.get(w);
  if (ov !== undefined) return make(word, ov, null, "override");
  if (w.endsWith("'s") && OVERRIDES.has(w.slice(0, -2))) {
    return make(word, possessive(OVERRIDES.get(w.slice(0, -2))!), null, "override");
  }
  if (!ALPHA.test(w)) return make(word, raw, null, "passthrough");
  const acr = acronym(raw, w, acronyms);
  if (acr) return make(word, acr.bangla, null, "acronym");

  const kn = known(w);
  const parts = raw.match(CAMEL) ?? [];
  if (!kn && parts.length > 1 && parts.join("") === raw.replaceAll("'", "")) {
    const subs = parts.map((p) => pronounce(p, acronyms));
    const src: Source = subs.every((x) => x.reliable) ? "compound" : "neural";
    return make(word, subs.map((x) => x.bangla).join(""), null, src);
  }
  let pron: string | null;
  let src: Source;
  const bare = w.replaceAll("'", "");
  if (kn) {
    [pron, src] = kn;
  } else {
    pron = null;
    src = "rules";
    for (const name of order) {
      if (name === "morphology") pron = morph(bare);
      else if (name === "compound") pron = compound(bare);
      else if (name === "neural") {
        if (!neuralTried()) neuralWanted = true;
        const model = neural();
        if (model) pron = model.predict(american(bare));
      }
      if (pron) {
        src = name;
        break;
      }
    }
    if (!pron) return make(word, graphemeFallback(bare), null, "rules");
  }

  if (src === "cmudict" || src === "british") pron = detectMarks(bare, pron);
  const [clean, marks] = splitMarks(britishize(bare, pron));
  const bangla = render(phonesToTokens(bare, parse(clean), marks));
  return make(word, bangla, clean, src);
}

export const transliterate = (word: string): string => pronounce(word).bangla;
export const source = (word: string): Source => pronounce(word).source;

const WORD_RE = /[A-Za-z]+(?:['’][A-Za-z]+)*/g;

function shouting(text: string): boolean {
  const words = (text.match(WORD_RE) ?? []).filter((w) => w.length > 1);
  return words.length >= 3 && words.filter(isUpper).length / words.length > 0.6;
}

/** Every English word in `text`, in order — handy for per-word tooltips. */
export function analyzeText(text: string): Pronunciation[] {
  const acr = !shouting(text);
  return (text.match(WORD_RE) ?? []).map((m) => pronounce(m, acr));
}

/** Replace every English word with its Bangla pronunciation; punctuation, digits,
 * hyphens and spacing are kept (well-being → ওয়েল-বিইং). */
export function transliterateText(text: string): string {
  const acr = !shouting(text);
  return text.replace(WORD_RE, (m) => pronounce(m, acr).bangla);
}

// ───────────────────────────── loading ─────────────────────────────
let ready: Promise<void> | null = null;

const baseUrl = (): string => import.meta.env?.BASE_URL ?? "/";

/** Browser setup: CMUdict (lazy chunk), overrides.json, and the neural weights URL. */
export function ensureReady(): Promise<void> {
  ready ??= (async () => {
    const base = baseUrl();
    setNeuralLoader(async () => {
      const [m, b] = await Promise.all([
        fetch(`${base}data/g2p/manifest.json`).then((r) => {
          if (!r.ok) throw new Error(`manifest ${r.status}`);
          return r.json() as Promise<ManifestEntry[]>;
        }),
        fetch(`${base}data/g2p/weights.bin`).then((r) => {
          if (!r.ok) throw new Error(`weights ${r.status}`);
          return r.arrayBuffer();
        }),
      ]);
      return { manifest: m, buffer: b };
    });
    const overrides = fetch(`${base}data/overrides.json`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: Record<string, unknown>) => { loadOverrides(d); })
      .catch(() => undefined); // overrides are optional
    await Promise.all([loadCmu(), overrides]);
  })();
  ready.catch(() => { ready = null; }); // allow a retry after a failed load
  return ready;
}

/** Like `pronounce`, but loads the neural model the first time a word reaches step 6. */
export async function pronounceAsync(word: string): Promise<Pronunciation> {
  await ensureReady();
  neuralWanted = false;
  const p = pronounce(word);
  if (neuralWanted && !neuralTried()) {
    await loadNeural();
    clearCache(); // results computed without the model are stale now
    return pronounce(word);
  }
  return p;
}

/** Load everything up front (CMUdict, overrides, neural model). */
export async function warmup(): Promise<void> {
  await ensureReady();
  await loadNeural();
  clearCache();
  pronounce("warmup");
}

export { loadCmu, loadNeural, setNeuralLoader };
export { setNeuralDisabled } from "./neural";
