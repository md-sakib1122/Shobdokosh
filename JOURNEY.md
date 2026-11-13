# JOURNEY.md

Structural and temporal spec for ShobdoPractice. For visual tokens, see DESIGN.md (created in Phase 2). Microcopy is provisional until Phase 3; strings in quotes are placeholders, not final.

Owner: product owner (project user). Research basis: UNGROUNDED (brief + reading the current app; no interviews). Update cadence: whenever a phase changes a flow or page.

---

## Job

**Job story (Moesta school):** When I have collected many words (an exam list, a chapter, a topic), I want to practise just that list right now, so I can make steady progress on what matters this week without scrolling past everything else.

- **Functional:** group words, pick one group, practise only it; fix a wrong grouping later.
- **Emotional:** calm and in control; a long vocabulary feels organised, not like a backlog.
- **Social:** none material (local, private tool). Learners may prepare for tests; no sharing.

**Four forces (inferred, UNGROUNDED):**
- Push: one flat list becomes unwieldy; practice drags in unrelated words.
- Pull: "practise only this list"; fast batch adding to one list.
- Anxiety: "will my existing words survive the update?", "will deleting a category lose words?", "will I have to organise everything first?"
- Habit: current flow is Add -> Practice with no grouping; must stay as quick as today.

Design consequences: nothing forces organising (Uncategorized default); deletion never deletes words; migration is silent and lossless.

---

## Journey

**Actor:** Bangla-speaking English learner, studying in short focused sessions on phone or desktop (equal).
**Scenario:** build a list, then focus practice on it, then keep it tidy.
**Scope:** future state, whole app. Decision model: loyalty loop (McKinsey 2009), not a funnel. Return visits are the point: Practice -> learn -> move to Words -> add more.

| Phase | Actions | Mindset | Emotion | Touchpoints | Opportunity |
|-------|---------|---------|---------|-------------|-------------|
| Collect | Add words, pick/create category | "Get it in fast" | Med | Add, combobox | Remember last category; inline create |
| Focus | Pick a category on Practice | "Just this list today" | High | Practice filter | Filter remembered between visits |
| Practise | Spell, Verify, review diff | Concentrating | Med (dips on misses) | WordCard, VerifyDialog | Quiet feedback; no gamification |
| Graduate | Move learned word to Words | Satisfaction | High | Practice -> Words | Category chip keeps context |
| Tidy | Rename, delete, re-categorise | Occasional upkeep | Low-Med | Categories, Word details | Safe delete with Undo |

**Emotion curve:** peaks at Focus (immediate narrowing) and Graduate; valleys at misspelt attempts and at any destructive action, so those get the most reassurance.

---

## IA

**Organization scheme:** task-based, with category as a facet over the word set (not a folder tree).
**Structure:** hub-and-spoke; five flat destinations plus Login. Category is a filter on Practice and Words, never a sub-route.
**Navigation model:** global only. Phone: bottom tab bar (5 items, icon + label). Desktop: top bar with the same 5 labels. No local nav, no overflow menu (Hick 1952: 5 items need no hiding; NN/g bottom-nav guidance of 3-5).

```
Login                      (signed-out only)
App (signed in)
├── Practice   /practice   words with status "practice", filter by category
├── Words      /words      words with status "all" (learned), filter + search + sort
├── Add        /add        look up, categorise, save
├── Categories /categories list, search, create, rename, delete
└── Settings   /settings   account, export, import, delete account
Overlay: Word details dialog (from Practice or Words via ?open=<id>)
```

**Labels:** Practice, Words, Add, Categories, Settings. The old "All Words" tab is now "Words" (shorter for a 5-item phone bar); the page heading may read "All Words". Phase 3 confirms.
**Badges:** Practice and Words show TOTAL counts, unaffected by any category filter (decision on research Q4).
**Account switcher:** desktop header shows email + "Switch account". On phone the header shows only the wordmark; "Switch account" lives in Settings > Account (frees width, the bar already holds 5 items).
**Persistent state (per account):**
- `practiceCategory`: Practice's selected category id, or "all". Persists between visits.
- `lastAddCategory`: category id last used in Add.
- Words filter selection is NOT persisted (resets to All categories each visit; Words is for browsing).
- Both persisted ids are validated on read; a missing id falls back (see F5/edge cases).
**Deep links:** `/practice?open=<id>`, `/words?open=<id>`, `/words?category=<id>` (used by empty states), `/add?category=<id>` (used by empty states).
**Validation:** NOT VALIDATED (no card sort / tree test; a 5-item flat IA is low-risk, validate in use).

---

## Flows

Notation: [Action], <Decision>, (End).

### F1. Add a word with a category (incl. inline create)
**Type:** user flow. **Entry:** Add tab, or "Add a word" from an empty state (optionally with `?category=`).
1. [Type English word] -> [Look up]. <Duplicate?> yes -> error + "Open X in Practice/Words" link (existing behaviour); no -> preview.
2. Preview shows the Category field, pre-filled with `lastAddCategory`, else the one from `?category=`, else Uncategorized. Field is never empty on first render.
3. <Change category?> no -> step 6.
4. [Focus combobox, type to filter]. Results list shows name + word count. <Exact match (case-insensitive)?> yes -> no create row; no and text valid -> last row "+ Create 'text'".
5. [Choose existing] or [Choose "+ Create"] -> category is created immediately, selected, toast "Category 'text' created" (the preview stays; nothing else is lost). <Create invalid?> (empty, over 40 chars, bad characters) -> create row is replaced by an inline reason; Enter does nothing.
6. [Save to Practice]. Word saved to the selected category; `lastAddCategory` updated; toast with "Practise now" link.
**Errors:** clearing the combobox text and leaving it reverts to the last valid selection (a value can never be empty). Lookup failure keeps existing behaviour (manual fields).
**Success:** word in Practice under the chosen category; next Add starts on the same category (batch adding).

### F2. Focused practice
**Type:** user flow. **Entry:** Practice tab.
1. Practice opens with the remembered filter (default "All categories"). <Remembered category still exists?> no -> fall back to All categories, one-time inline note "Category 'X' no longer exists - showing all." (F5 edge).
2. [Open filter, type to narrow, pick category]. List updates to that category; count line "N words in <Category>" and a filter bar with a "Clear" button appear (filtered state). Selection persisted.
3. <Any practice words in category?> yes -> [spell, Verify] per card; no -> filtered-empty state (page spec) with: "View in Words" (when the category has learned words), "Add a word to <Category>", "Clear filter".
4. [Move learned word to Words] (existing) -> card leaves list; chip unchanged.
5. [Clear] -> All categories; persisted.
**Success:** only words from the chosen list are shown; the user can tell at a glance a filter is active (never a silently empty page).

### F3. Rename a category
**Type:** task flow. **Entry:** Categories > row "Rename".
1. [Rename] -> row becomes an inline text field with the current name selected.
2. [Edit] -> live validation. <Blank / >40 / invalid chars> -> inline error, Save disabled. <Case-insensitive duplicate of ANOTHER category, incl. "Uncategorized"> -> inline error "You already have a category called X", Save disabled. Changing only the case of its own name is allowed.
3. [Save or Enter] -> row updates, toast. [Esc / Cancel] -> unchanged.
**Effects:** chips, filters and remembered selections use category ids, so they follow the rename automatically. Uncategorized has no Rename action.

### F4. Delete a category (reassign to Uncategorized)
**Type:** user flow. **Entry:** Categories > row "Delete" (not offered on Uncategorized).
1. [Delete] -> confirm dialog: "Delete 'X'? Its N words (P in practice, L learned) move to Uncategorized. The words themselves are not deleted." Buttons: "Delete category" (danger), "Cancel" (default focus). For N = 0 the sentence reads "It has no words."
2. [Confirm] -> category removed, its words get Uncategorized, counts update. Toast with **Undo** (about 8 seconds): restores the category (same id, name) and re-assigns exactly the words that moved.
3. Side effects (same transaction): <Practice filter = X?> -> reset to All categories. <`lastAddCategory` = X?> -> reset to Uncategorized. <Words filter = X?> -> reset to All categories. No error shown; the toast is the only mention.
**Error:** if storage write fails, nothing changes and an error toast appears (existing storage-unavailable banner still applies).
**Cancel/Esc:** no change.

### F5. Recover from a stale remembered category
**Type:** user flow. **Entry:** any load where `practiceCategory` or `lastAddCategory` points at a missing id (deleted in another tab, imported replace, corrupted).
- Practice: fall back to All categories, show the one-time note, rewrite the stored value.
- Add: fall back to Uncategorized silently (the field always shows its value, so nothing is hidden).

### F6. Import with collisions
**Type:** user flow. **Entry:** Settings > Your data > Import.
1. [Choose .json], choose mode: Merge (default) or Replace.
2. <File parses?> no -> inline error (existing: invalid JSON, unsupported version, schema mismatch). Both v1 files (no categories) and v2 files are accepted.
3. Merge rules:
   - **Same category name** (case-insensitive, trimmed) -> maps to the existing category; the existing name and id are kept; imported words go in it. A file's "Uncategorized" maps to the built-in.
   - **New category name** -> created.
   - **Word already present** (match by id, then by word text; existing behaviour): the newer `updatedAt` wins, whole-word.
     - *Imported wins* (file copy is newer): the word takes the imported fields **and** the mapped imported category — except for a v1 file (no categories), where it keeps its current category.
     - *Existing wins* (local copy is newer or equal): the existing word is left completely untouched, category included.
   - **New word from a v1 file** -> Uncategorized. **Imported word pointing at a missing/invalid category** (bad id, name over 40, invalid characters) -> Uncategorized, counted in the summary.
4. Replace rules: categories and words are replaced by the file's; Uncategorized is always (re)ensured; `practiceCategory`/`lastAddCategory` are validated afterwards (F5).
5. Summary toast (no extra confirm step for merge): "Import done. Added A words, updated U. Categories: C created, M merged into existing, X words placed in Uncategorized."
6. <Mode = Replace?> -> before applying, a confirm dialog states the counts ("Replace your N words and K categories with the file's W words and C categories? This can't be undone.") with **Cancel as default focus** and a destructive "Replace everything" button. The Replace radio label is also marked destructive (copy in Phase 3).

---

## Page specs

Common: all pages sit inside the shell (phone bottom tab bar, desktop top nav); Login is outside it. All tap targets 44px. Every list announces counts politely (aria-live). Category names are English; Bangla is only in meaning/pronunciation.

### Login
**Purpose:** let a returning or new learner enter their local account with an email, no password.
**Entry points:** first visit; "Switch account"; after delete account; any route when signed out.
**Content blocks:** 1) wordmark and one-line product description; 2) email field with label; 3) "Continue" button; 4) one-line note that data is stored only in this browser.
**States:** default; error (invalid email: inline, field focused); storage-unavailable (note that changes are kept in memory only); returning vs new account is not distinguished (same action). No empty/filtered state.
**Primary action:** Continue -> /practice.
**Exit / next:** Practice. Existing v1 data migrates silently on first load; no migration UI.

### Practice
**Purpose:** spell-check practise the words currently in practice, optionally limited to one category.
**Entry points:** nav; wordmark; Login success; Add toast "Practise now"; "View in Practice" links; Words empty state.
**Content blocks:** 1) heading "Practice" + total count badge; 2) category filter bar (combobox, mode filter, "All categories" first, shown only when at least one category besides Uncategorized exists); 3) filtered state line when a category is active: "<N> words in <Category>" + "Clear" button; 4) card grid (1 col phone, 2 col desktop); each card = Bangla prompt, category chip, speak, move, details, spelling input + Verify, stats footer; 5) Word-details dialog on `?open=`.
**States:**
- *Default (All categories):* all practice words, newest first.
- *Filtered:* filter bar shows the selected name; count line + Clear visible; chip still on cards.
- *Empty, no practice words at all:* "No words in practice" + "Add a word" (no filter bar needed).
- *Filtered but 0 words (edge case "filtered Practice with 0 words"):* in place of the grid, a panel naming the category. Two variants: (a) category has learned words, none in practice: "All words in <Category> are in Words" with "View in Words" (`/words?category=`) and "Clear filter"; (b) category has no words: "<Category> has no words yet" with "Add a word to <Category>" (`/add?category=`) and "Clear filter". The filter bar and Clear stay visible; the page is never blank.
- *Stale remembered category (edge case):* load falls back to All categories and shows a dismissible note "Category 'X' no longer exists - showing all." (F5).
- *Category deleted while selected (edge case):* handled in F4, same fallback; no note beyond the Undo toast.
- *Error:* none specific; word lookup/storage errors surface via toast and the storage banner. Combobox no-match: "No categories match 'q'".
**Primary action:** type the spelling and Verify on a card.
**Exit / next:** Word details; Words (move learned); Add.

### Words
**Purpose:** browse, search and manage learned words (status "all"), optionally by category.
**Entry points:** nav; Practice "View in Words"; move-to-Words after a word is learned.
**Content blocks:** 1) heading "Words" + total badge; 2) toolbar: text search (English or Bangla), the SAME category filter combobox as Practice (mode filter), sort (Newest / A-Z); 3) result line "N of M shown" (aria-live), with Clear-filters when any control is active; 4) card grid (1 / 2 / 3 col) with category chip; 5) Word-details dialog on `?open=`.
**States:**
- *Default:* all learned words, newest first.
- *Empty, no learned words:* "No learned words yet" + "Go to Practice".
- *Filtered with results:* filter shows the category; count reflects filter + search together.
- *Filtered/searched with 0 results:* "No words match" naming the active category and/or query, with "Clear filters" (and, when only the category is active and Practice holds words in it, a link "N words in <Category> are still in Practice").
- *Category param missing/stale (`?category=` unknown id):* ignored, shows All categories.
- *Error:* none specific; combobox no-match as above.
**Primary action:** pick a category / search to find a word; per card "Move to Practice".
**Exit / next:** Word details; Practice.

### Add
**Purpose:** save a new word with its meaning and exactly one category, as fast as possible, including batches into one list.
**Entry points:** nav; Practice/Words empty states (`?category=`); "Add" after Look up errors.
**Content blocks:** 1) heading "Add a word"; 2) English word field + "Look up"; 3) duplicate/lookup error area; 4) preview (existing: word, speak, Bangla pronunciation, meaning, definition, part of speech, example sentence, edit fields); 5) **Category** field (create-mode combobox, label "Category", required), placed directly above the save button; 6) "Save to Practice" + Cancel.
**States:**
- *Default:* only the word field and Look up; category field appears with the preview.
- *Preview:* Category pre-filled: `lastAddCategory`, else `?category=`, else Uncategorized; never blank (satisfies "required").
- *Zero categories besides Uncategorized (edge case):* field shows "Uncategorized"; opening it lists Uncategorized and, as soon as the user types, "+ Create 'text'"; with an empty query a hint row reads "Type a name to create a category". The user is never required to create one.
- *200+ categories (edge case):* opening shows the last-used category first, then the rest A-Z; the list is capped to the first 50 matches with a footer "Showing 50 of 214 - keep typing to narrow"; screen readers hear "N results" on every change; typing narrows server-less in memory.
- *Typed name has no exact match:* "+ Create 'text'" is the last row. *Exact match, any case:* create row hidden, the existing row is the match (no accidental duplicate).
- *Invalid create text (over 40 / bad characters):* the create row is replaced by an inline reason; no creation.
- *Stale `lastAddCategory` (edge case):* silently falls back to Uncategorized (F5).
- *Duplicate word:* error with link to the existing word (existing behaviour); no category UI shown.
- *Error:* lookup failure -> manual fields (existing); category creation failure -> inline error, selection unchanged.
**Primary action:** Save to Practice.
**Exit / next:** stays on Add with the form reset and the same category kept; toast links to Practice (filtered to the category is NOT automatic).

### Categories
**Purpose:** see, create, rename and delete categories and see how many words each holds.
**Entry points:** nav; no other deep links.
**Content blocks:** 1) heading "Categories" + total count; 2) search field (filters by name) and "New category" button; 3) create row (inline name field + Create, shown after "New category"); 4) list of rows: name, word count (total; practice/learned split is NOT shown to keep the list calm), "Rename", "Delete"; Uncategorized pinned first without Rename/Delete (explained by a short "Built in" note); the rest sorted A-Z; 5) sort toggle only when more than 12 categories (A-Z / Most words).
**States:**
- *Default:* Uncategorized + user categories.
- *Zero categories besides Uncategorized (edge case):* Uncategorized row plus an empty-state block: "Group your words into lists" with a "Create a category" button; search is hidden.
- *200+ categories (edge case):* search is the primary control; the list renders in pages of 50 with a "Show more" button (no infinite scroll; keeps focus stable); count "Showing 50 of 214" announced politely; sort toggle visible.
- *Search with 0 results:* "No categories match 'q'" + "Create 'q'" if valid and not an exact duplicate.
- *Renaming (edge case: duplicate name):* inline field with live validation; duplicate (case-insensitive, any other category including Uncategorized) shows "You already have a category called X" and disables Save; own-name case change allowed (F3).
- *Delete confirm:* dialog per F4; N, P, L counts in the sentence; an Undo toast afterwards.
- *Create errors:* blank, over 40, invalid characters, duplicate -> inline, Create disabled.
**Primary action:** New category (empty state: "Create a category").
**Exit / next:** a row's count is not a link in v1; users reach the words through Practice/Words filters (a "View words" link per row is a Phase 3 option, `/words?category=`).

### Settings
**Purpose:** manage the account and the data: export, import, delete account.
**Entry points:** nav; Add/Import toasts do not link here.
**Content blocks:** 1) heading "Settings"; 2) Account: email, "Switch account" (the only place on phone); 3) Your data: "Export my data (.json)" (now includes categories), Import (file, mode Merge/Replace, "Import"), a one-line explanation of how category names are matched on merge; 4) Delete account (danger zone, confirm step).
**States:**
- *Default.* *Import error:* inline message under the file field (existing messages + "file's categories are invalid" is NOT an error; invalid categories fall back to Uncategorized, F6).
- *Import success:* toast with the category summary (F6); the Categories page and filters reflect it immediately.
- *Import collision (merge):* no extra dialog; the summary reports merged-by-name and Uncategorized placements. *Replace:* the radio label and helper text say it overwrites all words and categories, and pressing Import opens a confirm dialog with the before/after counts (Cancel focused by default) — see F6 step 6.
- *Stale remembered category after replace (edge case):* handled by F5 on the next Practice/Add load.
- *Storage unavailable:* shell banner (existing); export remains the recovery path.
- *Delete account:* two-step inline confirm (existing).
**Primary action:** Export my data (safe, most frequent). Import is secondary.
**Exit / next:** Login (after delete or switch).

### Word-details dialog
**Purpose:** review a word's full information and fix it, including its category.
**Entry points:** "Details" button on any card; `?open=<id>` on Practice or Words; "Open X" links from Add duplicate errors.
**Content blocks:** 1) header: word, speak, close; 2) **Category row**: current category as a chip + "Change" (opens the same combobox in filter mode, i.e. no inline create here); 3) Bangla pronunciation, meaning, definition, part of speech, example sentence (existing); 4) actions: Retry lookup (when lookup failed), Edit, Delete word (two-step confirm).
**States:**
- *Default (view).* *Editing:* existing fields plus Save/Cancel; the category change applies immediately when picked (it is not part of Edit mode), with a toast "Moved to <Category>".
- *Category change while the card is filtered:* the word may leave the filtered list (it no longer matches); dialog stays open; the list updates behind it; no error.
- *Stale category on the word (should not happen):* shows Uncategorized.
- *Zero categories besides Uncategorized:* the Change popover lists only Uncategorized and a hint "Create categories in the Categories tab" with a link.
- *200+:* same capped list and "Showing N of M" footer as the combobox elsewhere.
- *Lookup error / not found:* existing state with Retry; *delete confirm:* existing two-step.
**Primary action:** Edit (view mode) / Save (edit mode). Category Change is a direct control.
**Exit / next:** closes back to the underlying page (clears `?open=`), Esc and backdrop close.

---

## Edge-case index (DW-1.3)

| Edge case | Where it is specified |
|-----------|-----------------------|
| Zero categories besides Uncategorized | Categories (empty state); Add (States); Practice and Words (filter hidden); Word-details (Change popover) |
| 200+ categories | Categories (paged list + search + sort); Add (capped combobox, "Showing 50 of N"); Word-details (same combobox) |
| Deleting the category currently filtered/remembered | F4 step 3; Categories (Delete confirm state); Practice (States, deleted while selected) |
| Filtered Practice with 0 words | Practice (States, variants a/b) |
| Renaming to a duplicate name | F3; Categories (Renaming state) |
| Remembered category that no longer exists | F5; Practice (stale note); Add (stale fallback); Settings (after replace) |

## Open items for later phases
- Phase 3: final microcopy, the combobox spec (listbox cap, announcements), toast Undo behaviour, a possible "View words" link per Categories row, confirm the nav label "Words".
- Phase 5: store `practiceCategory` and `lastAddCategory` inside the account (not separate global keys) so they survive account switching correctly; Undo for delete needs to hold the moved word ids for the toast lifetime.
