# Design Review: Phase 1 - Categories and refresh (JOURNEY.md)

## Rendered Evidence (Step 0)
- Screenshot: none - spec-only phase (no rendered .html). Structure-level critique only; no pixel evidence applies.
- Surface: /home/sakib/Desktop/voc_app/JOURNEY.md (sections: Job, Journey, IA, Flows F1-F6, Page specs for Login, Practice, Words, Add, Categories, Settings, Word-details dialog, Edge-case index, Open items).
- DESIGN.md: not present (expected at this stage).

## Assessment B - Deterministic Detector
- Command: node /home/sakib/.claude/plugins/cache/rtd/design-for-ai/4.2.0/scripts/detect.mjs (no HTML path supplied)
- Exit: 3 (N/A - no rendered artifact). Not a failure.
- Findings: N/A - no rendered artifact.
- Opened only after Assessment A findings were frozen: YES (detector output is N/A; nothing to synthesize).

## Triage
- Baseline (always-on): visual + usability. Visual is N/A for a spec-only artifact (no typography, colour or composition to review); usability applied to the flows and page states.
- Dispatched: `journey` (this is a JOURNEY.md: IA, flows, page specs, edge cases); `usability` (flows and states, operability, error prevention, destructive actions).
- Not applicable: `data-viz` (no charts), `content-design` (microcopy explicitly provisional; not reviewed for voice), `behavioral` / `deceptive-patterns` (no persuasion surface), visual pillars (no pixels).
- Deferred (if capped): none.
- Doctrine read: references/journey/journey.md, skills/usability/SKILL.md (both verified Read()-able under the plugin root).

## Cross-Pillar Findings (ONE ranked report)
| Severity | Pillar | Problem | Principle | Fix |
|----------|--------|---------|-----------|-----|
| Major | usability | Import **Replace** irreversibly overwrites all words and categories with no confirm step and no Undo (Settings: "no confirm dialog beyond the explicit selection (kept from today)"; F6 step 4). This contradicts the journey's own rule that destructive actions get the most reassurance (JOURNEY.md, Journey: "Emotion curve ... valleys at ... any destructive action, so those get the most reassurance"). Category delete gets confirm + Undo; whole-library replace gets less. | Nielsen #5 error prevention; Nielsen #3 user control and freedom (no undo); journey doctrine: destructive actions need reassurance | Add an explicit confirm step for Replace that states the word and category counts being erased, with Cancel as default focus (mirror F4). Optionally auto-download a backup before replace. |
| Major | journey / data-model | F6 merge rule for a same-word collision is ambiguous for v2 files. It says "the newer updatedAt wins; the winning word's category is the mapped imported category, EXCEPT when the file is v1". Read literally, when the EXISTING word is newer and wins, its category is still overwritten by the file's category. That contradicts the Anxiety force ("will my existing words survive the update?") and the stated intent that existing data is kept. | Moesta switch-interview anxiety (JOURNEY Job); journey doctrine: flows must encode decision branches and states (flow E.5) | Split the rule explicitly into two branches: (a) imported wins -> take mapped category; (b) existing wins -> keep existing word AND its category. Then restate the v1 exception inside that structure. |
| Minor | journey | Edge-case index claims "Practice and Words (filter hidden)" for zero categories besides Uncategorized, but the Words page spec says nothing about hiding its filter (it says it uses "the SAME category filter combobox"). | Journey doctrine: cite-the-spec consistency; DW-1.3 traceability | Add the zero-category state to the Words page spec, or correct the index. |
| Minor | journey | 200+ categories cap is specified on the Add and Word-details comboboxes and on Categories, but the Practice and Words page specs do not restate it. It is covered only by reference ("same combobox"). | Journey doctrine: each page spec should be self-contained for its states | State the capped list and "Showing 50 of N" footer in the Practice and Words filter states. |
| Minor | usability | Add: the Category field sits after a long preview (word, speak, pronunciation, meaning, definition, POS, example, edit fields). On a phone it needs a scroll to reach, although it is pre-filled. The Journey's Habit force says batch adding "must stay as quick as today". | Fitts's law (1954): travel cost on a secondary target; Hick (1952) on added decisions | Consider showing the Category chip near the top of the preview (or next to the word field) so batch adds never scroll. |
| Minor | usability | Delete-category Undo window (about 8 seconds) is short for screen-reader and motor-impaired users. The spec does not say whether the toast is announced politely or whether the window pauses on focus. | WCAG 2.2.1 Timing Adjustable (usability-side accessibility, usability SKILL.md) | Pause the timer on focus or hover, and announce the toast politely. |
| Minor | journey | Undo for category delete restores the category and the moved words, but does not say whether the reset Practice filter, `lastAddCategory` and Words filter (F4 step 3) are restored too. Undo could leave the UI in an unstated state. | Journey doctrine: encode the state transitions for each branch | State explicitly that the resets are not undone (and why), or restore them. |
| Minor | content-design boundary | "Invalid characters" and "bad characters" for category names are used in F1, F3, F6 and page specs but never defined. Trimming is stated for import only, not for create or rename. | Journey doctrine: specs must be testable at the page level | Define the allowed character set and the trim rule once (for example in an IA "Naming rules" block) and reference it. |
| Minor | journey | Settings does not state whether empty or filtered states apply. Login says "No empty/filtered state" explicitly; Settings is silent. | DW-1.1 completeness (page-spec template: states) | Add one line: "Empty/filtered: not applicable (no list)". |
| Minor | journey | Formatting in Settings States: "*Default.* *Import error:*" is run together on one line, and a parenthetical sentence reads as a state. | Document clarity (spec hygiene) | Split into separate bullets. |

Notes on the artifact's own honesty (not defects): the journey is labelled "Research basis: UNGROUNDED" and "Validation: NOT VALIDATED", with an owner and update cadence named. This satisfies the journey doctrine's theater-risk rule, so it is not flagged.

## Requirement Fulfillment

### DW-1.1
PREMISE:  JOURNEY.md `## Page specs` has entries for all 6 pages (Login, Practice, Words, Add, Categories, Settings) + Word-details dialog; each lists purpose, content blocks, states (empty/filtered/error), and primary action
EVIDENCE: Entries present for all 7 surfaces (JOURNEY.md lines 137-232). Each has **Purpose**, a numbered **Content blocks** list, a **States** list, and a **Primary action** line. Per page:
- Login (l.138-143): purpose, 4 blocks, states default/error/storage-unavailable; explicit "No empty/filtered state"; primary Continue -> /practice.
- Practice (l.146-158): empty ("No words in practice"), filtered (count line + Clear), filtered 0 words (variants a/b), error (toast/banner, combobox no-match); primary Verify.
- Words (l.161-172): empty ("No learned words yet"), filtered with results, filtered 0 results, error note; primary "Move to Practice" / pick category.
- Add (l.175-189): default/preview empty state, zero-category, duplicate and lookup/category-creation errors; primary Save to Practice. Filtered not applicable (no list).
- Categories (l.192-204): empty (zero categories), 200+, search 0 results, create/rename/delete errors; primary New category.
- Settings (l.207-218): import error, import success, collision, storage-unavailable, delete-account; primary Export my data. Empty/filtered not stated (see Minor finding).
- Word-details (l.221-232): default, editing, filtered-card change, zero categories, 200+, lookup error, delete confirm; primary Edit/Save.
VERDICT:  PASS (Settings does not state empty/filtered applicability; recorded as a Minor finding, not a missing item)

### DW-1.2
PREMISE:  Flows cover inline-create, focused practice, delete-with-reassign, and import collision
EVIDENCE: Flows section: F1 "Add a word with a category (incl. inline create)" (l.79-88); F2 "Focused practice" (l.90-97); F4 "Delete a category (reassign to Uncategorized)" (l.106-112); F6 "Import with collisions" (l.119-129). Each is a numbered flow with Entry, decision diamonds (<...?>), error branches and success criteria.
VERDICT:  PASS

### DW-1.3
PREMISE:  Every edge case below is placed on a specific page spec
EVIDENCE: Edge-case index (l.236-245) maps all six edge cases to named page-spec states. Verified in the page specs: zero categories (Categories l.197; Add l.181; Practice l.148 filter hidden; Word-details l.228); 200+ (Categories l.198; Add l.182; Word-details l.229); delete filtered/remembered (Practice l.155; Categories delete confirm l.201; F4 step 3 l.110); filtered Practice 0 words (Practice l.153 variants a/b); rename duplicate (Categories l.200; F3 l.102); remembered missing (Practice l.154; Add l.185; Settings l.214). Words is named in the index for zero-category but its spec does not state it (Minor).
VERDICT:  PASS

## Edge cases (same standing as DW items)

### EC-1. Zero categories besides Uncategorized
EVIDENCE: Categories empty state "Group your words into lists" + Create button, search hidden (l.197); Add field shows Uncategorized, hint "Type a name to create a category", user never forced to create (l.181); Practice filter bar hidden (l.148); Word-details Change popover lists only Uncategorized with a link to Categories (l.228). Words is not specified (Minor).
VERDICT:  PASS

### EC-2. 200+ categories
EVIDENCE: Categories: search primary, pages of 50 with "Show more", "Showing 50 of 214" announced politely, sort toggle (l.198). Add: last-used first then A-Z, capped to 50 with footer "Showing 50 of 214 - keep typing to narrow", "N results" announced (l.182). Word-details: same capped list and footer (l.229). Practice and Words filter comboboxes reuse this component (Words l.163 "the SAME category filter combobox"); the cap is not restated on their page specs (Minor).
VERDICT:  PASS

### EC-3. Deleting the category currently filtered/remembered
EVIDENCE: F4 step 3 resets Practice filter, lastAddCategory and Words filter to fallbacks in the same transaction, no error, toast as only mention (l.110). Practice "Category deleted while selected" handled by F4 (l.155). Categories delete-confirm with N/P/L counts and Cancel default focus (l.108, l.201). Undo restore scope not stated (Minor).
VERDICT:  PASS

### EC-4. Filtered Practice with 0 words
EVIDENCE: Practice l.153: in place of grid, a panel naming the category; variant (a) "All words in <Category> are in Words" with "View in Words" and "Clear filter"; variant (b) "<Category> has no words yet" with "Add a word to <Category>" and "Clear filter"; filter bar and Clear stay visible; "the page is never blank". Flow F2 step 3 (l.94) matches.
VERDICT:  PASS

### EC-5. Rename to a duplicate name
EVIDENCE: F3 step 2 (l.102): case-insensitive duplicate of ANOTHER category incl. Uncategorized shows "You already have a category called X", Save disabled; own-case change allowed. Categories Renaming state (l.200) matches. Create-side duplicate also covered by Add exact-match rule (l.183) and Categories create errors (l.202).
VERDICT:  PASS

### EC-6. Remembered category that no longer exists
EVIDENCE: F5 (l.114-117): Practice falls back to All with one-time note and rewrites stored value; Add falls back to Uncategorized silently. Practice stale note (l.154, dismissible). Add stale fallback (l.185). Settings after replace handed to F5 (l.214). Word-details stale category shows Uncategorized (l.227).
VERDICT:  PASS

## Notes (non-blocking)
- No pixel evidence exists (spec-only phase). Nothing in this review asserts visual, contrast or spacing properties.
- Assessment B: N/A (no rendered artifact); detect.mjs exited 3 as expected.
- Major findings above are not FAIL triggers under the verdict rules: neither is a missing DW item, an unhandled listed edge case, a Critical principle break, nor a skipped detector. Both should be resolved before the Phase 3 microcopy and combobox specs are written.
- Deliberate decisions respected and not flagged: Uncategorized default, deletion never deletes words, silent lossless migration, Words filter not persisted, Practice/Words badges show totals. Each is stated with a rationale.

## Issues (if FAIL)
None blocking.

**Verdict: PASS**

(Non-blocking follow-ups in priority order: (1) Major: add confirm to import Replace; (2) Major: split F6 same-word collision rule into explicit imported-wins and existing-wins branches; (3) Minor items above.)
