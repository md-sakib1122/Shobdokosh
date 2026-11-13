"""Convert bn_phonetic's g2p_checkpoint.npz into browser-friendly files.

Writes public/data/g2p/weights.bin (every array as little-endian float32, concatenated)
and public/data/g2p/manifest.json ([{name, shape, offset}], offset in bytes).

    python scripts/convert_checkpoint.py [path/to/g2p_checkpoint.npz]
"""
import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "bn_phonetic" / "g2p_checkpoint.npz"
OUT = ROOT / "public" / "data" / "g2p"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest, offset = [], 0
    with np.load(SRC) as z, open(OUT / "weights.bin", "wb") as f:
        for name in z.files:
            arr = np.ascontiguousarray(z[name].astype("<f4"))
            f.write(arr.tobytes())
            manifest.append({"name": name, "shape": list(arr.shape), "offset": offset})
            offset += arr.nbytes
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=1), encoding="utf-8")
    print(f"wrote {len(manifest)} arrays, {offset:,} bytes → {OUT}")


if __name__ == "__main__":
    main()
