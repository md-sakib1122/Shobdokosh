// The three lookups behind "Add a word": Bangla spelling, Bangla meaning, English definition.
import { pronounceAsync, type Pronunciation } from "./bnPhonetic";
import { fetchDefinition, type DefinitionResult } from "./definition";
import { lookupMeaning, type MeaningHit } from "./meaning";
import type { Word } from "./storage";

export interface PronResult {
  bangla: string;
  source: string;
  reliable: boolean;
}

const TOKEN = /[A-Za-z]+(?:['’][A-Za-z]+)*/g;

/** bnPhonetic.pronounce for a word; phrases ("look up", "air-port") go word by word,
 * keeping spaces and hyphens, and report the least reliable part's source. */
export async function pronounceText(text: string): Promise<PronResult> {
  const t = text.trim();
  const tokens = t.match(TOKEN) ?? [];
  if (tokens.length === 1 && tokens[0] === t) {
    const p = await pronounceAsync(t);
    return { bangla: p.bangla, source: p.source, reliable: p.reliable };
  }
  const parts: Pronunciation[] = [];
  for (const tok of tokens) parts.push(await pronounceAsync(tok));
  let k = 0;
  const bangla = t.replace(TOKEN, () => parts[k++].bangla);
  const weak = parts.find((p) => !p.reliable);
  return { bangla, source: (weak ?? parts[0])?.source ?? "passthrough", reliable: !weak };
}

export interface Lookups {
  pron: Promise<PronResult | null>;
  meaning: Promise<MeaningHit | null>;
  definition: Promise<DefinitionResult>;
}

/** Start all three in parallel; each promise resolves (failures become null / "error"). */
export function startLookups(word: string): Lookups {
  return {
    pron: pronounceText(word).catch(() => null),
    meaning: lookupMeaning(word).catch(() => null),
    definition: fetchDefinition(word),
  };
}

/** Re-run only the lookups whose fields are still empty; returns the fields to patch. */
export async function retryLookups(w: Word): Promise<Partial<Word>> {
  const patch: Partial<Word> = {};
  const jobs: Promise<void>[] = [];
  if (w.bnPronunciation === null) {
    jobs.push(pronounceText(w.word).then((p) => {
      if (p) Object.assign(patch, { bnPronunciation: p.bangla, pronSource: p.source, pronReliable: p.reliable });
    }, () => undefined));
  }
  if (w.bnMeaning === null) {
    jobs.push(lookupMeaning(w.word).then((m) => {
      if (m) Object.assign(patch, { bnMeaning: m.bn, meaningLemma: m.lemma });
    }, () => undefined));
  }
  if (w.definition === null) {
    jobs.push(fetchDefinition(w.word).then((d) => {
      patch.definitionStatus = d.status;
      if (d.status === "ok") {
        Object.assign(patch, { definition: d.definition, partOfSpeech: w.partOfSpeech ?? d.partOfSpeech });
        if (!w.audioUrl && d.audioUrl) patch.audioUrl = d.audioUrl;
        if (!w.sentence && d.example) patch.sentence = d.example;
      }
    }));
  }
  await Promise.all(jobs);
  return patch;
}

export const needsRetry = (w: Word): boolean =>
  w.bnPronunciation === null || w.bnMeaning === null || (w.definition === null && w.definitionStatus !== "notfound");
