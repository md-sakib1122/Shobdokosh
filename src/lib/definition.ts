// English definition + audio from the Free Dictionary API (dictionaryapi.dev).
// Kept behind fetchDefinition() so the provider can be swapped later.

export const DICTIONARY_API = "https://api.dictionaryapi.dev/api/v2/entries/en/";
export const TIMEOUT_MS = 6000;

export interface DefinitionInfo {
  definition: string | null;
  partOfSpeech: string | null;
  example: string | null;
  audioUrl: string | null;
}

/** ok: data found · notfound: 404, a normal state · error: network/timeout/HTTP error (retryable) */
export type DefinitionResult = DefinitionInfo & { status: "ok" | "notfound" | "error" };

interface ApiDefinition { definition?: unknown; example?: unknown }
interface ApiMeaning { partOfSpeech?: unknown; definitions?: ApiDefinition[] }
interface ApiEntry { phonetics?: { audio?: unknown }[]; meanings?: ApiMeaning[] }

const str = (x: unknown): string | null => (typeof x === "string" && x.trim() ? x.trim() : null);
const arr = <T,>(x: unknown): T[] => (Array.isArray(x) ? (x as T[]) : []);

const absolute = (url: string) => (url.startsWith("//") ? `https:${url}` : url);

/** Pick the fields we use from the API's JSON (an array of entries). */
export function parseEntries(data: unknown): DefinitionInfo {
  const entries = arr<ApiEntry>(data);
  const meanings = entries.flatMap((e) => arr<ApiMeaning>(e?.meanings));
  const first = meanings[0];
  const firstDef = arr<ApiDefinition>(first?.definitions)[0];
  let example: string | null = null;
  for (const m of meanings) {
    for (const d of arr<ApiDefinition>(m?.definitions)) {
      example = str(d?.example);
      if (example) break;
    }
    if (example) break;
  }
  const audios = entries
    .flatMap((e) => arr<{ audio?: unknown }>(e?.phonetics))
    .map((p) => str(p?.audio))
    .filter((a): a is string => a !== null)
    .map(absolute);
  const audioUrl = audios.find((a) => a.includes("-uk")) ?? audios[0] ?? null;
  return {
    definition: str(firstDef?.definition),
    partOfSpeech: str(first?.partOfSpeech),
    example,
    audioUrl,
  };
}

const EMPTY: DefinitionInfo = { definition: null, partOfSpeech: null, example: null, audioUrl: null };

export async function fetchDefinition(
  word: string,
  { timeoutMs = TIMEOUT_MS, fetchImpl = globalThis.fetch }: { timeoutMs?: number; fetchImpl?: typeof fetch } = {},
): Promise<DefinitionResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(DICTIONARY_API + encodeURIComponent(word.trim().toLowerCase()), { signal: ctrl.signal });
    if (res.status === 404) return { ...EMPTY, status: "notfound" };
    if (!res.ok) return { ...EMPTY, status: "error" };
    const info = parseEntries(await res.json());
    return { ...info, status: info.definition ? "ok" : "notfound" };
  } catch {
    return { ...EMPTY, status: "error" }; // offline, CORS, timeout (AbortError), bad JSON
  } finally {
    clearTimeout(timer);
  }
}
