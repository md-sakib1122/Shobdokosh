import { resolve } from "node:path";

export const SHARDS = 4;
export const TARGET = 99.5;
export const OUT_DIR = resolve(__dirname, "../../node_modules/.parity");

export interface Mismatch { word: string; want: string; got: string; src: string; tsSrc: string }
export interface ShardResult { total: number; bad: Mismatch[]; ms: number }
