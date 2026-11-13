# Discovery + Design: Phase 2 - Design DNA, type + color

## Artifacts Found / Current State

- `DESIGN.md`: absent (this phase creates it).
- `mocks/`: absent (this phase creates `mocks/dna-specimen.html`).
- `JOURNEY.md`: present at project root (Phase 1, committed). Defines 5-tab IA, flows F1–F6, 7 page specs. Phase 2 reads it for surface shape only (word card anatomy, chip, combobox, toast with Undo, dialog).
- Current look (to be replaced, per taste signals): Tailwind `teal-*` accent (`#0f766e` theme-color), `slate-*` neutrals, Hind Siliguri for Bangla via `:lang(bn)`, pill chips, `rounded-2xl` cards with `shadow-sm`, a "শ" tile favicon. No CSS custom properties; colors are hard-coded utility classes across 11 files.
- Stack facts that constrain the token shape: Vite SPA, Tailwind 3.4, `index.html` loads Google Fonts; `tailwind.config.js` only extends `fontFamily.bangla`. Phase 5 will point Tailwind's theme at CSS custom properties, so the token block must be plain `:root` custom properties (no Tailwind-specific syntax).

## Gaps

- No design DNA, no palette, no type scale exist. Everything in `**Produces:**` is net new.
- The plan asks for dark mode via `prefers-color-scheme`; `palette.mjs` emits dark under `[data-theme="dark"]`. The token block must therefore state the wiring (media query + optional `data-theme` override) so Phase 5 does not guess.
- `palette.mjs` reports 6 contrast pairs per mode. DW-2.1 says *all* text/background pairs. A supplementary checker (`contrast.mjs`, scratchpad) covers the remaining pairs the UI will actually use (text on background, functional text on functional subtle bg and on page bg, chip text on accent-3, etc.).
- Non-text 3:1 (inputs, solid buttons vs background) is Phase 3's DW-3.2, but the palette's `--accent-solid` in dark mode measures 2.98:1 vs background and `--border-strong` 2.27:1 (light). Leaving those as the only solid/border tokens would hand Phase 3 a seam that cannot pass. Resolved here by adding project semantic overrides (below), not by editing the verbatim palette output.

## Gate Status

- DESIGN.md locked? **No — this phase produces it as draft.** The user must confirm before it is law (DW-2.4 partial by design; reported to orchestrator).
- JOURNEY.md present? **Yes.**
- Prerequisites met? **Yes.** Phase 1 complete; `palette.mjs` and `dealer.mjs` run; Google Fonts reachable (Anek Latin, Anek Bangla, Newsreader, Noto Sans Bengali all return 200 with font-face blocks); Google Chrome available locally for headless screenshots (no browser MCP in this session).

## DW Verification

| DW-ID | Done-When Item | Status | Evidence |
|-------|---------------|--------|----------|
| DW-2.1 | All text/background pairs pass WCAG AA (≥4.5:1 body, ≥3:1 large) via `palette.mjs`, light + dark | COVERED | `palette.mjs --seed 277.78 --chroma muted --harmony mono` exit 0, 12/12 PASS; supplementary `contrast.mjs` 30/30 text pairs PASS in both modes (lowest: light success-11 on success-3 5.19:1; dark error-11 on error-3 7.83:1). Report pasted in DESIGN.md. |
| DW-2.2 | Semantic aliases (`--background`, `--surface`, `--text`, `--accent-solid`, …) and functional colors (`--error/success/warning/info-*`) defined | COVERED | Verbatim palette block carries all 13 aliases + 4×3 functional tokens in both modes; project override block adds `--border-interactive`, `--rule`, dark `--accent-solid` remap. Tokens-applied evidence: specimen `:root` uses them, no hex in component CSS. |
| DW-2.3 | Type scale `--text-xs`…`--text-4xl` present, with Latin + Bangla families | COVERED | DESIGN.md `## Type` defines 8 steps with paired line-heights, `--font-display`, `--font-body`, `--font-bn` with explicit Bangla fallback stack; specimen renders the full scale in Latin and Bangla side by side (render evidence: screenshot). |
| DW-2.4 | DESIGN.md token block locked (present + user-confirmed); Phase 3 appends `## Components` without altering tokens | COVERED (present) / PENDING (confirmation) | File present at root with `Status: draft — awaiting user confirmation` and an explicit "Phase 3 appends `## Components`; tokens are frozen on confirmation" note. User confirmation cannot be obtained by this agent; the handback lists what to confirm. |

**All items COVERED:** YES (DW-2.4's confirmation half is pending by instruction, not unmet).
**Count check:** 4 DW-IDs in prompt, 4 in table.

## Design Decisions

### Pins and the deal
Non-interactive dispatch: pins come from the plan's taste signals only. "Restrained accent, low visual noise" pins `chroma=muted`. No family/hue/discipline pin is stated, so they were dealt:
`node dealer.mjs --project shobdopractice --date 2026-11-13 --candidates 5 --pin chroma=muted` (ledger saved to `.design-foundations/used-dna.json`).

| # | Family | Composition (variance) | Hue | Signature | Critique (distinctiveness / register fit / tells) |
|---|--------|------------------------|-----|-----------|----------------------------------------------------|
| 1 | Editorial Minimalism | Editorial Spread (7) | violet 277.78 | baseline ruler | Strongest fit: Sage's primary family, literally the "typography does the work, hairlines not cards" register in the brief. Risk: muted violet sits next to the purple-triplet tell; guarded by muted chroma and a no-gradient/no-chroma-raise rule. |
| 2 | Soft Futurism | Marginalia (5) | amber 55 | accent scarcity | Marginalia suits word cards on desktop; amber paper is cosy. But Soft Futurism's translucency/blur is the glassmorphism tell, and amber + editorial serif triangulates toward the cream/serif/terracotta escape-hatch cluster. Its signature (accent scarcity) is borrowed as a rule, see Never list. |
| 3 | Neo-Brutalist | Ledger Grid (2) | teal 193 | box-drawing borders | Teal is the look the user released; thick borders contradict "calm". Not viable. |
| 4 | Data-Dense Professional | Frieze Bands (4) | pink 330 | logo polygon mask | Density is the aesthetic; brief says "not dense like Linear". No imagery to mask. Not viable. |
| 5 | Retro-Futurist | Fractured Grid (9) | lime 108 | marginalia stamps | Brand-register family; collisions and lime contradict every taste signal. Not viable. |

**Converge:** hand 1 executed as dealt (family, discipline, hue, signature), no swaps. Hand 2's "accent scarcity" is adopted as a discipline rule, not as a signature swap. The user may re-deal (`--reroll 1`) or swap hue/fonts at confirmation; the handback offers that.

### Archetype
**Sage** (truth, understanding; measured, precise; muted palette, serif or technical type, no decoration) with a **Caregiver** inflection on one dimension only: reassurance copy and gentle functional colors at destructive/miss moments (JOURNEY emotion valleys). Derived from "professional, user-friendly", "calm", study/learning content. Sage's primary families: Editorial Minimalism, Swiss — the dealt family is in-set.

### Grounding
Readwise Reader's reading-first hierarchy (the text is the interface; chrome recedes) + a ruled exercise notebook's margin line (the khata every Bangla-medium student has written vocabulary lists in). The collision: an app where each English word is set like a headline on ruled paper, with the Bangla meaning as its deck.

### Four axes
- **Type voice (dominant):** Newsreader (display serif, screen-tuned optical sizes) for the English word and page titles over an Anek Latin + Anek Bangla body. Anek is one superfamily drawn together by Ek Type, so Latin and Bangla share x-height, weight and rhythm by construction — the only Google Fonts pairing where "matched x-height/weight" is designed rather than approximated. Serif display vs sans body is deliberate contrast (appendix: harmony or contrast, never the middle). Fallback stack for Bangla is explicit (Noto Sans Bengali → Hind Siliguri → Nirmala UI → Vrinda → sans-serif) so a missing webfont degrades to a Bengali sans, never to a tofu or a mismatched serif.
- **Color strategy:** seed violet 277.78, muted, mono harmony. Reads as fountain-pen ink on cool paper: lavender-grey neutrals, one dusty iris accent. Justification before the script ran: cool hues calm in analytical/performance contexts (ch09; this is a quiz surface), it avoids red as a dominant, it is neither the released teal nor the warm-cream cluster, and ink/stationery is the content's own material. Functional colors come from the palette and always pair with an icon or word (ch08 colorblind rule).
- **Composition (dealt):** Editorial Spread, variance 7. Justification: the display type the discipline wants *is* the word being learned; the Bangla meaning is the deck; UI is the body column. Variance 7 is dialed to the product structure register: asymmetry is left-anchored (content hangs off the margin rule), never column-crossing on phone. The 1/2-column card grid from JOURNEY survives as the "modest body columns".
- **Motion vocabulary (borrowed from Swiss/International):** state-only, 120/180/260 ms, sharp ease-out. Editorial Minimalism's 200–300 ms fades are too slow for a type-and-verify loop. One borrowed axis; type dominates.

### Signature move
**The margin rule.** A single 1px vertical rule in `--rule` (accent-7) runs down the left edge of the main column on every page; headings, cards and list rows hang from it with a fixed 20px gutter. On the word card the English word sits flush against the rule. Nothing else is decorated.

### Register
Structure register: calm throughout (nav, forms, lists, Settings). Expressive moments: (1) the word card headline (Newsreader 2xl/3xl word, Bangla deck) — medium amplitude; (2) the Login lockup (wordmark + "শব্দ") — medium; (3) the "all words in <Category> are learned" state — low, warmth via copy and success-3 panel, no illustration.

### Tells scan (ai-tells.md)
- Fonts: not Inter/Roboto/Open Sans/system-ui/Space Grotesk. Pass.
- Color: violet adjacent to the purple-triplet hex cluster; the accent is #5358ad / #646bbd (muted, L≈0.45), not #6366F1-#A855F7. Guard written into Never. No gradients, no cyan-on-dark, no dark-by-default (dark follows OS).
- Layout: hairlines + margin rule, no nested cards (Fable 5's top tell), chips squared not pill, left-aligned text, Login lockup is the only centered element.
- Detail: shadows only on dialog and toast, hue-shifted from accent-12; no glass, no glow.
- Motion: no bounce, no stagger, no hover-everything.
- Copy: spaced en dashes; no aphoristic pairs.

### Tool use
- `palette.mjs` generates both ramps + report (verbatim in DESIGN.md).
- `contrast.mjs` (scratchpad, 40 lines) checks the 20 pairs per mode the palette does not.
- `prototype` recipe followed for the specimen (self-contained HTML, tokens in `:root`, reduced-motion rule, Google Fonts link); screenshot via headless Google Chrome because no browser MCP is attached.

## Recommendation

**BUILD** — produce DESIGN.md (draft, awaiting confirmation) and `mocks/dna-specimen.html` with screenshot(s).
