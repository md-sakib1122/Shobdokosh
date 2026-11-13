// Vitest globalSetup: clears old shard results, then prints the combined parity rate.
import { existsSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { OUT_DIR, SHARDS, TARGET, type Mismatch, type ShardResult } from "./config";

export function setup(): void {
  rmSync(OUT_DIR, { recursive: true, force: true });
}

export function teardown(): void {
  const results: ShardResult[] = [];
  for (let k = 0; k < SHARDS; k++) {
    const f = resolve(OUT_DIR, `shard-${k}.json`);
    if (existsSync(f)) results.push(JSON.parse(readFileSync(f, "utf-8")) as ShardResult);
  }
  if (results.length === 0) return; // parity files were not part of this run
  const total = results.reduce((a, r) => a + r.total, 0);
  const bad: Mismatch[] = results.flatMap((r) => r.bad);
  const rate = (100 * (total - bad.length)) / total;
  const lines = [
    "",
    `bn_phonetic parity vs Python: ${total - bad.length}/${total} = ${rate.toFixed(3)}% exact ` +
      `(target ≥ ${TARGET}%${results.length < SHARDS ? `, ${results.length}/${SHARDS} shards` : ""})`,
  ];
  if (bad.length) {
    const count: Record<string, number> = {};
    for (const b of bad) count[b.src] = (count[b.src] ?? 0) + 1;
    lines.push(`mismatches by Python source: ${JSON.stringify(count)}`);
    const grouped = new Map<string, Mismatch[]>();
    for (const b of bad.slice(0, 50)) grouped.set(b.src, [...(grouped.get(b.src) ?? []), b]);
    for (const [src, list] of grouped) {
      lines.push(`  [${src}]`);
      for (const b of list) lines.push(`    ${b.word.padEnd(22)} python=${b.want}  ts=${b.got}  (ts source: ${b.tsSrc})`);
    }
  }
  console.log(lines.join("\n") + "\n");
}
