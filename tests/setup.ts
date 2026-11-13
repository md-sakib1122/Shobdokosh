// Node-side setup for bn_phonetic: CMUdict, overrides.json and neural weights from disk.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as bn from "../src/lib/bnPhonetic";
import type { ManifestEntry } from "../src/lib/bnPhonetic/neural";

const ROOT = resolve(__dirname, "..");
export const readJson = <T,>(rel: string): T => JSON.parse(readFileSync(resolve(ROOT, rel), "utf-8")) as T;

let done: Promise<void> | null = null;
export function setupBn(): Promise<void> {
  done ??= (async () => {
    bn.setNeuralLoader(async () => {
      const buf = readFileSync(resolve(ROOT, "public/data/g2p/weights.bin"));
      return {
        manifest: readJson<ManifestEntry[]>("public/data/g2p/manifest.json"),
        buffer: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      };
    });
    await bn.loadCmu();
    await bn.loadNeural();
    bn.loadOverrides(readJson("public/data/overrides.json"));
  })();
  return done;
}
