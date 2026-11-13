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

## Components

Appended in Phase 3. Nothing above this heading was changed. Reference render: `mocks/components.html` (every state, light + dark; screenshots `mocks/components-{light,dark}-{1280,390}.png`). The sheet's theme CSS is generated from this file's fenced blocks by script and is saved as `mocks/theme.generated.css` (light, dark under `@media (prefers-color-scheme: dark)` on `:root:not([data-theme="light"])`, dark under `[data-theme="dark"]`, plus the structural tokens below). Phase 5 lifts that file as `src/theme.css`.

Doctrine: Frost atomic design (atoms: button, field, radio/checkbox, chip, badge, icon button; molecules: combobox, word card, toast, panel/note, category row, dialog; organisms: nav, page header), Kholmatova functional vs perceptual patterns, W3C APG combobox, WCAG 2.2 (1.4.1, 1.4.11, 2.4.7, 2.5.8, 4.1.3), Nielsen #1/#4/#5/#9.

### Structural tokens (CSS)

Spacing, radius and motion were prose-only above; Tailwind and components need them as properties. Same values, no new decisions.

```css
:root {
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px; --space-5: 20px;
  --space-6: 24px; --space-8: 32px; --space-10: 40px; --space-12: 48px; --space-16: 64px;
  --radius-sm: 4px; --radius-md: 6px; --radius-lg: 10px; --radius-badge: 9px;
  --duration-micro: 120ms; --duration-standard: 180ms; --duration-large: 260ms;
  --ease-out: cubic-bezier(0.2, 0, 0, 1); --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --control-h: 2.75rem;      /* 44px: every interactive element */
  --content-max: 1040px;
  --ring-width: 2px; --ring-offset: 2px;
}
```

### Rules that apply to every component

1. **Semantic tokens only.** Component rules use the semantic aliases (`--background`, `--surface*`, `--border*`, `--text*`, `--accent-solid*`, `--accent-text`, `--accent-bg-subtle`, `--accent-on-solid`, `--rule`, `--focus-ring`, functional `--error|success|warning|info-3|9|11`). No `--neutral-N`/`--accent-N` steps, no hex, no `rgb()` except `rgb(var(--shadow-color) / a)`. Checked by grep over the component CSS (zero hits).
2. **Focus ring (specified once).** `outline: var(--ring-width) solid var(--focus-ring); outline-offset: var(--ring-offset)` on `:focus-visible`; on text inputs, selects and the combobox on `:focus` (typing fields always show it). Inside clipped or edge-hugging containers (bottom-nav items) use `outline-offset: -2px`. `outline: none` is never used without this replacement. Ratio vs page / card / hover surface: 6.12 / 5.92 / 5.48 light, 9.20 / 8.68 / 7.85 dark (all >= 3:1; full table in the contrast report).
3. **Touch/click target 44x44** (`--control-h`) for every button, field, nav item, option row, radio/checkbox label. The visual glyph may be smaller (20px icons, 20px radio) inside the 44px hit area. Spacing between adjacent targets >= 4px (WCAG 2.5.8).
4. **Non-text boundaries:** controls are bounded by `--border-interactive` (never `--border*`, which are hairlines for cards and dividers). Selected/on state is carried by shape too (filled dot, check, bar), never colour alone.
5. **Primary label guard (dark 4.60:1).** `--accent-on-solid` on `--accent-solid` is only ever set at `--text-base` or larger, weight 600. Smaller buttons use Secondary or Ghost.
6. **Section labels** are sentence case, `--text-sm`, 500, `--text-secondary`, tracking normal. No uppercase, no letterspacing (resolves the Never-list note). Only `--text-xs` labels (chip) take +0.02em.
7. **Disabled** (exempt from WCAG contrast but kept readable): `--surface-hover` fill, `--border-subtle`, `--text-secondary` label (5.26:1 light / 7.93:1 dark), `cursor: not-allowed`, native `disabled`.
8. **Error** is always glyph + words + colour: `--error-11` border (6.13:1 light / 9.05:1 dark vs page) on the field, an `--error-11` message with a warn glyph below it, `aria-invalid="true"` and `aria-describedby`. Never red alone, never dominant on Practice.
9. **Transitions:** colour/background/border only, `--duration-micro` `--ease-out`. Reduced motion: 0.01ms.
10. **No nested cards, clarified.** The Never-list ban on nested cards covers bordered *container boxes* inside a card. Form controls (fields, buttons, combobox) carry their own `--border-interactive` boundary and are not cards.
11. **Forced colors:** boundaries fall back to `CanvasText`; state indicators (bars, check) must still be present as shapes.

### State matrix (default / hover / focus / active / disabled / error)

`-` = not applicable, with the reason in the last column.

| Component | Default | Hover | Focus | Active | Disabled | Error | Notes |
|-----------|---------|-------|-------|--------|----------|-------|-------|
| Button primary | fill `--accent-solid`, label `--accent-on-solid` | fill `--accent-solid-hover` | ring | fill `--accent-solid-hover` + inset 2px shadow tint | rule 7 | - | failures surface on the field or a toast |
| Button secondary | `--surface` fill, 1px `--border-interactive`, `--text` | `--surface-hover` | ring | `--surface-active` | rule 7 | - | same |
| Button ghost | transparent, `--accent-text` | `--accent-bg-subtle` | ring | `--accent-bg-subtle` + underline | rule 7, transparent fill | - | text-only actions (Clear, Rename, Undo) |
| Button danger | `--error-3` fill, `--error-11` label, 1px `--error-9` border | border `--error-11` | ring | border `--error-11` + inset `--error-9` | rule 7 | - | only on delete/replace confirms and delete rows; never solid red |
| Icon button | `--text-secondary` glyph, 44px | `--surface-hover`, glyph `--text` | ring | `--surface-active` | rule 7 | - | `aria-label` mandatory |
| Text field / textarea | `--background`, 1px `--border-interactive`, `--text`; placeholder `--text-secondary` | border `--text` | border `--focus-ring` + ring | = focus while typing | rule 7 | rule 8 | radius `--radius-sm` |
| Select (native) | as field + chevron `--text-secondary` | as field | as field | as field | as field | as field | native popup kept (Sort) |
| Radio / checkbox | 20px, 1px `--border-interactive`, `--background` | fill `--surface-hover`, border `--text` | ring on the control | - (instant) | rule 7 | border `--error-11` + message | selected: border `--accent-solid` + 10px `--accent-solid` dot (radio) or `--accent-solid` fill + `--accent-on-solid` tick (checkbox); radio label may carry a `--warning-11` warn glyph line (Replace) |
| Combobox input | as field + chevron | as field | as field | as field | as field | as field | see Combobox |
| Listbox option | `--text`, 44px | `--surface-hover` | (focus stays on input) highlight = `aria-activedescendant` | - | - | - | highlight: `--surface-hover` + 2px inset `--accent-solid` bar; selected: check glyph in `--accent-text`, name weight 500, `aria-selected="true"` |
| Category chip | `--accent-bg-subtle` / `--accent-text`, `--text-xs` 500, h24, `--radius-sm` | - | - | - | - | - | static in v1 (no target, no boundary); Uncategorized variant: transparent, 1px `--border-subtle`, `--text-secondary` |
| Count badge | `--accent-bg-subtle` / `--accent-text`, 600, h18, `--radius-badge` | - | - | - | - | - | static; totals only |
| Word card | `--surface`, 1px `--border-subtle`, no left border in the first column, no shadow | - | - (controls inside show the ring) | - | - | field error inside (rule 8) | the card is not itself clickable |
| Nav item | `--text-secondary` icon + label | `--surface-hover`, `--text` | ring (inset) | `--surface-active` | - | - | current: stroke 2, label 600 `--accent-text`, 2px `--accent-solid` indicator bar (an indicator, not a border), `aria-current="page"`; a destination is never disabled |
| Dialog | `--background`, 1px `--border`, `--radius-lg`, `--shadow-dialog` on scrim `rgb(var(--shadow-color) / .45)` | - | ring on inner control | - | - | inline error message inside | controls own their states |
| Toast | `--background`, 1px `--border-interactive`, `--radius-lg`, `--shadow-toast` | pauses timer | ring on its buttons; pauses timer | - | - | `--error-11` glyph, `role="alert"`, persists | its Undo/Dismiss are ghost/icon buttons |
| Panel / note | `--surface` + hairline (panel); `--info/warning/error-3` fill + `*-11` text (note); `--success-3` + `--success-11` (success panel) | - | - | - | - | note variant `err` | static; its buttons own states |
| Category row | hairline bottom, 56px | row fill `--surface-hover` | ring on buttons | - | - | rename: field error + Save disabled | Active and Disabled are N/A: the row is not itself a control (no pressed state) and is never disabled; its Rename/Delete buttons own those states (Button ghost row) |

### Button

Min-height 44px, padding 0 16px (ghost 0 12px), radius `--radius-md`, label `--text-base`/`--leading-base` weight 600, icon 20px with 8px gap, 1px transparent border (so variants never shift layout). Labels are verb + object ("Delete category", not "OK"). One primary per view region. Destructive confirms: Cancel is Secondary and takes default focus; the danger button sits right on desktop; on phones the footer stacks with `flex-direction: column-reverse`, so DOM order stays Cancel then action while the action shows on top.

### Field, select, radio

Label above (`--text-sm`, 500), 4px gap, field 44px, `--radius-sm`, padding 0 12px. Helper text `--text-sm` `--text-secondary` below. Required is shown in the label text, not an asterisk-only. Radios in a group live in `<fieldset><legend>`; each choice is a 44px-tall label with an optional description line (`--text-sm`, `--text-secondary`).

### Category combobox

Pattern: ARIA 1.2 editable combobox with list autocomplete (WAI-ARIA APG). Anatomy (the sheet renders the status region in every combobox state): label, `<input role="combobox" aria-expanded aria-controls aria-autocomplete="list" aria-activedescendant autocomplete="off">`, chevron (decorative, click toggles, `tabindex="-1"`), `<ul role="listbox" aria-label="Categories">`, options `role="option"` with `id` and `aria-selected`, a polite status region (`role="status"`, visually hidden).

| Mode | Where | Rows |
|------|-------|------|
| filter | Practice, Words | "All categories" first (total count), then categories A-Z; no create |
| create | Add | last-used first, then A-Z; create row last |
| change | Word details | categories A-Z, no "All", no create; empty case shows a hint link to Categories |

- **Option row:** 44px; [20px tick slot] [name, truncated with ellipsis, `title` = full name] [word count, `--text-sm`, `--text-secondary`]. Create row: plus glyph in the tick slot, `Create “text”`, `--accent-text` 500, 1px `--border` above. Notes (no results, already exists, cap footer, hint, invalid reason) are non-option rows (`role="presentation"`), `--text-sm`; invalid reason uses `--error-11` + warn glyph.
- **Listbox:** `--background`, 1px `--border-interactive`, `--radius-md`, `--shadow-toast`, `max-height: min(18rem, 50dvh)`, 4px gap below the field, scrolls inside, opens in 180ms (opacity + translateY 4px). Phone: stays under the field; when the keyboard shrinks the visual viewport it scrolls the field into view first.
- **Result count:** the announced count covers category options only. The "All categories" row (filter mode) and note rows (hint, cap footer, no-match, create row) are never counted: three categories plus "All categories" announces "3 categories".
- **Filtering:** case-insensitive substring, in memory. Cap 50; footer "Showing 50 of N – keep typing to narrow."
- **Exact match (any case):** the matching row is auto-highlighted, the create row is not rendered, and a note "“IELTS” already exists. Press Enter to use it." shows. Choosing it keeps the stored name (never the typed case).
- **Invalid create text** (empty after trim, over 40, disallowed characters): create row replaced by the reason note; Enter does nothing; `aria-invalid="true"` on the input.
- **Keyboard (no pointer needed):**

| Key | Behaviour |
|-----|-----------|
| Down / Up | open if closed; move highlight (wraps); never moves DOM focus off the input |
| Alt+Down / Alt+Up | open / close without moving the highlight |
| Home / End | move the text caret (APG): the highlight is moved with Down/Up only |
| Type | filters; first match highlighted (create mode: exact match, else the first match, else the create row) |
| Enter | selects the highlighted option and closes; with the list closed it does nothing |
| Esc | closes the list (first press); second press restores the committed value |
| Tab / blur | closes; uncommitted text reverts to the last valid selection (value is never empty); no create on blur |
| Click / tap | selects; creating needs an explicit pick of the create row |

- **Screen reader:** status region updated 300ms after typing stops and on open: "N categories" / "1 category" / "No categories match “q”" / "50 of 214 categories shown" / "1 category. “IELTS” already exists. Press Enter to use it." Creation result is announced by the toast (`role="status"`). The listbox has an accessible name; the selected option has `aria-selected`.
- **Closed state:** shows the selected name in the field (truncated, `title` = full name).

### Category chip

Inline-flex, height 24px, padding 0 8px, `--radius-sm` (square, never a pill), `--text-xs` 500 +0.02em. Max-width 14rem, name truncated with ellipsis and `title` (the title is a bonus: touch users read the full name in Word details, where the chip drops `max-width` and wraps). Uncategorized renders as the receded variant so a list full of it stays quiet. Not interactive in v1; if a chip ever becomes a button it adopts the Ghost states and a 44px target.

### Word card

Two layouts on one frame. The card starts at the margin rule (no left border; in multi-column grids only the first column does this, other columns keep a full hairline), padding 16 right/top/bottom, 20 left (`--space-5`). Top row: chip left, icon buttons right (Speak, Details; Practice adds Move to Words, Words adds Move to Practice). Order: chip, then headline.
- **Prompt mode** (Practice and Words; the existing practice mechanic): the prompt is the Bangla pronunciation (`--font-bn`, `--text-2xl` phone / `--text-3xl` desktop, 500) with the Bangla meaning beneath (`--font-bn`, `--text-lg`, `--text-secondary`). The English word stays hidden until Verify. No letter-count hint. Then the spelling field + Verify (primary, one row; the field takes the width). Empty Verify: field error "Type the word first, then Verify." Words cards swap "Move to Words" for "Move to Practice".
- **Reference mode** (Word details only): English word `--font-display` `--text-2xl` (phone) / `--text-3xl` (desktop) 500 as the headline; Bangla meaning `--font-bn` `--text-lg` 500; pronunciation `--text-sm` `--text-secondary`.
- Footer: hairline, `--text-sm` `--text-secondary` stats. No nested bordered boxes.

### Navigation

- **Phone bottom bar:** 5 equal items, 56px tall, `--background`, 1px `--border` top, icon 24 over label (`--text-sm`; `--text-xs` below 360px wide), safe-area padding bottom. Badge (Practice, Words totals) top-right of the icon. Sits above page content with matching bottom padding; toasts sit above it.
- **Desktop top bar:** wordmark lockup left, five items (icon + label + badge inline, 44px, indicator 8px below the item), `sp`, email (`--text-sm` `--text-secondary`) and a ghost "Switch account". `<nav aria-label="Main">`. Phone header shows only the wordmark; "Switch account" lives in Settings > Account.
- Labels (final): **Practice, Words, Add, Categories, Settings.** "Words" replaces "All Words" everywhere, including the page heading.
- Icons: 24px viewBox, 1.5px stroke (2px when current), round caps, `currentColor`; set: pencil (Practice), book (Words), plus (Add), tag (Categories), sliders (Settings), plus search, check, x, chevron, speaker, arrow, info, warn. No emoji.

### Page header and margin rule

`.page` column: `border-left: 1px solid var(--rule)`, `padding-left: var(--space-5)`, margin-left 16px (phone) / 32px (>= 768px). Title `--font-display` 500, `--text-2xl`/`--text-3xl`, with the count badge inline. Count lines and result lines are `--text-sm` `--text-secondary`, `role="status"` (polite). Section labels follow rule 6.

### Dialog and confirm-delete

Panel: max-width 28rem (36rem for Word details), padding 24, `--background`, 1px `--border`, `--radius-lg`, `--shadow-dialog`; scrim `rgb(var(--shadow-color) / .45)`. Title `--font-body` `--text-xl` 500 (display type is not used for dialog titles). Opens 260ms (opacity + translateY 8px). Behaviour: focus trap; Esc and scrim click cancel; focus returns to the opener; page scroll locked. Confirm dialogs: `role="alertdialog"`, `aria-labelledby` title, `aria-describedby` body, initial focus on Cancel (Nielsen #5). Footer: desktop right-aligned row [Cancel][Action]; phone stacked, action first visually. Word details uses `role="dialog"`, initial focus on the title/close.

### Toast

One live region (`role="status"`, `aria-live="polite"`; errors `role="alert"`). Position: phone, 16px from the sides and 16px above the bottom bar; desktop, bottom-center, max-width 28rem, 24px from the bottom. Anatomy: status glyph (check / warn / info) in `--text-secondary` (`--success-11` / `--error-11` for ok/error), message `--text-sm`, optional Undo (ghost), Dismiss (icon). Rules: queue, one visible; a toast that carries an action is never replaced early; default 5s, Undo toast 8s, import summary 12s, errors persist until dismissed; timer pauses on hover and focus-within; enter/exit 260ms (opacity + translateY 8px). Progress: 2px `--accent-solid` hairline shrinking linearly over the timer (decorative; the timer is also a number); reduced motion: no bar, the button reads "Undo (8s)".

### Panel, empty state, inline note

Panel: `--surface`, 1px `--border-subtle`, `--radius-md`, padding 24, max-width 36rem; title `--text-lg` 500, body `--text-secondary`, actions row (primary first, ghost second). No illustration. Success variant ("All words in <Category> are learned"): `--success-3` fill, `--success-11` title and body, check glyph; it is the only expressive empty state. Note: 44px min, glyph + one or two lines + optional Dismiss; variants info (stale category), warning (storage unavailable), error (import failed, inline under its field).

### Category row

Min-height 56px, hairline bottom. [name 500, truncated, `title`] [Built in note, Uncategorized only] [count `--text-sm` `--text-secondary`] [Rename, Delete as ghost]. Wraps below 480px (actions drop under the name). Rename mode replaces the row with a field + Save (primary) + Cancel; Save is disabled while invalid. No "View words" link per row (Words shows only learned words and would mislead; filtering lives on Practice and Words).

### Non-text contrast (>= 3:1) summary

Computed from the locked tokens with the WCAG relative-luminance formula for every non-text pair in both modes (`.design-foundations/build/phase-3-contrast.txt`, exit 0, 100/100 PASS including 24 text pairs). Lowest margins: listbox highlight bar and radio dot on `--surface-hover` 3.31:1 (dark), danger border `--error-9` on page 3.61:1 (light), primary fill on card surface 3.66:1 (dark), field border on card surface 3.78:1 (dark). Everything else is >= 3.9:1.

### Tailwind mapping (tailwind.config.js)

Tailwind 3.4. Colours are `var()` references, so opacity modifiers (`bg-accent/50`) do not work; use the tokens as designed (overlays use the `.scrim` rule with `--shadow-color`). Replace `theme.colors` (not `extend`) so raw palette classes like `bg-red-500` cannot compile. Default spacing already equals the 4px scale for keys 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, so no spacing override is needed.

```js
const v = (n) => `var(--${n})`;
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    colors: {
      transparent: "transparent", current: "currentColor",
      background: v("background"),
      surface: { DEFAULT: v("surface"), hover: v("surface-hover"), active: v("surface-active") },
      border: { subtle: v("border-subtle"), DEFAULT: v("border"), strong: v("border-strong"), interactive: v("border-interactive") },
      text: { DEFAULT: v("text"), secondary: v("text-secondary") },
      accent: { solid: v("accent-solid"), "solid-hover": v("accent-solid-hover"), text: v("accent-text"), subtle: v("accent-bg-subtle"), on: v("accent-on-solid") },
      rule: v("rule"), ring: v("focus-ring"),
      error: { 3: v("error-3"), 9: v("error-9"), 11: v("error-11") },
      success: { 3: v("success-3"), 9: v("success-9"), 11: v("success-11") },
      warning: { 3: v("warning-3"), 9: v("warning-9"), 11: v("warning-11") },
      info: { 3: v("info-3"), 9: v("info-9"), 11: v("info-11") },
    },
    fontFamily: { display: v("font-display"), sans: v("font-body"), bn: v("font-bn") },
    fontSize: Object.fromEntries(["xs","sm","base","lg","xl","2xl","3xl","4xl"].map(k => [k, [v(`text-${k}`), { lineHeight: v(`leading-${k}`) }]])),
    fontWeight: { normal: "400", medium: "500", semibold: "600" },
    borderRadius: { none: "0", sm: v("radius-sm"), md: v("radius-md"), lg: v("radius-lg"), badge: v("radius-badge") },
    boxShadow: { none: "none", dialog: v("shadow-dialog"), toast: v("shadow-toast") },
    transitionDuration: { micro: v("duration-micro"), standard: v("duration-standard"), large: v("duration-large") },
    transitionTimingFunction: { out: v("ease-out"), in: v("ease-in") },
    minHeight: { control: v("control-h") }, minWidth: { control: v("control-h") },
    maxWidth: { content: v("content-max") },
    extend: { spacing: { 18: "4.5rem" } /* only if needed; default scale otherwise */ },
  },
  plugins: [],
};
```

Base layer (`src/index.css`): import `theme.generated.css` content, set `body { background: var(--background); color: var(--text); font-family: var(--font-body) }`, `:lang(bn), .bn { font-family: var(--font-bn); line-height: var(--leading-bn) }`, the focus rule from "Rules" 2, and the reduced-motion rule. Utilities to add via `@layer components`: `.focus-ring`, `.field`, `.btn-*`, `.chip`, `.card` (copy the component rules from `mocks/components.html`). Mechanical lint for Phase 5: `grep -rnE '#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(' src` must return nothing.

## Open questions

- Confirm the fonts on real devices: Anek Bangla's conjunct coverage on Android/iOS fallbacks; Newsreader italic for example sentences (Phase 3).
- `--border-interactive` at neutral-9 is the only ramp step that meets 3:1 in light; if it reads too heavy on real screens, Phase 3 may propose an underline-only input treatment that still meets 3:1.
- Whether the "শ" glyph should survive anywhere (proposal: no; the ruled-page mark replaces it).
- A manual light/dark toggle in Settings is wired for (`data-theme`) but not in scope.
