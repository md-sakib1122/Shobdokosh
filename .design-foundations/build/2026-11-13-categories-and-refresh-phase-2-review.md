# Design Review: Phase 2 - DNA specimen / tokens (Ruled Ink)

## Rendered Evidence
- Screenshots: mocks/dna-specimen-1280.png, mocks/dna-specimen-390.png (both read). Surface: mocks/dna-specimen.html + DESIGN.md token block.

## Assessment B
- Command: node scripts/detect.mjs mocks/dna-specimen.html > .design-foundations/build/detect-p2.json. Exit 0 (ran).
- Findings: 4 x nested-cards (lines 309, 310, 329, 330: input and Verify button inside .card). Opened only after A was frozen: YES.

## Triage
Baseline visual + usability; design-dna/color/fonts/ai-tells applied (type scale, palette, Bangla specimen). Not applicable: data-viz, behavioral, journey, content-design (specimen copy only).

## Findings
| Severity | Pillar | Problem | Principle | Fix |
|---|---|---|---|---|
| Minor | detector / visual | nested-cards x4: input and button inside card. False positive: they are form controls, not cards. Register-justified. | ai-tells nested-cards; controls inside a surface are standard | None; Note only |
| Minor | color | Light neutral ramp not monotone: neutral-9 #60626e, neutral-10 #50525c, neutral-11 #62636a (11 lighter than 10). Visible in swatch strip. Only 11/12 are used as text, so no contrast impact. | Ramp ordering / palette consistency (color doctrine) | Note for Phase 3; don't use neutral-10 as a "step" |
| Minor | design-dna | h2.sec is uppercase with letter-spacing .02em and the xs sample is caps; DESIGN.md says "never letterspaced caps". | Internal consistency with the DESIGN.md contract | Drop text-transform or amend the rule before lock |
| Minor | usability | The mock defines dark only under [data-theme="dark"]; no prefers-color-scheme block. DESIGN.md describes the media wiring in prose rather than literal CSS, so it must be built in Phase 3. | Nielsen #4 / spec completeness | Phase 3 must emit both selectors |
| Note | contrast | Dark accent-solid (#646bbd) vs background is 3.88:1 and vs surface 3.66:1. Both meet 3:1 non-text. On-solid label 4.60:1 (AA, thin margin). Light non-text: border-interactive 5.94:1, focus 6.12:1. Decorative --border 1.73:1 (not interactive). | WCAG 1.4.3 / 1.4.11 | None |

Distinctiveness: PASS. Direction nameable as "ruled-notebook editorial": margin rule, Newsreader display + Anek Bangla/Latin, muted iris. Not generic. Phone 390px and desktop both render cleanly; Bangla renders in Anek Bangla at every step with no tofu and room in the line-height.

## Requirement Fulfillment
### DW-2.1
PREMISE: all text/background pairs pass WCAG AA (>=4.5:1 body, >=3:1 large), verified via palette.mjs, in both light and dark ramps
EVIDENCE: palette.mjs re-run (exit 0): 12 of 12 PASS, light and dark. My independent computation of supplementary pairs agrees with DESIGN.md (text-secondary on bg 5.87/9.29, accent-text on chip 5.38/7.87, status -11 on -3 all >=5.19). The one failing token pair (dark accent-9 as solid) was overridden to accent-10 (4.60:1 label), and border-interactive and focus-ring overrides give >=3:1. The rendered swatch labels match (4.6:1, 6.0:1).
VERDICT: PASS

### DW-2.2
PREMISE: semantic aliases resolved (--background, --surface, --text, --accent-solid, ...) and functional colors (--error/success/warning/info-*) defined
EVIDENCE: Both :root and [data-theme="dark"] define --background, --surface, --surface-hover/active, --border*, --text, --text-secondary, --accent-bg-subtle, --accent-solid(-hover), --accent-text, plus error/success/warning/info -3/-9/-11. Rendered as the status tiles in both modes.
VERDICT: PASS

### DW-2.3
PREMISE: type scale --text-xs...--text-4xl present, with Latin + Bangla families
EVIDENCE: Mock lines 64-68 and DESIGN.md define --text-xs to --text-4xl with paired leadings; --font-display, --font-body, --font-bn (Anek Bangla then a Bengali-only fallback stack ending in sans-serif) applied via :lang(bn), .bn. The specimen renders all 8 steps in both scripts.
VERDICT: PASS

### DW-2.4
PREMISE: DESIGN.md token block present (user confirmation handled separately)
EVIDENCE: DESIGN.md contains the type block, full light/dark color blocks, semantic overrides, and the contrast report. Status is "draft" (confirmation out of scope).
VERDICT: PASS

### Edge cases
- Contrast fails AA: handled. The failing dark accent-solid is overridden, and the checked interactive non-text pairs pass 3:1. PASS.
- Bangla fallback: explicit stack, Bengali-sans-only, no serif or tofu path. PASS.

**All requirements met:** YES

## Verdict: PASS (no Critical or Major findings; 4 Minor, 1 Note)
