# Discovery + Design: Phase 1 - Journey

## Artifacts Found / Current State
- No DESIGN.md, no JOURNEY.md (confirmed). Plan + research brief read.
- Current app (src/): 4 nav tabs (Practice, All Words, Add, Settings-as-emoji) in a top header; Login (email-only local accounts); Practice lists `status:"practice"` words as WordCards (type-the-spelling + Verify, VerifyDialog, move button, details); All Words lists `status:"all"` with text search + sort; Add = Look up -> preview -> "Save to Practice", duplicate detection with link to existing word; WordDetails dialog = view/Edit/Retry lookup/Delete; Settings = Account, export, import (merge/replace), delete account. Storage v1 `shobdo:v1`; `importWords` merge matches by id then wordKey, newer `updatedAt` wins.

## Gaps
- No category concept anywhere; no Categories page; nav has 4 destinations and an emoji gear.
- Open questions in the research brief that Phase 1 must settle (decisions in JOURNEY.md): Uncategorized rename (decided: fixed, not renamable), practice-filter persistence (yes, per account), badge counts (totals), nav on phone (bottom bar), merge-import collisions (same name -> existing).
- Import today reads only words; categories/collision summary is new surface.

## Gate Status
DESIGN.md absent (Phase 2 creates it; Phase 1 is visual-agnostic, so no lock conflict). JOURNEY.md is the artifact being produced. Prerequisites met.

## DW Verification
| DW-ID | Done-When Item | Status | Evidence |
|-------|---------------|--------|----------|
| DW-1.1 | Page specs for 6 pages + dialog with purpose/blocks/states/primary action | COVERED | Structural check: `## Page specs` has 7 `###` entries, each with Purpose, Content blocks, States (empty/filtered/error), Primary action (grep) |
| DW-1.2 | Flows: inline-create, focused practice, delete-with-reassign, import collision | COVERED | `## Flows` has F1-F6 incl. the four named; grep headings |
| DW-1.3 | Each edge case placed on a page spec | COVERED | Edge-case index table in JOURNEY.md maps all 6 edge cases to a page + state anchor; verified by cross-reference |
**All items COVERED:** YES (3/3, matches prompt count)

Evidence kind note: this phase has no tokens/mock (contrast and render N/A); evidence is structural verification of the JOURNEY.md text.

## Design Decisions
- JTBD school: Moesta (job story + four forces); forces are inferred from the brief, marked UNGROUNDED (no interviews).
- IA: hub-and-spoke by task, 5 flat destinations (Hick 1952: 5 is small enough to show all; Gibbons/NN-g bottom bar rule of 3-5 on phone). Phone bottom tab bar, desktop top nav. Account switch moves into Settings on phone.
- Single shared filter component (Jakob's law, consistency #4); filter hidden when only Uncategorized exists (Hick: remove choice with no value).
- Category selection in Add is always populated (last used, else Uncategorized) - satisfies "required" without blocking (Nielsen #5 error prevention).
- Delete is safe-by-design: confirm states exact consequence + Undo toast (Nielsen #3 user control).
- 200+ categories: search-first, capped result list with "showing N of M", no per-category decoration.
- Uncategorized: built-in, not renamable or deletable (keeps the fallback target stable).

## Recommendation
BUILD
