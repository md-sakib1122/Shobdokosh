# Shobdokosh

**শব্দকোষ** — your personal word treasury.

> Practice English spelling from **Bangla-script pronunciation** — `necessary → নেসেসারি`.

**Live demo: [vocapp-rho.vercel.app](https://vocapp-rho.vercel.app/)**

Shobdokosh is a privacy-friendly single-page app for learners who want to master English
spelling. Add a word, get its Bangla pronunciation, Bangla meaning and English definition
automatically, then practice typing it from the Bangla spelling or from audio alone.
There is no backend: everything is stored in your browser.

## Features

- **Smart word entry** — Bangla spelling (TypeScript port of the `bn_phonetic` engine), Bangla
  meaning (offline E2B dictionary of ~103k entries) and English definition + audio are fetched in
  parallel. Every field stays editable before saving.
- **Practice mode** — see the Bangla spelling (or only listen), type the English word, and get a
  letter-by-letter diff when you are wrong. Optional hints, per-word stats, and a
  "looks learned" prompt after 3 correct answers in a row.
- **Categories** — group words, filter practice by category, create categories on the fly.
- **Words list** — cards show only the Bangla spelling and a speaker button; reveal the English
  word on demand.
- **Settings** — export / import your data (`.json`, merge or replace), delete your account.
- **Light and dark themes**, responsive from phone to desktop.
- **Offline-friendly** — dictionaries are cached in IndexedDB after first load.

## Tech stack

React 18 · TypeScript · Vite 6 · Tailwind CSS 3 · React Router (hash router) · Vitest + Testing Library ·
CMUdict (`cmu-pronouncing-dictionary`) · deployed on Vercel.

## Getting started

Requires Node 18+.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve dist/ locally
npm test           # unit, walkthrough and parity tests
```

## Project structure

```
src/
  pages/        Login, Practice, Words, AddWord, Categories, Settings
  components/   WordCard, WordDetails, DiffView, CategoryCombobox, ConfirmDialog, Toast, …
  state/        DBContext, useCategories, resources
  lib/
    bnPhonetic/ English → Bangla pronunciation engine (TS port)
    meaning.ts  Bangla meaning lookup + IndexedDB cache
    definition.ts  English definition / audio client (dictionaryapi.dev)
    storage.ts  localStorage database, validation, import/export
    diff.ts, mask.ts, lookup.ts, speech.ts
  styles/       Design tokens
public/data/    E2Bdatabase.json, overrides.json, g2p/ (neural model weights)
tests/          lib, walkthrough, categories, bnPhonetic, parity/ (golden set)
```

## How the Bangla pronunciation works

`src/lib/bnPhonetic/` is a stage-by-stage port of a Python engine: user overrides → CMUdict
lookup (with British variants) → morphology (prefixes/suffixes/compounds) → a small neural
grapheme-to-phoneme GRU for unknown words → Bangla rendering. Against the original Python output
over ~85k words it matches **99.992 %** (the few differences come from CMUdict version drift).

## Data & privacy

Accounts and words live in `localStorage` on your device; nothing is sent to a server except
public dictionary look-ups for English definitions and audio. Use **Settings → Export** to back
up or move your data.

## Deployment

The app builds to static files (`dist/`) and uses a hash router, so it needs no rewrite rules.
It is deployed on Vercel (`vercel.json`: Vite framework, `npm ci`, `npm run build`, output `dist`).

## License

Personal project — all rights reserved unless a license file is added.
