// Parity: the TS port vs. the original Python bn_phonetic over tests/golden.json.
// The golden set is split into SHARDS files so Vitest runs them on parallel workers;
// tests/parity/summary.ts (globalSetup teardown) prints the combined match rate.
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, expect, test } from "vitest";
import * as bn from "../../src/lib/bnPhonetic";
import { readJson, setupBn } from "../setup";

import { OUT_DIR, SHARDS, TARGET, type Mismatch, type ShardResult } from "./config";

export function runShard(k: number): void {
  beforeAll(setupBn);
  test(`bn_phonetic parity shard ${k + 1}/${SHARDS}`, async () => {
    const golden = readJson<Record<string, string>>("tests/golden.json");
    const sources = readJson<Record<string, string>>("tests/golden_sources.json");
    const words = Object.keys(golden).filter((_, i) => i % SHARDS === k);
    const bad: Mismatch[] = [];
    const t0 = performance.now();
    for (let i = 0; i < words.length; i++) {
      if (i % 200 === 0) await new Promise((r) => setTimeout(r, 0)); // keep the worker RPC alive
      const word = words[i];
      let got: string;
      let tsSrc: string;
      try {
        const p = bn.pronounce(word);
        got = p.bangla;
        tsSrc = p.source;
      } catch (e) {
        got = `<error ${(e as Error).message}>`;
        tsSrc = "error";
      }
      if (got !== golden[word]) bad.push({ word, want: golden[word], got, src: sources[word], tsSrc });
    }
    const result: ShardResult = { total: words.length, bad, ms: performance.now() - t0 };
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(resolve(OUT_DIR, `shard-${k}.json`), JSON.stringify(result));
    const rate = (100 * (words.length - bad.length)) / words.length;
    expect(rate).toBeGreaterThanOrEqual(TARGET);
  });
}
