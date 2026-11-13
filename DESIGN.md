# Design: Ruled Ink

**Date:** 2026-11-13 · **Status:** confirmed (locked 2026-11-13 — user approved "Ruled Ink")
**Archetype:** Sage (Caregiver inflection on reassurance only) · **Register:** calm product structure · expressive at: the word-card headline, the Login lockup, the "all learned" state
**Grounding:** Readwise Reader's reading-first hierarchy (text is the interface, chrome recedes) + a ruled exercise notebook's margin line (the khata vocabulary list)
**DNA:** Editorial Minimalism + motion vocabulary from Swiss/International · **Dominant axis:** type voice
**Composition:** dealt — Editorial Minimalism × Editorial Spread, variance 7 (dealer seed `shobdopractice|2026-11-13|0|pin:chroma=muted`, hand 1 of 5; ledger `.design-foundations/used-dna.json`)
**Pins:** chroma=muted (from the plan's taste signals). Family, discipline, hue and signature executed as dealt; no converge-time swaps.

Locking rule: on user confirmation this file becomes law. Phase 3 appends `## Components` beneath `## Never`; it must not alter any token value above that heading. Any later change to a token goes through an edit to this file first, never through code.

## Direction

A calm study tool for Bangla speakers learning English words. The English word is set like a headline on ruled paper; its Bangla meaning is the deck beneath it; everything else (navigation, filters, buttons, counts) is quiet body-column chrome. Colour is fountain-pen ink on cool paper: lavender-grey neutrals and one dusty iris accent, used sparingly. Phone and desktop get the same material; the desktop simply shows more columns of it.

Personality in three words: measured, legible, unhurried.

## Signature move

**The margin rule.** One 1px vertical rule (`--rule`) runs down the left edge of the main content column on every page, from below the header to the end of the content. Page title, filter bar, cards and list rows hang from it with a fixed 20px gutter (`--space-5`). On the word card the English word sits flush against the rule; the card itself has no left border where it meets the rule. Nothing else is decorated: no icons above headings, no colour bands, no second accent.

## Expressive moments

1. **Word-card headline** (Practice, Words, Word-details). The English word in `--font-display` at `--text-3xl` (desktop) / `--text-2xl` (phone), weight 500; the Bangla meaning directly beneath in `--font-bn` at `--text-lg`, weight 500, `--text`; pronunciation in `--text-secondary`. Amplitude: medium. This is the only place display type appears besides page titles.
2. **Login lockup.** The wordmark, with "শব্দ" set beneath in `--font-bn` at `--text-xl`, `--text-secondary`. The only centred composition in the app. Amplitude: medium.
3. **"All words in <Category> are learned"** (Practice filtered-empty, variant a). A `--success-3` panel with a check glyph and one warm sentence. Amplitude: low — colour and copy only, no illustration.

Everything else holds the structure register.

## Logo / wordmark

- **Wordmark:** "Shobdo" in Newsreader 500 immediately followed by "Practice" in Newsreader 400, same size (`--text-xl` in the header, `--text-3xl` on Login), both in `--text`. No colour split, no icon in the wordmark.
- **Mark** (favicon, phone header, PWA icon): the margin-rule motif. A rounded square (radius 22% of side) filled `--background`, hairline border `--border`; inside, one vertical rule in `--accent-solid` at 30% of the width and three short horizontal hairlines in `--border` to its right at 40/55/70% height — a ruled page. Monochrome variant: all strokes in `--text`. The "শ" tile is retired.
- **Secondary lockup:** mark + wordmark, mark on the left, 8px gap, used in the desktop header only.

## Type

- Display: **Newsreader** (Google Fonts, variable `opsz 6..72`, `wght 400;500`) — `--font-display: "Newsreader", Georgia, "Times New Roman", serif;` `font-optical-sizing: auto`. Screen-tuned serif with a near-vertical axis; used only for the English word, page titles and the wordmark.
- Body (Latin): **Anek Latin** 400/500/600 — `--font-body: "Anek Latin", system-ui, -apple-system, "Segoe UI", sans-serif;`
- Body (Bangla): **Anek Bangla** 400/500/600 — `--font-bn: "Anek Bangla", "Noto Sans Bengali", "Hind Siliguri", "Nirmala UI", "Vrinda", "Kohinoor Bangla", "Bangla Sangam MN", sans-serif;` applied via `:lang(bn), .bn`. Anek Latin and Anek Bangla are one superfamily (Ek Type) drawn with shared x-height, weight and rhythm, so mixed-script lines sit on one baseline without optical correction. The fallback stack is Bengali-sans-only so a missing webfont never falls to a serif or to tofu. Every Bangla string must carry `lang="bn"`.
- Google Fonts request (one `<link>`): `https://fonts.googleapis.com/css2?family=Anek+Bangla:wght@400;500;600&family=Anek+Latin:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500&display=swap`
- Scale: 1.2-ish steps from 16px, paired line-heights (Bangla lines use `--leading-bn` because the headline stroke and descenders need room):

| Token | Size | Line-height | Use |
|-------|------|-------------|-----|
| `--text-xs` | 0.75rem (12px) | 1rem | counts, chip, footnotes |
| `--text-sm` | 0.875rem (14px) | 1.25rem | labels, nav labels, secondary text |
| `--text-base` | 1rem (16px) | 1.5rem | body, inputs, buttons |
| `--text-lg` | 1.125rem (18px) | 1.75rem | Bangla meaning on cards |
| `--text-xl` | 1.25rem (20px) | 1.75rem | header wordmark, dialog titles |
| `--text-2xl` | 1.5rem (24px) | 2rem | word on phone cards; page titles on phone |
| `--text-3xl` | 1.875rem (30px) | 2.25rem | word on desktop cards; page titles on desktop |
| `--text-4xl` | 2.25rem (36px) | 2.5rem | Login wordmark |

- Leading: body 1.5 · Bangla body 1.6 (`--leading-bn`) · display 1.2 · Weights: 400 body, 500 emphasis/labels/display, 600 button labels and counts. No 700; no faux bold or faux italic (Newsreader italic may be loaded in Phase 3 for example sentences).
- Tracking: display `-0.01em`; `--text-xs` labels `+0.02em`; never letterspaced caps.

```css
:root {
  --font-display: "Newsreader", Georgia, "Times New Roman", serif;
  --font-body: "Anek Latin", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-bn: "Anek Bangla", "Noto Sans Bengali", "Hind Siliguri", "Nirmala UI", "Vrinda", "Kohinoor Bangla", "Bangla Sangam MN", sans-serif;
  --text-xs: 0.75rem;   --leading-xs: 1rem;
  --text-sm: 0.875rem;  --leading-sm: 1.25rem;
  --text-base: 1rem;    --leading-base: 1.5rem;
  --text-lg: 1.125rem;  --leading-lg: 1.75rem;
  --text-xl: 1.25rem;   --leading-xl: 1.75rem;
  --text-2xl: 1.5rem;   --leading-2xl: 2rem;
  --text-3xl: 1.875rem; --leading-3xl: 2.25rem;
  --text-4xl: 2.25rem;  --leading-4xl: 2.5rem;
  --leading-bn: 1.6;
  --leading-display: 1.2;
}
```

## Color tokens

Generated by `palette.mjs --seed 277.78 --chroma muted --harmony mono` (exit 0). Pasted verbatim. **Wiring:** the light block lives in `:root`; the dark block is emitted twice — under `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … } }` so dark follows the OS, and under `[data-theme="dark"]` so a future manual toggle can force it. Tailwind reads these via `theme.extend.colors` with `var(--token)` values; no hex may appear in `src/`.

```css
/* Generated by design-for-ai palette.mjs */
/* seed: hue 277.78 · chroma: muted · harmony: mono */

:root {
  --neutral-1: #fcfdfd;
  --neutral-2: #f8f9fa;
  --neutral-3: #f0f0f3;
  --neutral-4: #e7e7ec;
  --neutral-5: #dcdee3;
  --neutral-6: #d0d2d9;
  --neutral-7: #c1c3cc;
  --neutral-8: #a8aab4;
  --neutral-9: #60626e;
  --neutral-10: #50525c;
  --neutral-11: #62636a;
  --neutral-12: #2d2e31;
  --accent-1: #fcfdff;
  --accent-2: #f7f8ff;
  --accent-3: #edefff;
  --accent-4: #e2e6ff;
  --accent-5: #d6dcff;
  --accent-6: #c7cfff;
  --accent-7: #b5befe;
  --accent-8: #9aa4ef;
  --accent-9: #5358ad;
  --accent-10: #444896;
  --accent-11: #585e90;
  --accent-12: #282b45;
  --accent-on-solid: #f9faff;
  --error-3: #ffebe9;
  --error-9: #c56c65;
  --error-11: #86534f;
  --success-3: #e6f6e6;
  --success-9: #84cc86;
  --success-11: #486e49;
  --warning-3: #f6f0e4;
  --warning-9: #ceb47e;
  --warning-11: #6f6144;
  --info-3: #e7f2fa;
  --info-9: #7aabce;
  --info-11: #4c677a;
  --background: var(--neutral-1);
  --surface: var(--neutral-2);
  --surface-hover: var(--neutral-3);
  --surface-active: var(--neutral-4);
  --border-subtle: var(--neutral-6);
  --border: var(--neutral-7);
  --border-strong: var(--neutral-8);
  --text-secondary: var(--neutral-11);
  --text: var(--neutral-12);
  --accent-bg-subtle: var(--accent-3);
  --accent-solid: var(--accent-9);
  --accent-solid-hover: var(--accent-10);
  --accent-text: var(--accent-11);
}

[data-theme="dark"] {
  --neutral-1: #121313;
  --neutral-2: #19191a;
  --neutral-3: #222224;
  --neutral-4: #292a2d;
  --neutral-5: #313236;
  --neutral-6: #3a3b41;
  --neutral-7: #474950;
  --neutral-8: #5e6069;
  --neutral-9: #60626e;
  --neutral-10: #72747f;
  --neutral-11: #b5b7be;
  --neutral-12: #e7e7ec;
  --accent-1: #121216;
  --accent-2: #181920;
  --accent-3: #1f2130;
  --accent-4: #25283f;
  --accent-5: #2b2f50;
  --accent-6: #333762;
  --accent-7: #3e4379;
  --accent-8: #52599d;
  --accent-9: #5358ad;
  --accent-10: #646bbd;
  --accent-11: #abb3eb;
  --accent-12: #e2e6ff;
  --accent-on-solid: #f9faff;
  --error-3: #2d1d1c;
  --error-9: #c56c65;
  --error-11: #e0a7a1;
  --success-3: #1a261a;
  --success-9: #84cc86;
  --success-11: #9bc49b;
  --warning-3: #262219;
  --warning-9: #ceb47e;
  --warning-11: #c5b696;
  --info-3: #1b2329;
  --info-9: #7aabce;
  --info-11: #9fbcd1;
  --background: var(--neutral-1);
  --surface: var(--neutral-2);
  --surface-hover: var(--neutral-3);
  --surface-active: var(--neutral-4);
  --border-subtle: var(--neutral-6);
  --border: var(--neutral-7);
  --border-strong: var(--neutral-8);
  --text-secondary: var(--neutral-11);
  --text: var(--neutral-12);
  --accent-bg-subtle: var(--accent-3);
  --accent-solid: var(--accent-9);
  --accent-solid-hover: var(--accent-10);
  --accent-text: var(--accent-11);
}
```

### Project semantic overrides (applied after the palette block, same selectors)

The palette output is kept verbatim above; these aliases are added on top so every seam Phase 3 builds on already passes.

```css
:root {
  --rule: var(--accent-7);                 /* the margin rule; decorative, no contrast duty */
  --border-interactive: var(--neutral-9);  /* field/boundary borders that must meet 3:1: 5.94:1 vs background */
  --focus-ring: var(--accent-9);           /* 2px ring, 2px offset: 6.12:1 vs background */
  --shadow-color: 40 43 69;                /* accent-12 as RGB triplet; shadows are hue-shifted, never black */
  --shadow-dialog: 0 12px 32px -12px rgb(var(--shadow-color) / 0.28);
  --shadow-toast:  0 6px 20px -8px rgb(var(--shadow-color) / 0.24);
}
[data-theme="dark"] {
  --accent-solid: var(--accent-10);        /* #646bbd: 3.88:1 vs background, label text 4.60:1 */
  --accent-solid-hover: var(--accent-9);   /* one step deeper on hover, as in light; label text 5.96:1 */
  --rule: var(--accent-7);
  --border-interactive: var(--neutral-10); /* 4.01:1 vs background */
  --focus-ring: var(--accent-11);          /* 9.20:1 vs background */
  --shadow-color: 8 8 16;
  --shadow-dialog: 0 12px 32px -12px rgb(var(--shadow-color) / 0.6);
  --shadow-toast:  0 6px 20px -8px rgb(var(--shadow-color) / 0.55);
}
```

### Contrast report

`palette.mjs` report (verbatim):

```
PASS  [light] neutral-11 on neutral-2: 5.69:1 (target 4.5:1)
PASS  [light] neutral-12 on neutral-2: 12.92:1 (target 7:1)
PASS  [light] neutral-12 on neutral-3: 12:1 (target 4.5:1)
PASS  [light] accent-11 on neutral-2: 5.78:1 (target 4.5:1)
PASS  [light] accent-11 on accent-2: 5.77:1 (target 4.5:1)
PASS  [light] accent-on-solid on accent-9: 5.96:1 (target 4.5:1)
PASS  [dark] neutral-11 on neutral-2: 8.74:1 (target 4.5:1)
PASS  [dark] neutral-12 on neutral-2: 14.25:1 (target 7:1)
PASS  [dark] neutral-12 on neutral-3: 12.94:1 (target 4.5:1)
PASS  [dark] accent-11 on neutral-2: 8.65:1 (target 4.5:1)
PASS  [dark] accent-11 on accent-2: 8.66:1 (target 4.5:1)
PASS  [dark] accent-on-solid on accent-9: 5.96:1 (target 4.5:1)
```

Supplementary text pairs (WCAG 2.x relative luminance, same formula), both modes PASS:

| Pair | Light | Dark |
|------|-------|------|
| `--text` on `--background` | 13.32:1 | 15.10:1 |
| `--text-secondary` on `--background` | 5.87:1 | 9.29:1 |
| `--accent-text` on `--background` | 6.03:1 | 9.20:1 |
| `--accent-text` on `--accent-bg-subtle` (chip) | 5.38:1 | 7.87:1 |
| `--text` on `--accent-bg-subtle` | 11.89:1 | 12.92:1 |
| `--text` on `--surface-active` | 11.02:1 | 11.64:1 |
| `--text-secondary` on `--surface-hover` | 5.26:1 | 7.93:1 |
| `--error-11` on `--error-3` / on background | 5.44 / 6.13 | 7.83 / 9.05 |
| `--success-11` on `--success-3` / on background | 5.19 / 5.72 | 8.06 / 9.54 |
| `--warning-11` on `--warning-3` / on background | 5.33 / 5.94 | 7.93 / 9.31 |
| `--info-11` on `--info-3` / on background | 5.24 / 5.84 | 8.03 / 9.38 |
| `--accent-on-solid` on `--accent-solid` (after override) | 5.96:1 | 4.60:1 |

Non-text (3:1) pairs Phase 3 will rely on: `--accent-solid` vs background 6.12 (light) / 3.88 (dark); `--border-interactive` vs background 5.94 / 4.01; `--error-9` vs background 3.61 / 5.06. Known below-3:1 and therefore *not* for component boundaries: `--border`, `--border-subtle`, `--border-strong` (2.27 light / 2.97 dark) — hairlines only.

Functional colours never carry meaning alone: every error/success/warning/info surface pairs the colour with a glyph or a word (ch08).

## Space, shape, depth

- Spacing scale (4px base): `--space-1` 4 · `-2` 8 · `-3` 12 · `-4` 16 · `-5` 20 (the rule gutter) · `-6` 24 · `-8` 32 · `-10` 40 · `-12` 48 · `-16` 64. Tight inside a group (4–12), generous between groups (24–48). Page side gutter 16px on phone, 32px from 768px; content max-width 1040px.
- Radius: `--radius-sm` 4px (chips, badges, inputs), `--radius-md` 6px (buttons, cards), `--radius-lg` 10px (dialog, toast). No pills except the count badge on nav items (height 18px, radius 9px). Shape is quiet; the serif carries the character.
- Borders: 1px `--border-subtle` for card and row hairlines; 1px `--border` for dividers between sections; 1px `--border-interactive` for text inputs and the combobox; the margin rule in `--rule`. No 2px+ borders, no coloured left bars on panels (the margin rule is the only vertical accent).
- Depth: flat by default. Cards are `--surface` on `--background` with a hairline, no shadow. Only floating layers get shadow: dialog `--shadow-dialog`, toast and combobox listbox `--shadow-toast`. Shadows are tinted from accent-12 (light) or deep ink (dark), never pure black, never identical across elements.
- Touch targets ≥ 44×44px on all interactive elements (buttons, nav tabs, chips that are buttons, card actions).

## Motion

- Timing: micro 120ms (`--duration-micro`: hover/focus colour, chip toggle) · standard 180ms (`--duration-standard`: listbox open, filter bar appear, card leave) · large 260ms (`--duration-large`: dialog, toast enter/exit).
- Easing: `--ease-out: cubic-bezier(0.2, 0, 0, 1)` for enters; `--ease-in: cubic-bezier(0.4, 0, 1, 1)` for exits. Nothing else.
- Allowed to move: opacity; `transform: translateY` up to 8px (dialog, toast, listbox); background/border/colour on state change; the Undo toast's 8-second progress hairline (linear). Skeleton loaders are static `--surface-hover` blocks (no shimmer, no pulse).
- Never: scale on hover or press, bounce/elastic/spring, staggered fade-ins, page-transition animation, ambient or looping motion, animated gradients, parallax.
- `prefers-reduced-motion: reduce`: all `transition-duration`/`animation-duration` → 0.01ms; toasts still auto-dismiss on their timer; the Undo progress hairline is replaced by a static "Undo (8s)" label.

## Never (this project's tells at risk)

- Never raise the accent chroma, add a second accent hue, or use `#6366F1`/`#8B5CF6`/`#A855F7` (the purple-triplet tell sits one chroma step away from this ink). The accent is `--accent-solid` on primary buttons, `--accent-text` on links and the current nav item, `--rule` on the margin rule, `--accent-bg-subtle` on the category chip — nowhere else.
- No gradients anywhere, including the wordmark and mark.
- No nested cards: a card never contains another bordered box. Inside a card use spacing and hairlines.
- No pill chips (except the nav count badge); no icon-above-heading feature blocks; no centred body text (Login lockup excepted).
- No identical drop shadows on resting elements; cards are flat.
- No Inter, Roboto, Open Sans, system-ui as a *first* family; no faux bold/italic; no stretched type.
- No emoji as UI icons (📝 📚 ⚙️ in the current app are replaced by line icons in Phase 3).
- No dark-by-default: dark follows `prefers-color-scheme`.
- No red as a dominant anywhere on Practice (quiz context, ch09); `--error-*` only on errors and the delete confirm.
- No pure `#000`/`#fff`.
- Copy: spaced en dashes, no manufactured-contrast sentence pairs, no marketing phrasing.

## Open questions

- Confirm the fonts on real devices: Anek Bangla's conjunct coverage on Android/iOS fallbacks; Newsreader italic for example sentences (Phase 3).
- `--border-interactive` at neutral-9 is the only ramp step that meets 3:1 in light; if it reads too heavy on real screens, Phase 3 may propose an underline-only input treatment that still meets 3:1.
- Whether the "শ" glyph should survive anywhere (proposal: no; the ruled-page mark replaces it).
- A manual light/dark toggle in Settings is wired for (`data-theme`) but not in scope.
