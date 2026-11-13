# Build prompt: "ShobdoPractice" — English word practice app with Bangla pronunciation

You are a senior frontend engineer. Build a complete, working **React single-page app with no backend**. Read this whole brief before writing code. Where the brief is silent, choose the simplest option and list your choice in the README under "Decisions".

---

## 1. Inputs I'm giving you

| File | What it is | How to use it |
|---|---|---|
| `E2Bdatabase.json` | ~103,650 entries, array of `{ "en": "...", "bn": "..." }`. 7.9 MB. Some `en` values are phrases (`"look up"`, `"air-port"`); some `bn` values carry POS tags like `সত্য (Adj.)`; 2 keys are duplicated. | Source of the **Bangla meaning**. Ship it as a static file in `public/data/`; never bundle it into JS. |
| `bn_phonetic/` (Python) | My English → Bangla-script pronunciation engine (`computer → কম্পিউটার`). Pipeline: overrides → CMUdict → British spelling → morphology → compounds → neural G2P (`g2p_checkpoint.npz`) → grapheme rules. Includes `overrides.json`, `test_bn_phonetic.py`, `results_ielts.csv`, `results_general.csv`. | Source of the **Bangla spelling**. Port it to TypeScript (section 5). **Do not invent your own transliteration rules.** |

---

## 2. Tech stack (fixed)

- Vite + React 18 + TypeScript (strict)
- React Router v6
- Tailwind CSS
- Vitest for tests
- No backend, no auth library, no server calls except the free dictionary API in section 6

"The database is JSON" means: the app's user data has a JSON schema (section 4) and lives in `localStorage`. Users can export and import it as a `.json` file. The static dictionaries are JSON files in `public/data/`.

---

## 3. Features

### 3.1 Login (email only, no password)
- One screen with a single email input. Pressing **Enter** opens that account.
- Normalize the email (trim, lowercase) and validate its format. If no account exists for that email, create an empty one silently.
- Remember the session in `localStorage`. Put a "Switch account" button in the header.
- Show a small note on the login screen: "No password — anyone on this device can open any account."

### 3.2 Add a word
- The input takes **only the English word or short phrase**, plus an optional **example sentence** field.
- On submit:
  1. Validate: letters, spaces, hyphen and apostrophe only, at most 60 characters. Block duplicates within the account (case-insensitive) and show a link to the existing word.
  2. Run these in parallel and show a preview card while they load:
     - **Bangla pronunciation**: `bnPhonetic.pronounce(word)` (section 5)
     - **Bangla meaning**: look the word up in `E2Bdatabase.json` (section 5.4)
     - **English definition** and audio URL: from the dictionary API (section 6)
  3. The user can edit any field on the preview card, then press **Save**.
- Save even if a lookup fails. Store the failed field as `null` and show a "Retry lookup" button on the word later.
- If the sentence is left empty and the API returns an example, pre-fill the sentence with it, labelled "suggested". The user can clear it.
- **New words always go into the Practice section.**

### 3.3 All Words section (dashboard)
- A grid of cards, one per word with `status: "all"`.
- Each card shows the **Bangla pronunciation spelling only**, large, plus a 🔊 button. The English word stays hidden until the user taps "Show word".
- Per card: "Move to Practice", "Details" (meaning, definition, sentence, edit, delete).
- Search box (matches English or Bangla), sort by newest / A–Z, count badge.

### 3.4 Practice section
- Lists words with `status: "practice"`. The user practises them one at a time or in a shuffled session.
- **Two prompt modes**, toggled per session:
  - **See**: shows the Bangla spelling and the 🔊 button
  - **Listen**: shows only the 🔊 button, which auto-plays once
- The user types the English spelling and presses **Check** (or Enter).
  - Compare after trimming, case-insensitively, with internal whitespace collapsed.
  - **Correct**: green state and a "Next" button.
  - **Wrong**: show a **character-level diff** of what they typed against the correct spelling. Use a Levenshtein alignment that marks each character as correct, wrong (substituted), missing or extra, in different colours, with a legend. Example: target `necessary`, typed `neccesary` → mark the extra `c` and the missing `s`. Then offer "Try again" and "Reveal".
- **Optional hints**, each opened by its own button, none shown by default:
  - Bangla meaning
  - English definition
  - Example sentence, **with the target word masked as `____`** so the hint doesn't give the answer away
- Stats per word: attempts, correct count, current streak, last practised.
- After **3 correct in a row**, show a non-blocking prompt: "Looks learned — move to All Words?" Also show a "Move to All Words" button on every practice word at all times. Nothing moves automatically.

### 3.5 Pronunciation playback
- Priority order: (1) the audio URL saved from the dictionary API, preferring a UK file (`-uk.mp3`), then any; (2) `speechSynthesis` with an `en-GB` voice if one exists, otherwise `en-*`, at rate 0.9.
- One shared `speak(word)` helper. Handle the case where there are no voices or audio is blocked: show a toast, don't throw.

### 3.6 Data portability
- Settings page: "Export my data (.json)", "Import (.json)" with schema validation and merge/replace options, "Delete account".

---

## 4. Data model (localStorage)

```ts
// key: "shobdo:v1"
interface DB {
  version: 1;
  accounts: Record<string /* normalized email */, Account>;
  session: string | null;            // current email
}
interface Account {
  email: string;
  createdAt: string;                  // ISO
  words: Word[];
}
interface Word {
  id: string;                         // crypto.randomUUID()
  word: string;                       // as typed, trimmed
  bnPronunciation: string | null;     // from bnPhonetic
  pronSource: string | null;          // override | cmudict | ... | rules
  pronReliable: boolean;              // false for neural/rules guesses → show a small "?" badge
  bnMeaning: string | null;           // from E2Bdatabase
  definition: string | null;          // first definition
  partOfSpeech: string | null;
  audioUrl: string | null;
  sentence: string | null;            // optional, user or suggested
  status: "practice" | "all";
  stats: { attempts: number; correct: number; streak: number; lastPracticedAt: string | null };
  createdAt: string;
  updatedAt: string;
}
```

- Put all reads and writes in `src/lib/storage.ts`, wrapped in try/catch. If storage is unavailable, keep the data in memory and show a banner.
- Add a `migrate()` stub keyed on `version`.

---

## 5. Bangla spelling: port `bn_phonetic.py` to TypeScript

This is the hardest part. Work slowly and test against the Python output.

### 5.1 Port
- Create `src/lib/bnPhonetic/` and translate **every stage** of `bn_phonetic.py` faithfully, keeping the same function boundaries and names (camelCase):
  - vowel-group alignment DP (`_align`), `_vowel_forms`, `_phones_to_tokens`, `_render` with its conjunct policy
  - British spelling rules, morphology (`_morph`, `_STEM_CHANGE`), compounds, `_detect_marks`, `_britishize`
  - acronyms, possessives, built-in overrides
  - `pronounce()` returning `{ word, bangla, arpabet, source, reliable }`, plus `transliterate()` and `transliterateText()`
- Merge `overrides.json` at startup. Ignore keys that start with `_`.
- Python regexes, `lru_cache` and string slicing must behave the same in JS. Use a `Map` cache. Remember that `str.isupper()` and `re.fullmatch` have different JS equivalents.

### 5.2 CMUdict
- Use the npm package `cmu-pronouncing-dictionary`. Variants appear as `word(2)`, `word(3)`; collect them in order, the way `pronouncing.phones_for_word` does, and strip `#` comments.
- Load it **lazily** with a dynamic `import()` on first use, so the login screen stays fast.

### 5.3 Neural G2P (step 6)
- Write `scripts/convert_checkpoint.py`. It reads `g2p_checkpoint.npz` and writes `public/data/g2p/weights.bin` (float32, concatenated) plus `manifest.json` (name, shape, byte offset for each array).
- Port the numpy GRU (`_NeuralG2P._cell` and `predict`) to TypeScript using `Float32Array`. Load it only when a word reaches step 6.
- If loading fails, skip to grapheme rules, exactly as the Python does.

### 5.4 Bangla meaning lookup
- `src/lib/meaning.ts` fetches `/data/E2Bdatabase.json` once, builds a `Map<lowercaseEn, bn>`, and merges duplicate keys with `, `. Cache the parsed result in IndexedDB so later visits don't re-parse 7.9 MB.
- Lookup order: exact match → hyphen/space variants (`air-port` ↔ `airport`) → simple lemma fallback (`-s`, `-es`, `-ies→y`, `-ed`, `-ing`, doubled consonant). Mark a lemma hit as "meaning of *<lemma>*".
- In the UI, show the first 5 comma-separated meanings, with a "more" toggle. Render `(Adj.)`-style tags as small chips.

### 5.5 Parity tests (required)
- Write `scripts/make_golden.py`. It runs the **original Python** `bn_phonetic` (overrides loaded) over (a) every single-word `en` in `E2Bdatabase.json` and (b) the `english` columns of both results CSVs, and writes `tests/golden.json` as `{word: bangla}`.
- A Vitest suite runs the TS port over `golden.json` and reports the match rate.
  - **Target: ≥ 99.5% exact match.** Below that, print the first 50 mismatches grouped by `source` and keep fixing the port.
  - Also port the test cases in `test_bn_phonetic.py` as Vitest tests.
- Put the final match rate in the README.

---

## 6. English definition API

- Use `https://api.dictionaryapi.dev/api/v2/entries/en/{word}` (free, no key). Take:
  - `definition` and `partOfSpeech` from the first meaning
  - the first `example` across meanings (for the suggested sentence)
  - `audioUrl` from `phonetics[]`, preferring a URL containing `-uk`
- Timeout of 6 s with `AbortController`. A 404 means "no definition found", which is a normal state, not an error. Network errors leave the field `null` and allow a retry.
- Keep all of this in `src/lib/definition.ts` so the provider can be swapped later.

---

## 7. UI and UX

- Layout: a header with the app name, a nav (**Practice** | **All Words** | **Add** | Settings) and the current email. Practice is the landing page after login. Show count badges on both sections.
- Mobile-first: works at 360 px width, buttons at least 44 px tall, practice input auto-focused.
- Load a Bangla font (`Hind Siliguri` or `Noto Sans Bengali` from Google Fonts) and use it for all Bangla text. Make the Bangla spelling the visual hero on cards.
- Empty states for each section, e.g. "No words in practice — add one".
- Show loading skeletons while the dictionary or CMUdict loads for the first time.
- Keyboard: Enter = Check / Next; `Ctrl+Space` = play audio in practice.
- Accessibility: labelled inputs; diff colours paired with symbols or underline (not colour alone); `aria-live` on the check result.

---

## 8. Project structure

```
src/
  lib/bnPhonetic/     # TS port + overrides
  lib/meaning.ts
  lib/definition.ts
  lib/speech.ts
  lib/storage.ts
  lib/diff.ts         # Levenshtein alignment → ops[]
  pages/Login.tsx  Practice.tsx  AllWords.tsx  AddWord.tsx  Settings.tsx
  components/WordCard.tsx  PracticeCard.tsx  DiffView.tsx  HintPanel.tsx
public/data/  E2Bdatabase.json  overrides.json  g2p/
scripts/      convert_checkpoint.py  make_golden.py
tests/
```

---

## 9. Definition of done

1. `npm install && npm run dev` works. `npm run build` produces a static `dist/` that runs from any static host.
2. `npm test` passes, and the bn_phonetic parity rate is ≥ 99.5%, printed in the output.
3. These walkthroughs work end to end:
   - Log in as `a@test.com` → add `necessary` → it appears in Practice with `নেসেসারি`-style spelling, a Bangla meaning and a definition.
   - Practise it, type `neccesary` → the diff shows the extra `c` and the missing `s` → type it correctly 3× → the "move to All Words" prompt appears → move it.
   - In All Words, the card shows only the Bangla spelling with a working 🔊 → move it back to Practice.
   - Switch to `b@test.com` → empty account → switch back → `a@test.com`'s data is intact.
   - Turn off the network → adding a word still saves the Bangla spelling and meaning, and the definition shows "Retry".
4. The README covers setup, the two Python scripts, the parity result, and "Decisions" (every assumption you made).

Work in this order: storage + login → meaning lookup → bn_phonetic port + parity tests → add-word flow → practice + diff → All Words → polish. After each step, report what's done and what's next.
