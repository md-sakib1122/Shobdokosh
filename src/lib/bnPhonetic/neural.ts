// Neural G2P: port of _NeuralG2P (g2p_en's GRU encoder–decoder) on Float32Arrays.

export interface ManifestEntry { name: string; shape: number[]; offset: number }
interface Tensor { data: Float32Array; shape: number[] }

const GRAPHEMES = ["<pad>", "<unk>", "</s>", ..."abcdefghijklmnopqrstuvwxyz"];
const PHONEMES = ["<pad>", "<unk>", "<s>", "</s>",
  "AA0", "AA1", "AA2", "AE0", "AE1", "AE2", "AH0", "AH1", "AH2", "AO0", "AO1", "AO2",
  "AW0", "AW1", "AW2", "AY0", "AY1", "AY2", "B", "CH", "D", "DH", "EH0", "EH1", "EH2",
  "ER0", "ER1", "ER2", "EY0", "EY1", "EY2", "F", "G", "HH", "IH0", "IH1", "IH2", "IY0",
  "IY1", "IY2", "JH", "K", "L", "M", "N", "NG", "OW0", "OW1", "OW2", "OY0", "OY1", "OY2",
  "P", "R", "S", "SH", "T", "TH", "UH0", "UH1", "UH2", "UW", "UW0", "UW1", "UW2", "V",
  "W", "Y", "Z", "ZH"];

export class NeuralG2P {
  private v: Record<string, Tensor> = {};
  private g2i = new Map(GRAPHEMES.map((g, i) => [g, i]));
  // x @ W_ih.T + b_ih depends only on the token id: precomputed per embedding row
  private inputProj: Record<string, Float32Array[]> = {};

  constructor(manifest: ManifestEntry[], buffer: ArrayBuffer) {
    for (const { name, shape, offset } of manifest) {
      const size = shape.reduce((a, b) => a * b, 1);
      this.v[name] = { data: new Float32Array(buffer, offset, size), shape };
    }
    for (const k of ["enc_emb", "enc_w_ih", "enc_w_hh", "dec_emb", "fc_w", "fc_b"]) {
      if (!this.v[k]) throw new Error(`g2p checkpoint missing ${k}`);
    }
    for (const pre of ["enc_", "dec_"]) {
      const emb = this.v[pre + "emb"];
      this.inputProj[pre] = Array.from({ length: emb.shape[0] }, (_, i) =>
        this.linear(this.row(emb, i), this.v[pre + "w_ih"], this.v[pre + "b_ih"]));
    }
  }

  /** y = x @ W.T + b for W of shape (out, in). */
  private linear(x: Float32Array, w: Tensor, b: Tensor): Float32Array {
    const [out, inp] = w.shape;
    const y = new Float32Array(out);
    const W = w.data;
    for (let o = 0; o < out; o++) {
      let acc = 0;
      let r = o * inp;
      let i = 0;
      for (; i + 4 <= inp; i += 4, r += 4) {
        acc += x[i] * W[r];
        acc += x[i + 1] * W[r + 1];
        acc += x[i + 2] * W[r + 2];
        acc += x[i + 3] * W[r + 3];
      }
      for (; i < inp; i++, r++) acc += x[i] * W[r];
      y[o] = acc + b.data[o];
    }
    return y;
  }

  private row(t: Tensor, i: number): Float32Array {
    const d = t.shape[1];
    return t.data.subarray(i * d, (i + 1) * d);
  }

  /** One GRU step for token `id` (its embedding row is the input x). */
  cell(id: number, h: Float32Array, pre: string): Float32Array {
    const v = this.v;
    const gi = this.inputProj[pre][id];
    const gh = this.linear(h, v[pre + "w_hh"], v[pre + "b_hh"]);
    const k = gi.length / 3;
    const out = new Float32Array(k);
    for (let j = 0; j < k; j++) {
      const r = 1 / (1 + Math.exp(-(gi[j] + gh[j])));
      const z = 1 / (1 + Math.exp(-(gi[k + j] + gh[k + j])));
      const n = Math.tanh(gi[2 * k + j] + r * gh[2 * k + j]);
      out[j] = (1 - z) * n + z * h[j];
    }
    return out;
  }

  predict(word: string): string | null {
    const v = this.v;
    const ids = [...word].map((c) => this.g2i.get(c) ?? 1);
    ids.push(2);
    let h: Float32Array = new Float32Array(v["enc_w_hh"].shape[1]);
    for (const i of ids) h = this.cell(i, h, "enc_");
    const out: string[] = [];
    let prev = 2; // <s>
    for (let step = 0; step < word.length + 8; step++) {
      h = this.cell(prev, h, "dec_");
      const logits = this.linear(h, v["fc_w"], v["fc_b"]);
      prev = 0;
      for (let j = 1; j < logits.length; j++) if (logits[j] > logits[prev]) prev = j;
      if (prev === 3) break; // </s>
      out.push(PHONEMES[prev]);
    }
    const ph = out.filter((p) => !p.startsWith("<"));
    return ph.some((p) => /\d$/.test(p)) ? ph.join(" ") : null;
  }
}

export type NeuralLoader = () => Promise<{ manifest: ManifestEntry[]; buffer: ArrayBuffer }>;

let model: NeuralG2P | null = null;
let tried = false;
let loader: NeuralLoader | null = null;
let disabled = false;

/** Where to fetch the weights from (browser: /data/g2p, tests: the filesystem). */
export function setNeuralLoader(fn: NeuralLoader | null): void {
  loader = fn;
  tried = false;
  model = null;
}

/** Test hook: behave as if the checkpoint were unavailable. */
export function setNeuralDisabled(v: boolean): void { disabled = v; }

export const neuralTried = (): boolean => tried || disabled;

/** Load once; failures leave the model unavailable (pipeline falls back to rules). */
export async function loadNeural(): Promise<void> {
  if (tried) return;
  try {
    if (loader) {
      const { manifest, buffer } = await loader();
      model = new NeuralG2P(manifest, buffer);
    }
  } catch {
    model = null; // bad file / network → skip step
  }
  tried = true;
}

export function neural(): NeuralG2P | null {
  return disabled ? null : model;
}
