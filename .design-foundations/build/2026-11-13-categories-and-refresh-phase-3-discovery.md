# Discovery + Design: Phase 3 - Design system + words

## Artifacts Found / Current State
- `DESIGN.md` (locked, "Ruled Ink", 291 lines): token block, semantic overrides, type scale, motion, Never-list. No `## Components` yet. Spacing, radius and duration/easing values exist only as prose, not as CSS custom properties.
- `JOURNEY.md` (252 lines): 7 page specs, flows F1-F6, edge-case index. Microcopy is explicitly provisional (hyphens, "Practise", "All Words" heading option).
- `tailwind.config.js`: bare (only a `bangla` font family). Tailwind 3.4 (no `/<alpha>` support for `var()` colors).
- `src/components/*`: current emoji-era UI (Layout, Toast, WordCard, WordDetails, VerifyDialog). Not touched this phase.
- `mocks/`: Phase 2 specimen only. No components sheet.

## Gaps
1. Structural tokens (`--space-*`, `--radius-*`, `--duration-*`, `--ease-*`) are prose only; Tailwind cannot reference them. Fix: define a *structural token* CSS block inside `## Components` (append-only; the locked colour/type block is not touched).
2. No component tier: no states, focus ring recipe, or touch-target rule per component.
3. Carried review notes: (a) no letterspaced uppercase section labels; (b) dark tokens must be emitted both under `@media (prefers-color-scheme: dark)` + `:root:not([data-theme="light"])` and under `[data-theme="dark"]`; (c) dark on-solid label is 4.60:1, so primary buttons never go below `--text-base`/600.
4. Highlight state inside the listbox (`aria-activedescendant`) needs a non-colour-only indicator >= 3:1; `--surface-hover` vs background is ~1.1:1 so a bar indicator is required.
5. Practice card is a spelling prompt (Bangla shown, English hidden) whereas DESIGN.md Expressive moment 1 describes the English word as headline. Needs an explicit two-mode card spec.
6. DESIGN.md expressive moment 3 copy ("All words in <Category> are learned") differs from JOURNEY ("...are in Words"). Resolve in favour of DESIGN.md.
7. Allowed category characters were never defined ("bad characters"). Define the set in microcopy; Phase 5 validates identically.

## Gate Status
DESIGN.md locked and honoured (append only). JOURNEY.md present. Prerequisites (Phases 1 and 2) met. Plugin `palette.mjs` and headless Google Chrome available; no browser MCP (same as Phase 2).

## DW Verification
| DW-ID | Done-When Item | Status | Evidence |
|-------|---------------|--------|----------|
| DW-3.1 | every component has states (default/hover/focus/active/disabled/error) mapped to semantic tokens only | COVERED | `## Components` state tables (token per state, `N/A` only with a stated reason); `mocks/components.html` renders every state in light + dark; a grep proves no hex/hue literal inside the component CSS |
| DW-3.2 | interactive elements pass AA non-text (>=3:1); focus ring specified | COVERED | `scripts`-style contrast run (WCAG formula) over every non-text pair in both modes, exit 0; focus ring spec (2px, offset 2px, `--focus-ring`) with ratios vs background/surface/hover surfaces |
| DW-3.3 | microcopy defined for every edge case in Phases 1 and 3 | COVERED | JOURNEY.md `## Microcopy` with an edge-case matrix: every row of the Phase 1 edge-case index + Phase 3 edge cases (combobox no results, case-different match, long-name truncation, keyboard-only, result-count announcement) mapped to a string and its page spec |
**All items COVERED:** YES (3/3)

## Design Decisions
- **Component tier on top of semantic tokens** (design-systems doctrine; Frost atoms -> molecules; Kholmatova functional vs perceptual patterns). Atoms: button, field, radio/checkbox, chip, badge, icon button. Molecules: combobox, word card, toast, panel/notice, category row, dialog. Organisms: nav, page header. Components use semantic aliases only; no `--neutral-*`/`--accent-N` steps inside component rules.
- **Focus ring**: one rule for all, `outline: 2px solid var(--focus-ring); outline-offset: 2px` on `:focus-visible` (fields: on `:focus`). Inside clipped/edge containers (nav, listbox options) offset -2px. Never `outline: none` without this. (WCAG 2.4.7, 1.4.11.)
- **Listbox highlight**: `--surface-hover` fill + 2px inset bar in `--accent-solid` (not a border; a state indicator). Selected option: check glyph + `aria-selected`. Meaning never rides on colour alone (WCAG 1.4.1; Norman signifiers).
- **Current nav item**: icon stroke weight, label 600 + `--accent-text`, 2px indicator bar in `--accent-solid` (an indicator, not a border).
- **Danger**: outlined/tinted (`--error-3` fill, `--error-11` text and border), never solid red (DESIGN.md Never: no red dominant).
- **Combobox**: ARIA 1.2 editable combobox with list autocomplete (APG). DOM focus stays in the input; `aria-activedescendant` points at the highlighted option. Three modes: *filter* (Practice/Words: "All categories" row first, no create), *create* (Add: create row last, remembered category first), *change* (Word details: no All, no create, hint link when empty). Exact case-insensitive match auto-highlights the existing row and removes the create row. Cap 50 results with a "Showing 50 of N" footer; polite status region announces the count (debounced 300ms).
- **Words vs All Words**: nav label and page heading are both "Words" (one term, shorter for the 5-item phone bar; Hick/consistency, Nielsen #4).
- **Copy voice**: plain, sentence case, no exclamation marks, curly quotes around user-supplied names, spaced en dashes, US "practice" for noun and verb (matches the nav label). Errors: what happened, then what to do (Yifrah). Destructive dialogs: consequence first, Cancel is default focus (Nielsen #5).
- **Chip**: non-interactive in v1 (so no 44px target and no boundary contrast duty); truncates at 14rem with `title` for the full name; the full name is always readable in Word details where it wraps (hover titles do not exist on touch).
- **Tools reused**: `palette.mjs` re-run unchanged tokens for exit-0 evidence; theme CSS in the mock is *generated from DESIGN.md's fenced blocks* by script (no hand-copied hex) and emits dark under both selectors; screenshots by headless Chrome.

## Recommendation
BUILD
