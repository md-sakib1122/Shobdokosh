# Plan: Vocabulary Categories + Calm Visual Refresh

**Status:** in-progress
**Started:** 2026-11-13
**Current Phase:** 1
**Track:** Full
**Entry stage:** Discover (no DESIGN.md, no JOURNEY.md)
**Seed:** .design-foundations/research/2026-11-13-vocabulary-categories-and-refresh.md
**Workspace:** branch `feature/categories-refresh` (baseline `0d9bb51` on `main`)

## Context

Redesign ShobdoPractice, a spelling and vocabulary app for Bangla-speaking English learners, as a calm, professional study tool. At the same time, add user-managed vocabulary categories so a learner can focus practice on one list. Each word has exactly one category. Categories are picked from a searchable dropdown when adding a word, and Practice and All Words filter by category.

## Constraints (confirmed problem statement)

- **Stack:** React 18 + TypeScript + Tailwind 3, localStorage only (`shobdo:v1`), no backend. Data migrates v1 → v2 without loss. Existing words go into a built-in, undeletable **Uncategorized** category.
- **Devices:** phone and desktop are equally first-class. Phones use a **bottom tab bar** (Practice, Words, Add, Categories, Settings). Desktop uses top or side navigation.
- **Identity:** fresh start. Calm study tool (Notion/Readwise register): generous white space, soft neutrals, one restrained accent. Bangla script must render well.
- **Category names:** English only, 1–40 characters (letters, digits, spaces, `- & ' ( ) /`). Case-insensitive duplicates are blocked. No per-category color or icon.
- **Add:** category is required. The dropdown remembers the last category used and offers inline "+ Create '…'".
- **Categories tab:** list with counts, search, create, rename, delete. Deleting moves the category's words to Uncategorized.
- **Practice and All Words:** share one searchable single-select filter with "All categories" on top. Practice remembers its selection and shows a visible filtered state with a clear button. Word cards show a category chip. Word details can change the category.
- **Badges** show totals. **Export** includes categories. Merge-import maps a same-name category to the existing one. Old files import into Uncategorized.
- **Accessibility:** WCAG AA in light and dark mode, 44px targets, keyboard-operable combobox (ARIA 1.2 combobox pattern).

### Taste signals (dealer pins, verbatim from research)
- **Calm over clever.** Restrained accent, low visual noise.
- **No attachment to the current look.** The teal color, the "শ" tile logo, and Hind Siliguri are all open to replacement.
- The user picked "professional, user-friendly" over decoration.

## Chosen Approach

Discover first (JOURNEY.md), then lock the DNA (DESIGN.md), then systematize the components and words, then prove the direction on mocks, then implement in the app. Implementation honours the locked tokens: no hard-coded hex values; Tailwind theme reads CSS custom properties.

## Rejected Approaches
- **Restyle only the new parts:** rejected by the user, who asked for a whole-app refresh.
- **Multi-category tags:** rejected. The user chose one category per word.
- **Separate category colors:** rejected because they work against "calm" and don't scale to many categories.

## Assumptions
- Light and dark mode are both in scope, with dark following `prefers-color-scheme`.
- Bangla appears in meanings and pronunciations only. Category names are English.

---

### Phase 1: Journey — jobs, IA, flows, page specs
**Stage:** Discover
**Model:** sonnet
**Doctrine:** journey, usability
**Gate:** Standard

**Goal:** Specify how learners create, assign, filter and manage categories across all six surfaces.

**Scope:**
- IN: job stories, IA/sitemap with 5 nav destinations plus Login, flows (add word + inline create, focused practice, rename/delete category, import), page specs for Login, Practice, Words, Add, Categories, Settings, and the Word-details dialog
- OUT: visual styling, final copy (Phase 3)

**Edge cases:** zero categories besides Uncategorized; 200+ categories; deleting the category that is currently filtered or remembered; a filtered Practice view with 0 words; renaming to a duplicate name; a remembered category that no longer exists.

**Produces:** `JOURNEY.md` (sections: Job, Journey, IA, Flows, Page specs)
**Depends on:** research doc | **Unlocks:** Phase 2

**Done when:**
- [ ] DW-1.1: JOURNEY.md `## Page specs` has entries for all 6 pages + Word-details dialog; each lists purpose, content blocks, states (empty/filtered/error), and primary action
- [ ] DW-1.2: Flows cover inline-create, focused practice, delete-with-reassign, and import collision
- [ ] DW-1.3: Every edge case above is placed on a specific page spec

### Phase 2: Design DNA, type + color — lock DESIGN.md
**Stage:** Design
**Model:** fable
**Doctrine:** foundations, archetypes, design-dna, fonts, color, ai-tells
**Gate:** Full

**Goal:** Create the calm study-tool identity and lock it as DESIGN.md tokens.

**Constraints:** taste-signal pins above; a Latin + Bangla font pairing with matched x-height/weight; one accent; light and dark ramps.
**Edge cases:** contrast fails AA → the token is rejected; Bangla glyph fallback renders in a mismatched font.

**Produces:** `DESIGN.md` (register, archetype, personality, token block, type scale, motion budget), locked after user confirmation
**Depends on:** Phase 1 | **Unlocks:** Phases 3, 4, 5

**Done when:**
- [ ] DW-2.1: all text/background pairs pass WCAG AA (≥4.5:1 body, ≥3:1 large), verified via `palette.mjs`, in both light and dark ramps
- [ ] DW-2.2: semantic aliases resolved (`--background`, `--surface`, `--text`, `--accent-solid`, …) and functional colors (`--error/success/warning/info-*`) defined
- [ ] DW-2.3: type scale `--text-xs`…`--text-4xl` present, with Latin + Bangla families
- [ ] DW-2.4: DESIGN.md token block locked (present + user-confirmed); Phase 3 later appends `## Components` without altering tokens

### Phase 3: Design system + words
**Stage:** Design
**Model:** sonnet
**Doctrine:** design-systems, interaction, content-design, usability
**Gate:** Full

**Goal:** Specify the component machine and every user-facing string for the new and restyled surfaces.

**Scope:**
- IN: specs for the category combobox (filter and create modes), word card, category chip, bottom nav / desktop nav, dialog, confirm-delete, empty states, toast, buttons, and inputs; microcopy for empty, filtered, error, delete and import states
- OUT: data viz (none present)

**Edge cases:** combobox with no results; a typed name matching an existing category with different case; a long category name truncating in the chip; keyboard-only use; screen-reader announcement of the result count.

**Produces:** `DESIGN.md` `## Components` section + `JOURNEY.md` page specs updated with microcopy
**Depends on:** Phase 2 | **Unlocks:** Phase 4

**Done when:**
- [ ] DW-3.1: every component has states (default/hover/focus/active/disabled/error) mapped to semantic tokens only
- [ ] DW-3.2: interactive elements pass AA non-text (≥3:1); focus ring is specified
- [ ] DW-3.3: microcopy defined for every edge case in Phases 1 and 3

### Phase 4: Mocks
**Stage:** Design
**Model:** sonnet
**Doctrine:** responsive, surface, ai-tells
**Gate:** Standard

**Goal:** Prove the direction on pixels for Practice (filtered), Add (combobox open), and Categories, at phone and desktop widths.

**Produces:** `mocks/practice.html`, `mocks/add.html`, `mocks/categories.html` + screenshots
**Depends on:** Phases 1–3 | **Unlocks:** Phase 5

**Done when:**
- [ ] DW-4.1: mocks render (self-contained `.html`, no missing deps) at 390px and 1280px
- [ ] DW-4.2: no hard-coded hex in the mocks; all colors come from DESIGN.md custom properties
- [ ] DW-4.3: cross-pillar review (usability, ai-tells, responsive) on rendered screenshots returns no Critical findings; Majors resolved or explicitly accepted

### Phase 5: Implement in the app
**Stage:** Design (implementation phase, user-requested)
**Model:** opus (explicit override: production code)
**Doctrine:** usability, interaction
**Gate:** Full

**Goal:** Ship the categories feature and the refresh in the React app, faithful to DESIGN.md and JOURNEY.md.

**Scope:**
- IN: storage v2 + migration + import/export, category CRUD, the shared combobox, Add/Practice/Words/Categories/Settings/Login/WordDetails, bottom nav, tokens wired into Tailwind, dark mode, tests
- OUT: backend or sync

**Edge cases:** a v1 document loads and migrates; invalid v2 data is rejected; a v1 export file imports; the remembered category was deleted.

**Produces:** `src/` changes on `feature/categories-refresh`; passing `npm run build` output
**Depends on:** Phases 1–4

**Done when:**
- [ ] DW-5.1: `npm test` and `npm run build` pass, with new tests for migration, category CRUD, import merge, and filtering
- [ ] DW-5.2: no hard-coded hex in `src/`; colors come from tokens
- [ ] DW-5.3: cross-pillar review (usability, interaction) on screenshots of the running app returns no Critical findings; Majors resolved or explicitly accepted

---

## Execution Log
