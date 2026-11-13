import { useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import MeaningView from "../components/MeaningView";
import SpeakButton from "../components/SpeakButton";
import { useToast } from "../components/Toast";
import type { DefinitionStatus } from "../lib/storage";
import { startLookups } from "../lib/lookup";
import { addWord, createWord, findDuplicate, type Word } from "../lib/storage";
import { useAccount, useDB } from "../state/DBContext";
import { useResources } from "../state/resources";

const MAX_LEN = 60;

/** Trim, normalise curly apostrophes, collapse spaces. */
const cleanWord = (s: string) => s.replace(/’/g, "'").trim().replace(/\s+/g, " ");

export function validateWordInput(s: string): string | null {
  const w = cleanWord(s);
  if (!w) return "Type an English word or short phrase.";
  if (w.length > MAX_LEN) return `Keep it to ${MAX_LEN} characters or fewer.`;
  if (!/^[A-Za-z' -]+$/.test(w)) return "Use letters, spaces, hyphens and apostrophes only.";
  if (!/[A-Za-z]/.test(w)) return "Include at least one letter.";
  return null;
}

interface Preview {
  run: number;
  word: string;
  pronLoading: boolean;
  bnPronunciation: string;
  pronSource: string | null;
  pronReliable: boolean;
  pronEdited: boolean;
  meaningLoading: boolean;
  bnMeaning: string;
  meaningLemma: string | null;
  defLoading: boolean;
  definition: string;
  partOfSpeech: string;
  definitionStatus: DefinitionStatus | null;
  audioUrl: string | null;
  sentence: string;
  sentenceSuggested: boolean;
}

function Skeleton({ lines = 1, big = false }: { lines?: number; big?: boolean }) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className={`skeleton ${big ? "h-10 w-2/3" : "h-4"} ${i === lines - 1 && lines > 1 ? "w-1/2" : ""}`} />
      ))}
    </div>
  );
}

const orNull = (s: string) => (s.trim() ? s.trim() : null);

export default function AddWord() {
  const account = useAccount();
  const { update } = useDB();
  const toast = useToast();
  const res = useResources();
  const [word, setWord] = useState("");
  const [sentence, setSentence] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dup, setDup] = useState<Word | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const runRef = useRef(0);
  const wordRef = useRef<HTMLInputElement>(null);

  const patch = (run: number, p: Partial<Preview>) =>
    setPreview((cur) => (cur && cur.run === run ? { ...cur, ...p } : cur));

  const lookUp = (e: FormEvent) => {
    e.preventDefault();
    setDup(null);
    const err = validateWordInput(word);
    if (err) {
      setError(err);
      return;
    }
    const w = cleanWord(word);
    const existing = findDuplicate(account.words, w);
    if (existing) {
      setDup(existing);
      setError("You already have this word.");
      return;
    }
    setError(null);
    const run = ++runRef.current;
    const userSentence = sentence.trim();
    setPreview({
      run, word: w,
      pronLoading: true, bnPronunciation: "", pronSource: null, pronReliable: true, pronEdited: false,
      meaningLoading: true, bnMeaning: "", meaningLemma: null,
      defLoading: true, definition: "", partOfSpeech: "", definitionStatus: null, audioUrl: null,
      sentence: userSentence, sentenceSuggested: false,
    });
    const l = startLookups(w);
    void l.pron.then((p) => patch(run, p
      ? { pronLoading: false, bnPronunciation: p.bangla, pronSource: p.source, pronReliable: p.reliable }
      : { pronLoading: false }));
    void l.meaning.then((m) => patch(run, m
      ? { meaningLoading: false, bnMeaning: m.bn, meaningLemma: m.lemma }
      : { meaningLoading: false }));
    void l.definition.then((d) => setPreview((cur) => {
      if (!cur || cur.run !== run) return cur;
      const suggest = !cur.sentence.trim() && !!d.example;
      return {
        ...cur, defLoading: false, definition: d.definition ?? "", partOfSpeech: d.partOfSpeech ?? "",
        definitionStatus: d.status, audioUrl: d.audioUrl,
        ...(suggest ? { sentence: d.example!, sentenceSuggested: true } : {}),
      };
    }));
  };

  const save = () => {
    if (!preview) return;
    if (findDuplicate(account.words, preview.word)) {
      toast("That word is already saved.", "error");
      return;
    }
    const bnPronunciation = orNull(preview.bnPronunciation);
    const definition = orNull(preview.definition);
    const w = createWord({
      word: preview.word,
      bnPronunciation,
      pronSource: bnPronunciation ? (preview.pronEdited ? "user" : preview.pronSource) : null,
      pronReliable: preview.pronEdited ? true : preview.pronReliable,
      bnMeaning: orNull(preview.bnMeaning),
      meaningLemma: preview.meaningLemma,
      definition,
      definitionStatus: definition ? "ok" : (preview.definitionStatus === "notfound" ? "notfound" : "error"),
      partOfSpeech: orNull(preview.partOfSpeech),
      audioUrl: preview.audioUrl,
      sentence: orNull(preview.sentence),
    });
    update((db) => addWord(db, account.email, w));
    toast(<span>Saved “{w.word}” to Practice. <Link className="underline" to="/practice">Practise now</Link></span>, "success");
    runRef.current++;
    setPreview(null);
    setWord("");
    setSentence("");
    wordRef.current?.focus();
  };

  const firstLoad = res.phonetic !== "ready" || res.meanings !== "ready";

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h1 className="text-2xl font-bold">Add a word</h1>

      <form className="card space-y-4 p-5" onSubmit={lookUp} noValidate>
        <div>
          <label htmlFor="word" className="label">English word or short phrase</label>
          <input
            id="word" ref={wordRef} className="input text-lg" autoFocus autoComplete="off" autoCapitalize="none"
            spellCheck={false} maxLength={80} placeholder="e.g. necessary" value={word}
            aria-invalid={!!error} aria-describedby={error ? "word-error" : undefined}
            onChange={(e) => { setWord(e.target.value); setError(null); setDup(null); }}
          />
          {error && (
            <p id="word-error" className="mt-2 text-sm text-rose-700" role="alert">
              {error}{" "}
              {dup && (
                <Link className="font-medium underline" to={`/${dup.status === "practice" ? "practice" : "all"}?open=${dup.id}`}>
                  Open “{dup.word}” in {dup.status === "practice" ? "Practice" : "All Words"}
                </Link>
              )}
            </p>
          )}
        </div>
        {!preview && (
          <div>
            <label htmlFor="sentence" className="label">Example sentence <span className="font-normal text-slate-500">(optional)</span></label>
            <textarea id="sentence" className="input" rows={2} value={sentence} onChange={(e) => setSentence(e.target.value)} />
          </div>
        )}
        <button type="submit" className="btn-primary w-full sm:w-auto">{preview ? "Look up again" : "Look up"}</button>
        {firstLoad && !preview && (
          <p className="text-xs text-slate-500">Loading the pronunciation and meaning dictionaries… you can start typing.</p>
        )}
      </form>

      {preview && (
        <section className="card space-y-4 p-5" aria-label="Preview" aria-busy={preview.pronLoading || preview.meaningLoading || preview.defLoading}>
          <div className="flex items-center gap-3">
            <h2 className="min-w-0 flex-1 break-words text-2xl font-bold">{preview.word}</h2>
            <SpeakButton word={preview.word} audioUrl={preview.audioUrl} />
          </div>

          <div>
            <label htmlFor="p-pron" className="label">
              Bangla pronunciation
              {!preview.pronLoading && preview.pronSource && (
                <span className="chip ml-2" title="Where the spelling came from">
                  {preview.pronEdited ? "edited" : preview.pronSource}{!preview.pronReliable && !preview.pronEdited ? " · ?" : ""}
                </span>
              )}
            </label>
            {preview.pronLoading ? <Skeleton big /> : (
              <>
                <input
                  id="p-pron" lang="bn" className="input bn text-3xl font-semibold" value={preview.bnPronunciation}
                  onChange={(e) => patch(preview.run, { bnPronunciation: e.target.value, pronEdited: true })}
                />
                {!preview.bnPronunciation && <p className="mt-1 text-xs text-rose-700">Lookup failed — you can type it, or use “Retry lookup” later.</p>}
                {!preview.pronReliable && !preview.pronEdited && (
                  <p className="mt-1 text-xs text-amber-700">? This spelling is a guess (word not in the pronunciation dictionary) — check it.</p>
                )}
              </>
            )}
          </div>

          <div>
            <label htmlFor="p-mean" className="label">Bangla meaning</label>
            {preview.meaningLoading ? <Skeleton lines={2} /> : (
              <>
                {preview.bnMeaning && <div className="mb-2"><MeaningView bn={preview.bnMeaning} lemma={preview.meaningLemma} /></div>}
                <textarea
                  id="p-mean" lang="bn" className="input bn" rows={2} value={preview.bnMeaning}
                  placeholder="Not found — type a meaning (optional)"
                  onChange={(e) => patch(preview.run, { bnMeaning: e.target.value, meaningLemma: null })}
                />
              </>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label htmlFor="p-def" className="label">English definition</label>
              {preview.defLoading ? <Skeleton lines={2} /> : (
                <>
                  <textarea
                    id="p-def" className="input" rows={3} value={preview.definition}
                    onChange={(e) => patch(preview.run, { definition: e.target.value })}
                  />
                  {!preview.definition && (
                    <p className="mt-1 text-xs text-slate-500">
                      {preview.definitionStatus === "notfound" ? "No definition found." : "Couldn't reach the dictionary — saved words get a “Retry lookup” button."}
                    </p>
                  )}
                </>
              )}
            </div>
            <div>
              <label htmlFor="p-pos" className="label">Part of speech</label>
              {preview.defLoading ? <Skeleton /> : (
                <input id="p-pos" className="input" value={preview.partOfSpeech} onChange={(e) => patch(preview.run, { partOfSpeech: e.target.value })} />
              )}
            </div>
          </div>

          <div>
            <label htmlFor="p-sent" className="label">
              Example sentence {preview.sentenceSuggested && <span className="chip ml-1 bg-amber-100 text-amber-800">suggested</span>}
            </label>
            <div className="flex gap-2">
              <textarea
                id="p-sent" className="input" rows={2} value={preview.sentence}
                onChange={(e) => patch(preview.run, { sentence: e.target.value, sentenceSuggested: false })}
              />
              {preview.sentence && (
                <button type="button" className="btn-ghost" onClick={() => patch(preview.run, { sentence: "", sentenceSuggested: false })} aria-label="Clear sentence">
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <button type="button" className="btn-primary flex-1 sm:flex-none" onClick={save}>Save to Practice</button>
            <button type="button" className="btn-ghost" onClick={() => { runRef.current++; setPreview(null); }}>Cancel</button>
          </div>
        </section>
      )}
    </div>
  );
}
