// Hide the target word (and simple inflections) in an example sentence: "____".

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function inflections(word: string): string[] {
  const w = word.trim().toLowerCase();
  const out = new Set([w]);
  const last = w[w.length - 1];
  for (const s of ["s", "es", "ed", "d", "ing", "er", "ers", "ly", "'s"]) out.add(w + s);
  if (w.endsWith("e")) for (const s of ["ing", "ed", "er"]) out.add(w.slice(0, -1) + s); // make → making
  if (w.endsWith("y")) for (const s of ["ies", "ied", "ier", "iest", "ily"]) out.add(w.slice(0, -1) + s);
  if (/[^aeiou][aeiou][^aeiouwxy]$/.test(w)) for (const s of ["ing", "ed", "er"]) out.add(w + last + s); // run → running
  return [...out].sort((a, b) => b.length - a.length);
}

export function maskSentence(sentence: string, word: string, mask = "____"): string {
  if (!word.trim()) return sentence;
  const alts = inflections(word).map((f) => esc(f).replace(/\s+/g, "\\s+").replace(/-/g, "[-\\s]?"));
  const rx = new RegExp(`(?<![A-Za-z])(?:${alts.join("|")})(?![A-Za-z])`, "gi");
  return sentence.replace(rx, mask);
}
