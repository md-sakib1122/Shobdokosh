"""Run the ORIGINAL Python bn_phonetic over the app's vocabulary → tests/golden.json.

Words: every single-word `en` in E2Bdatabase.json plus the `english` column of
results_ielts.csv and results_general.csv. Overrides from overrides.json are loaded.

    python scripts/make_golden.py
Writes tests/golden.json ({word: bangla}) and tests/golden_sources.json ({word: source}).
"""
import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENGINE = ROOT / "bn_phonetic"
sys.path.insert(0, str(ENGINE))

import bn_phonetic as bn  # noqa: E402

SINGLE = re.compile(r"[A-Za-z]+(?:['’][A-Za-z]+)*")


def words() -> list[str]:
    out: dict[str, None] = {}
    data = json.loads((ROOT / "E2Bdatabase.json").read_text(encoding="utf-8"))
    for e in data:
        w = str(e.get("en", "")).strip()
        if SINGLE.fullmatch(w):
            out[w] = None
    for name in ("results_ielts.csv", "results_general.csv"):
        with open(ENGINE / name, encoding="utf-8-sig", newline="") as f:
            for row in csv.DictReader(f):
                w = (row.get("english") or "").strip()
                if w:
                    out[w] = None
    return list(out)


def main() -> None:
    bn.load_overrides(ENGINE / "overrides.json")
    bn.warmup()
    golden, sources = {}, {}
    ws = words()
    for k, w in enumerate(ws):
        p = bn.pronounce(w)
        golden[w], sources[w] = p.bangla, p.source
        if k % 10000 == 0:
            print(f"{k}/{len(ws)}", file=sys.stderr)
    tests = ROOT / "tests"
    tests.mkdir(exist_ok=True)
    (tests / "golden.json").write_text(json.dumps(golden, ensure_ascii=False), encoding="utf-8")
    (tests / "golden_sources.json").write_text(json.dumps(sources), encoding="utf-8")
    counts: dict[str, int] = {}
    for s in sources.values():
        counts[s] = counts.get(s, 0) + 1
    print(f"wrote {len(golden)} words; sources: {counts}")


if __name__ == "__main__":
    main()
