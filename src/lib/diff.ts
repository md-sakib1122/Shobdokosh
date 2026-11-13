// Character-level diff of a typed answer against the target (weighted Levenshtein).

export type DiffType = "correct" | "wrong" | "missing" | "extra";

export interface DiffOp {
  type: DiffType;
  /** typed character (correct / wrong / extra) or the expected one (missing) */
  char: string;
  /** for "wrong": the character that should have been there */
  expected?: string;
}

/** Trim, lowercase, collapse internal whitespace. */
export const normalizeAnswer = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, " ");

export const isCorrect = (typed: string, target: string): boolean => normalizeAnswer(typed) === normalizeAnswer(target);

// A substitution costs a bit more than one insert/delete but less than both, so a
// doubled or dropped letter reads as extra/missing (neccesary: extra c, missing s)
// while a plain typo reads as one wrong letter (cut vs cat).
const SUB = 1.5;

export function diffChars(typedRaw: string, targetRaw: string): DiffOp[] {
  const a = [...normalizeAnswer(typedRaw)];
  const b = [...normalizeAnswer(targetRaw)];
  const n = a.length;
  const m = b.length;
  const d: number[][] = Array.from({ length: n + 1 }, (_, i) => {
    const row = new Array<number>(m + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const same = a[i - 1] === b[j - 1];
      d[i][j] = Math.min(d[i - 1][j - 1] + (same ? 0 : SUB), d[i - 1][j] + 1, d[i][j - 1] + 1);
    }
  }
  const ops: DiffOp[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1] && d[i][j] === d[i - 1][j - 1]) {
      ops.push({ type: "correct", char: a[i - 1] });
      i--; j--;
    } else if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + SUB) {
      ops.push({ type: "wrong", char: a[i - 1], expected: b[j - 1] });
      i--; j--;
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
      ops.push({ type: "extra", char: a[i - 1] });
      i--;
    } else {
      ops.push({ type: "missing", char: b[j - 1] });
      j--;
    }
  }
  return ops.reverse();
}
