# ShobdoPractice

English spelling practice with **Bangla-script pronunciation** (`necessary → নেসেসারি`).
A React single-page app with no backend: accounts and words live in `localStorage`, and the
dictionaries are static files in `public/data/`.

- **Add** a word → Bangla spelling (TypeScript port of `bn_phonetic`), Bangla meaning
  (`E2Bdatabase.json`) and English definition + audio (dictionaryapi.dev) are looked up in parallel.
  You can edit any field before saving.
- **Practice**: See the Bangla spelling (or only listen), type the English spelling, and get a
  letter-by-letter diff when it's wrong. Optional hints; per-word stats; a "looks learned" prompt after 3 correct in a row.
- **All Words**: cards show only the Bangla spelling and 🔊; the English word stays hidden until you tap "Show word".
- **Settings**: export / import (.json, merge or replace), delete account.

## Setup

Requires Node 18+ (tested on Node 23).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/ — works from any static host or sub-folder
npm run preview    # serve dist/ locally
npm test           # unit + walkthrough + bn_phonetic parity tests (~3 min, parity runs on 4 workers)
```

`dist/` uses relative asset paths and a hash router (`/#/practice`), so it needs no server
rewrites. You can copy it anywhere.

## Python scripts

The original engine is extracted to `bn_phonetic/` (from `bn_phonetic.zip`). The scripts need
`pronouncing` and `numpy`:

```bash
python3 -m venv .venv
.venv/bin/pip install -r scripts/requirements.txt
```

| Script | What it does |
|---|---|
| `scripts/convert_checkpoint.py [npz]` | Reads `bn_phonetic/g2p_checkpoint.npz` and writes `public/data/g2p/weights.bin` (float32 arrays, little-endian, concatenated) and `manifest.json` (`[{name, shape, offset}]`, offset in bytes). |
| `scripts/make_golden.py` | Runs the **original Python** `bn_phonetic` (with `overrides.json` loaded) over every single-word `en` in `E2Bdatabase.json` plus the `english` column of both results CSVs. Writes `tests/golden.json` (`{word: bangla}`) and `tests/golden_sources.json` (`{word: source}`). Takes about 90 s. |

```bash
.venv/bin/python scripts/convert_checkpoint.py
.venv/bin/python scripts/make_golden.py
```

The Python reference suite still passes: `cd bn_phonetic && ../.venv/bin/python -m pytest -q` → 81 passed.

## bn_phonetic port & parity

`src/lib/bnPhonetic/` is a stage-by-stage port of `bn_phonetic.py` that keeps its function
boundaries:

| File | Python |
|---|---|
| `tables.ts` | phone inventory, `VOWEL_FORMS`, `W_FORMS`, conjunct sets, `TYPICAL`, letter names, built-in overrides |
| `align.ts` | `_vowel_groups`, `_skip_cost`, `_pair_cost`, `_align` (memoised DP) |
| `render.ts` | `_parse`, `_closed_e`, `_vowel_forms`, `_Tok`, `_phones_to_tokens`, `_is_final_cluster`, `_render`, `_grapheme_fallback` |
| `cmu.ts` | `_cmu` (lazy `import("cmu-pronouncing-dictionary")`, `word(2)` variants in order, `#` comments stripped), `_best_variant`, British rules, `_american`, `_british_variants`, `_known` |
| `morph.ts` | `_SUFFIXES`, `_PREFIXES`, `_STEM_CHANGE`, `_morph`, `_stem_change`, `_compound`, `_detect_marks`, `_split_marks` |
| `britishize.ts` | `_britishize` |
| `neural.ts` | `_NeuralG2P._cell` / `predict` on `Float32Array`s; loaded only when a word reaches step 6 |
| `index.ts` | `pronounce()` → `{word, bangla, arpabet, source, reliable}`, `transliterate`, `transliterateText`, `analyzeText`, `loadOverrides`, acronyms, possessives, camelCase |
| `py.ts` | helpers that keep Python semantics: substring `in`, slicing, `split()`, `isupper()` |

**Parity result: 85,172 / 85,179 = 99.992 % exact match** with the Python output (target ≥ 99.5 %).

All 7 mismatches come from differences between the two copies of CMUdict, not from the port.
The npm `cmu-pronouncing-dictionary@3` and the PyPI `cmudict` used by `pronouncing` differ on
38 of ~126k words: `jagged`, `interlocked`, `realism`, `lesbianism`, `worcestershire` and
`macrocosm` have other entries, and `indifferently` is missing from npm. Every stage, including
all 17,016 neural-G2P words, matches exactly.

`tests/bnPhonetic.test.ts` ports `test_bn_phonetic.py` (golden words, sources, fields, text,
acronyms, shouting, contractions/possessives/camelCase, overrides, no-neural fallback, weird
inputs, and a dictionary sample checked with a port of `sweep_cmu.validate`).

## Project layout

```
src/lib/bnPhonetic/   TS port (above)
src/lib/meaning.ts    E2Bdatabase lookup + IndexedDB cache
src/lib/definition.ts dictionaryapi.dev client (swap the provider here)
src/lib/speech.ts     speak(): saved audio → speechSynthesis en-GB/en-* @0.9
src/lib/storage.ts    localStorage DB, schema validation, migrate(), import/export
src/lib/diff.ts       Levenshtein alignment → ops[]
src/lib/lookup.ts     parallel lookups for Add + "Retry lookup"
src/lib/mask.ts       hides the target word in hint sentences
src/pages/            Login, Practice, AllWords, AddWord, Settings
src/components/       WordCard, PracticeCard, DiffView, HintPanel, WordDetails, …
public/data/          E2Bdatabase.json, overrides.json, g2p/{weights.bin,manifest.json}
scripts/              convert_checkpoint.py, make_golden.py
tests/                parity/ (4 shards), bnPhonetic, lib, walkthrough (§9 scenarios in jsdom)
```

## Decisions

Assumptions made where the brief was silent:

**Routing & build**
- `HashRouter` (`/#/practice`), together with Vite `base: "./"`, so `dist/` runs on any static
  host without rewrite rules.
- Tailwind CSS 3.4 (PostCSS config), Vite 6, Vitest 3.
- CMUdict (~4 MB) is a separate lazy chunk. Loading starts in the background right after login
  (not on the login screen), so it is ready, and the app still works, if the network drops later.
  The meaning dictionary is preloaded the same way. The neural weights (3.3 MB) are loaded only
  when a word actually reaches step 6.

**Data model**
- Two optional fields were added to `Word`. Both are validated on import, and old records
  without them stay valid:
  - `meaningLemma`: the lemma when the meaning was found through a lemma fallback, shown as "meaning of *x*".
  - `definitionStatus` (`ok` / `notfound` / `error`): tells "No definition found" (a 404, which is
    normal) apart from a failed request that deserves "Retry lookup".
- When you edit the Bangla spelling by hand, `pronSource` becomes `"user"` and `pronReliable` becomes `true`.
- Export holds the current account only: `{app, version: 1, exportedAt, account}`. Import also
  accepts a whole DB document. It uses the matching email, or the only account in the file.
- Merge import matches words by id, then by spelling (case-insensitive). The newer `updatedAt`
  wins. Replace import swaps the account's words for the file's.
- `migrate()` accepts version 1 and refuses unknown versions (the app then starts empty and does
  not overwrite anything until the first change).
- If `localStorage` throws, data is kept in memory and a banner says so.
- `crypto.randomUUID()` is used where available. Plain-http LAN hosts aren't a secure context,
  so there is a timestamp+random fallback.

**bn_phonetic**
- Phrases ("look up", "air-port") are pronounced word by word, keeping spaces and hyphens. The
  stored `pronSource` is the least reliable part's source.
- Python's `lru_cache` is replaced by a `Map`. A result computed while the neural model was still
  not loaded is not cached. `pronounceAsync()` loads the model and recomputes.
- GRU maths reads float32 weights and accumulates in float64. Numpy's BLAS summation order can't
  be reproduced exactly, but no neural word differs in the parity run.
- The input projections (`embedding · W_ihᵀ + b_ih`) are precomputed per token at load time. The
  result is unchanged and it cuts the cost by about 40 %.
- Python-only tests were not ported: thread safety, the subprocess accuracy benchmarks, and
  `_EXCLUDE`-based hold-out scripts. Parity with the Python output covers them.

**Meaning lookup**
- Duplicate keys are merged with `, ` and identical duplicates are dropped.
- The IndexedDB cache stores the parsed `Map` under `meaning-v1`. Bump the key in `meaning.ts`
  when the JSON changes.
- Lookup order is exact → spelling variants (remove hyphens/spaces, hyphen↔space) → lemma
  candidates: `-ies→y`, `-ied→y`, `-es`, `-s` (not `-ss`), and for `-ed`/`-ing`: undoubled
  consonant, bare stem, stem + `e`.
- `(Adj.)`-style tags are any short parenthesised suffix and are shown as chips. The first 5
  meanings are shown, with a "more" toggle.

**Definition API**
- The first meaning across all entries gives `definition` and `partOfSpeech`. The first
  `example` anywhere is the suggested sentence. Audio prefers a URL containing `-uk`, otherwise
  the first non-empty one. Protocol-relative URLs get `https:`.
- A 200 response with no definitions counts as "notfound".

**Practice**
- The diff is a weighted Levenshtein: insert/delete cost 1, substitution 1.5. A doubled or
  dropped letter shows as extra/missing (`neccesary` → extra `c`, missing `s`), while a single
  typo shows as one wrong letter (`cut` vs `cat`).
- Each diff state has its own colour **and** symbol/underline (✓, ✗ wavy underline with
  "→ should be", + strike-through, ^ dotted underline), plus a legend and a text summary.
- Every Check counts as an attempt. "Reveal" resets the streak (the answer was seen).
  "Try again" clears the input.
- "Practise" on a word starts at that word and continues through the list. "Shuffled session"
  randomises the order. Words moved out mid-session drop out of the queue.
- Moving a word back from All Words resets its streak, so the "looks learned" prompt needs 3 new correct answers.
- The sentence hint masks the word and its regular inflections (`run` → runs, running;
  `make` → making; `city` → cities) as `____`. Irregular forms such as `ran` are not masked.
  The definition hint is masked the same way.
- Listen mode auto-plays once per card. Ctrl+Space plays audio anywhere on the practice screen.

**Add word**
- Validation: after trimming and collapsing spaces, only letters, spaces, `-` and `'` (curly ’ is
  normalised), at least one letter, at most 60 characters.
- Save is always enabled. A lookup that hasn't finished or has failed is saved as `null` and
  offered for "Retry lookup" in Details.

**Speech**
- If the saved audio fails or is blocked, `speechSynthesis` is used. Voices are waited for up to 1 s
  (Chrome loads them asynchronously). With no English voice, a toast is shown, never an exception.

**Login**
- Email check: something@something.tld (2+ letter TLD). Accounts already on the device are offered as autocomplete suggestions.
