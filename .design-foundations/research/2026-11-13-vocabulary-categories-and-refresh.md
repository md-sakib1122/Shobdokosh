# ShobdoPractice — Vocabulary Categories + Visual Refresh

**Summary:** Add user-managed vocabulary categories (each word belongs to exactly one, picked from a searchable dropdown when adding; Practice and All Words filter by category), and use this release to restyle the whole app as a calm, professional study tool.

- **Date:** 2026-11-13
- **Status:** draft
- **Product:** ShobdoPractice: a spelling and vocabulary practice app for Bangla speakers learning English words. React + TypeScript + Tailwind, data in localStorage (`shobdo:v1`), per-email local accounts, deployed on Vercel.

## Open questions

1. **Visual identity / design DNA:** fresh start. Color, type pairing (Latin + Bangla), and logo treatment are all undecided. Resolve in the plan's design DNA step.
2. **Navigation with 5 destinations** (Practice, All Words, Add, Categories, Settings): does the phone layout stay a top tab row, move to a bottom tab bar, or put something in an overflow menu?
3. **Practice filter persistence:** does the selected category stick between visits? (Leaning yes.)
4. **Nav badge counts:** should the Practice/All Words badges show totals, or follow the active category filter? (Leaning totals.)
5. **Category name rules:** max length, which characters are allowed (Bangla names?), and how case-insensitive duplicates are blocked.
6. **Per-category color/icon:** none (calmer) or a subtle marker? (Leaning none, which fits "calm".)
7. **Import/export:** exports include categories. Older export files without categories import into Uncategorized. On merge-import, how are category names that collide handled?

## The job

Users collect many words over time: exam lists, topics, chapters. A single flat list gets unwieldy, and they can't focus a practice session on one set. Categories give them that focus. The job is "let me practise just *this* list right now."

## Who and where

- Bangla-speaking English learners, studying in focused sessions.
- **Phone and desktop count equally.** Both must feel first-class, not just "work".
- Bangla script must render well everywhere (meanings, pronunciations, and possibly category names).

## Feature spec (confirmed decisions)

### Data
- Categories belong to each account: `{ id, name, createdAt }`.
- **Each word has exactly one category.**
- A built-in **"Uncategorized"** category always exists and can't be deleted (rename is still open). Existing words migrate into it. Words from a deleted category move into it.
- Requires a storage schema migration (`version: 1` → `2`).

### Searchable category dropdown (one shared component)
- Type to filter, with full keyboard support (arrows, Enter, Esc) and accessible combobox semantics.
- Must scale to **many** categories.
- Shows a word count next to each category.
- In the Add context only: when the typed text has no exact match, offer **"+ Create '…'"** inline, so the user never leaves the Add flow.

### Add Word
- Category is **required**. The word can't be saved without one.
- The dropdown **remembers the last category used**, so batch-adding to one list is fast.

### Categories tab (new top-level destination)
- Lists all categories with word counts, plus search.
- Rename and delete. Delete states clearly that the category's words move to Uncategorized.
- Can create a category here too.

### Practice
- Searchable category filter with **"All categories"** at the top. **Single selection.**
- Only words in the selected category appear.
- Empty state for a category with no practice words.

### All Words
- The **same filter dropdown** as Practice, used alongside the existing text search and sort.
- Each word card shows a **category chip**.

### Word details
- Users can change a word's category after it's added (implied: otherwise a wrong pick can't be fixed).

## Visual refresh (whole app)

- **Feel: a calm study tool.** Think Notion or Readwise: generous white space, soft neutrals, one restrained accent color, quiet surfaces, typography doing most of the work. Not dense like Linear, not playful or gamified.
- "Professional" here means: consistent spacing and type scale, clear hierarchy, nothing noisy, and every control easy to understand at first sight.
- Scope: every page (Login, Practice, All Words, Add, Categories, Settings) plus shared components (word card, details dialog, verify dialog, toasts, diff view).
- Emoji used as UI (📝 📚 ⚙️) should probably become proper icons. This is a judgment call for planning.

## Taste signals

- **Calm over clever.** Restrained accent, low visual noise.
- **No attachment to the current look.** The teal color, the "শ" tile logo, and Hind Siliguri are all open to replacement.
- The user picked "professional, user-friendly" over decoration.

## Constraints

- Stack stays React + Tailwind. There is no backend; everything lives in localStorage.
- Existing user data must survive the migration intact.
- Accessibility: 44px minimum touch targets (already used in the app), keyboard-operable combobox, and AA contrast.
- Light mode is the current baseline. Dark mode isn't discussed (it could be added to open questions).
