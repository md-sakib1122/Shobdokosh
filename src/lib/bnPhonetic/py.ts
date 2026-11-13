// Small helpers that reproduce Python string semantics the port relies on.

/** Python `sub in s` for strings: substring test ("" is in every string). */
export const pyIn = (sub: string, s: string): boolean => s.includes(sub);

/** Python `s[a:b]` (negative and out-of-range indexes allowed). */
export function pySlice(s: string, a?: number | null, b?: number | null): string {
  const n = s.length;
  const norm = (x: number) => (x < 0 ? Math.max(0, n + x) : Math.min(x, n));
  const start = a == null ? 0 : norm(a);
  const end = b == null ? n : norm(b);
  return end > start ? s.slice(start, end) : "";
}

/** Python `str.split()` with no arguments. */
export const pySplit = (s: string): string[] => s.split(/\s+/).filter(Boolean);

/** Python `s.endswith((a, b, ...))`. */
export const endsWithAny = (s: string, ends: readonly string[]): boolean =>
  ends.some((e) => s.endsWith(e));

/** Python `str.isupper()` for ASCII text. */
export const isUpper = (s: string): boolean => /[A-Z]/.test(s) && !/[a-z]/.test(s);

/** Python `str.isalpha()` for ASCII text. */
export const isAlpha = (s: string): boolean => /^[A-Za-z]+$/.test(s);

/** Elementwise list equality (Python `==` on lists of str). */
export function listEq(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export const stripDigits = (p: string): string => p.replace(/\d/g, "");
