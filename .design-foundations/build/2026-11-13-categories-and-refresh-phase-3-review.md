# Design Review: Phase 3 - Categories and refresh (components sheet)

## Rendered Evidence (Step 0)
- Screenshots: /home/sakib/Desktop/voc_app/mocks/components-light-1280.png, components-dark-1280.png, components-light-390.png, components-dark-390.png. Coverage gap: the 1280 light and 390 light PNGs were viewed only at thumbnail scale (8148px and 15327px tall). Pixel-level observations below are limited to what was legible; contrast, state and microcopy claims are verified from the DOM, CSS and the contract files.
- Surface: /home/sakib/Desktop/voc_app/mocks/components.html (full file, 436 lines; sections 1-11). Contract: /home/sakib/Desktop/voc_app/DESIGN.md `## Components` and /home/sakib/Desktop/voc_app/JOURNEY.md `## Microcopy`.

## Assessment B - Deterministic Detector
- Command: node /home/sakib/.claude/plugins/cache/rtd/design-for-ai/4.2.0/scripts/detect.mjs /home/sakib/Desktop/voc_app/mocks/components.html > /home/sakib/Desktop/voc_app/.design-foundations/build/2026-11-13-categories-and-refresh-phase-3-detect.json
- Exit: 0 (ran)
- Findings: 66 total. `nested-cards` x65 (high), `em-dash-overuse` x1 (medium).
- Opened only after Assessment A findings were frozen: YES
- Disposition of hits:
  - `nested-cards` (65): all sit inside the sheet's specimen frames (`.surf` around the combobox states, `.card` around the word-card specimens). Controls inside a card are the Frost molecule composition in DESIGN.md, not a product nested-card pattern. Register-justified; resolved as Note.
  - `em-dash-overuse` (1, "20 em-dashes"): false positive. The detector regex `--(?=\S)` matches CSS custom-property names such as `--text` and `--surface`. The file contains 0 literal U+2014 characters, 0 `&mdash;` entities and 2 en dashes. No copy finding.

## Triage
- Baseline (always-on): visual + usability
- Dispatched: design-systems (sheet is a token and component system: DESIGN.md `## Components`, tiers, state tables); interaction (state/focus/keyboard behaviour of the combobox, toast, nav); content-design (microcopy for the listed edge cases: empty, error, no-results, announcements); usability (combobox keyboard operability, listbox pattern, 0-4 severity scale).
- Not applicable: data-viz (no charts or encoded data); journey (JOURNEY.md read only for microcopy edge cases, not for route); behavioral and deceptive-patterns (no conversion surface); ai-native (no agent UI).
- Deferred (if capped): none.

## Cross-Pillar Findings (ONE ranked report)
| Severity | Pillar | Problem | Principle | Fix |
|----------|--------|---------|-----------|-----|
| Minor (verdict-blocking under DW-3.1) | design-systems | Category row state table in DESIGN.md has `-` for Active and Disabled with no reason in the notes column. DW-3.1 requires a reason wherever a state is not applicable. | DW-3.1 spec requirement; Frost atomic design (state completeness per component) | Add a reason to the category row notes column, for example "row is not focusable; its buttons own active and disabled". |
| Minor | visual / design-systems | Component CSS uses literal dimensions outside the spacing scale: `.cr` and `.toast`/`.nav-i` min-height 56px, `.chip` height 24px, `.choice` padding 10px, `.navbar-bottom` max-width 430px. The sheet also has inline `margin-top:26px` and `margin-top:12px` where tokens exist (`--space-6`, `--space-3`). State colours are token-only, so this is a spacing-token hygiene gap, not a state defect. | DESIGN.md Rule 1 "semantic tokens only"; Kholmatova perceptual patterns (spacing rhythm) | Map the 56px/24px/10px dimensions to named tokens or document them as component tokens; replace inline px with `--space-*`. |
| Minor | content-design / usability | Filtered Practice with 0 words shows two unresolved variants ("variant a" learned-words panel and "variant b" empty panel). Microcopy is defined for both, but the sheet does not choose one. | Hick's law (decision left open in the spec); DW-3.3 microcopy definition | Pick one variant for the spec, or name the trigger that selects each. |
| Minor | usability | Count announcement: the listbox in filter mode renders four `role="option"` elements ("All categories" plus three categories), but the announcement says "3 categories". The DESIGN.md rule explicitly excludes "All categories". The literal edge-case wording is "must match the number of category options shown". | WCAG 4.1.3 Status Messages; W3C APG combobox | Either keep the rule and move "All categories" outside the listbox, or announce "4 options, 3 categories". Confirm the intended reading. |
| Note | usability | Toast has `overflow:hidden` and the dismiss icon button's ring (2px ring + 2px offset) sits 4px inside the toast edge, the same width as the toast's right padding. The outer ring pixel may clip. Not verified at pixel level. | Nielsen #1 visibility of system status; focus visibility (WCAG 2.4.7) | Increase toast right padding to `--space-2` or set `overflow:visible` on the dismiss button's container. |
| Note | design-systems | `dark` block in components.html redefines `--accent-solid` and `--accent-solid-hover` twice with different values; the second wins, and comments say this is intentional. | Token hygiene (DTCG single-source per tier) | Remove the first duplicate declarations in the dark block, or regenerate the file from DESIGN.md. |
| Note | visual | Distinctiveness holds: Newsreader display serif, 1px margin rule, hue-shifted shadows, no pill chips, one accent. Named direction: "fountain-pen ink on ruled paper". | ai-tells.md CHECKER mode | None. |

## Requirement Fulfillment

### DW-3.1
PREMISE:  every component (category combobox in filter + create mode, word card, category chip, bottom nav / desktop nav, dialog, confirm-delete, empty states, toast with Undo, buttons, inputs) has states (default/hover/focus/active/disabled/error) mapped to semantic tokens only — where a state is not applicable the spec gives a reason
EVIDENCE: Sheet sections 1-11 render each component in default, hover, focus, active, disabled and error where applicable. DESIGN.md state table (lines ~329-346) maps each state to tokens, for example `--surface-hover`, `--accent-bg-subtle`, `--focus-ring`, `--error-11`. Reasons are given for chip ("static in v1"), word card and nav ("not clickable", "a destination is never disabled"), dialog ("controls own their states"), panel and note ("static; its buttons own states"), toast ("its buttons are ghost/icon"). The category row (DESIGN.md line 346) has `-` for Active and Disabled with an empty notes column, so no reason is given. Colour states in the CSS use `var(--…)` tokens throughout; literal px dimensions are a separate Minor finding.
VERDICT:  FAIL (blocker, minor fix: category row lacks state reasons, a literal DW-3.1 requirement under Verdict Rule (b))

### DW-3.2
PREMISE:  interactive elements pass AA non-text (≥3:1); focus ring is specified
EVIDENCE: DESIGN.md states focus ring `outline: var(--ring-width) solid var(--focus-ring); outline-offset: var(--ring-offset)`, 2px and 2px. Light `--focus-ring` = accent-9 `#5358ad`, 6.12:1 on background; I recomputed this value from the hex and got about 6.1:1. Dark `--focus-ring` = accent-11 `#abb3eb`, 9.20:1. Field border `--border-interactive` light neutral-9 `#60626e`, 5.94:1 (recomputed: 5.9:1); dark neutral-10 `#72747f`, 4.01:1 (recomputed: about 4.0:1). Chip text `--accent-text` on `--accent-bg-subtle`, 5.38:1 (recomputed about 5.3:1). Primary label in dark, accent-10 `#646bbd` on `#f9faff`, 4.60:1 (recomputed about 4.6:1). Dark secondary button border on surface is about 3.8:1 by my recomputation, above 3:1.
VERDICT:  PASS

### DW-3.3
PREMISE:  microcopy defined for every edge case: zero categories besides Uncategorized; 200+ categories; deleting the category currently filtered/remembered; filtered Practice with 0 words; rename to a duplicate name; remembered category that no longer exists; combobox no results; typed name matching an existing category with different case; long category name truncating in chip; keyboard-only use; screen-reader announcement of result count
EVIDENCE: Zero categories: sheet c8 ("Type a name to create a category"); JOURNEY.md line 187. 200+: sheet c7 ("Showing 50 of 214 – keep typing to narrow", announced "50 of 214 categories shown"); JOURNEY line 188. Deleting filtered/remembered: dialog and toast copy in sheet s8/s9; JOURNEY F4 side effects reset the filter silently. Filtered 0 words: sheet s10 two variants; JOURNEY line 157. Rename duplicate: sheet s8 and s11 ("You already have a category called “Uncategorized”."); JOURNEY line 102. Remembered category gone: sheet s10 info note "The category “Exam prep” no longer exists. Showing all words."; JOURNEY F5. No results: sheet c4 and c5 ("No categories match “biology”."). Different case: sheet c3 ("“IELTS” already exists. Press Enter to use it.", create row suppressed; DESIGN.md "Exact match (any case)"). Chip truncation: CSS `.chip>span` ellipsis at 14rem with `title` = full name, and the Word details dialog wraps the full name. Keyboard: DESIGN.md "Keyboard (no pointer needed)" key table covers Down/Up, Alt+Down/Up, Home/End, Type, Enter, Esc, Tab. Screen-reader count: DESIGN.md "Result count" rule and a status region per state.
VERDICT:  PASS (notes: the 0-word variant choice and the All-categories count rule are open, see Cross-Pillar table)

## Edge cases (listed in the prompt)

### combobox with no results
EVIDENCE: sheet c4 (create offered in create mode) and c5 (no create in filter mode), both with "No categories match “biology”." in a non-option note row.
VERDICT:  PASS

### typed name matches an existing category with different case (no duplicate create offered)
EVIDENCE: sheet c3, typed "ielts" against "IELTS": the create row is absent, the match is highlighted, and the note reads "“IELTS” already exists. Press Enter to use it." DESIGN.md: "Choosing it keeps the stored name (never the typed case)."
VERDICT:  PASS

### long category name truncating in the chip, full name still available
EVIDENCE: sheet s5 Words card chip "IELTS vocabulary and academic writing words" with `.chip{max-width:14rem}` and `.chip>span{text-overflow:ellipsis}`, `title` on the chip, and the full name is in the DOM text. Word details dialog (s8) wraps the chip with `white-space:normal`. Pixel-level truncation not verified (thumbnail only).
VERDICT:  PASS

### keyboard-only use of the combobox
EVIDENCE: DESIGN.md Keyboard table (Down/Up with DOM focus kept on the input, Enter selects, Esc closes then restores, Tab reverts uncommitted text). The sheet's combobox uses `aria-activedescendant` and `role="combobox"`, and c3 includes "Press Enter to use it." as keyboard-facing copy.
VERDICT:  PASS

### screen-reader announcement of the result count (must match the category options shown)
EVIDENCE: Status region per state. c1 announces "3 categories" with four `role="option"` children, "All categories" being the fourth. DESIGN.md "Result count" explicitly excludes "All categories" from the count, so the announcement follows the written rule. c2, c3, c4, c7 and c8 match the category option count. c7 announces "50 of 214", matching the 50 rendered options.
VERDICT:  PASS (Note: the literal edge-case text and the DESIGN.md rule disagree on whether "All categories" is an option; see Cross-Pillar table)

**All requirements met:** NO (DW-3.1 blocked by the category row's missing state reasons)

## Notes (non-blocking)
- Pixel coverage: the 1280 and 390 screenshots were judged at thumbnail scale only. Layout claims at 390px (bottom bar label fit at 14px for "Categories", five items across 390px) are not pixel-verified.
- Detector: `nested-cards` hits are specimen-frame artifacts; `em-dash-overuse` is a regex false positive on CSS custom-property names. The detector's em-dash rule should be fixed upstream.
- Doctrine: the DESIGN.md Keyboard table and the content-design and usability references were applied as described above. Doctrine files were read in part; the interaction.md chapter was not read in full. Its focus-state claims were checked against DESIGN.md's own state table.

## Issues (if FAIL)
1. Category row state table (DESIGN.md line 346) gives no reason for Active and Disabled `-` entries. Severity: Minor. Pillar: design-systems. Principle: DW-3.1 spec requirement; Frost atomic state completeness. Fix: add a notes-column reason, for example "row is not focusable; its buttons own active and disabled".

**Verdict: FAIL — blocker: DW-3.1 (category row state reasons missing). No Critical or Major findings. All DW-3.2 and DW-3.3 items pass on the DOM and contract evidence; the edge cases pass with the Notes above.**
