"""Run every CMUdict word through bn_phonetic and flag malformed Bangla orthography."""
import re
import sys
import time
from collections import Counter

import pronouncing

import bn_phonetic as bn

KAR = "ািীুূৃেৈোৌ"
INDEP = "অআইঈউঊঋএঐওঔ"
HAS = "্"
ZWJ = "‍"

CHECKS = [
    ("starts with vowel sign/hasanta/ং", re.compile(rf"^[{KAR}{HAS}ংঃঁ]")),
    ("vowel sign after independent vowel", re.compile(rf"[{INDEP}][{KAR}]")),
    ("two vowel signs in a row", re.compile(rf"[{KAR}][{KAR}]")),
    ("trailing hasanta", re.compile(rf"{HAS}$")),
    ("hasanta before vowel/ং", re.compile(rf"{HAS}[{KAR}{INDEP}ংঃঁ]")),
    ("double hasanta", re.compile(rf"{HAS}{HAS}")),
    ("vowel sign after ং", re.compile(rf"ং[{KAR}{HAS}]")),
    ("non-Bangla character", re.compile(rf"[^ঀ-৿{ZWJ}]")),
    ("hasanta on য় (not য়্য)", re.compile(rf"য়{HAS}(?!য)")),
    ("ZWJ not in র‍্য", re.compile(rf"(?<!র){ZWJ}|{ZWJ}(?!{HAS}য)")),
]


def validate(s: str) -> list[str]:
    if not s:
        return ["empty"]
    return [name for name, rx in CHECKS if rx.search(s)]


def main(limit=None):
    pronouncing.init_cmu()
    words = sorted({w for w, _ in pronouncing.pronunciations if re.fullmatch(r"[a-z]+(?:'[a-z]+)?", w)})
    if limit:
        words = words[:: max(1, len(words) // limit)]
    bad, crashes, src = [], [], Counter()
    t0 = time.time()
    for w in words:
        try:
            p = bn.pronounce(w)
        except Exception as e:                       # noqa: BLE001
            crashes.append((w, repr(e)))
            continue
        src[p.source] += 1
        errs = validate(p.bangla)
        if errs:
            bad.append((w, p.bangla, p.arpabet, errs))
    dt = time.time() - t0
    print(f"{len(words)} words in {dt:.1f}s ({dt / len(words) * 1000:.2f} ms/word)")
    print("sources:", dict(src))
    print(f"crashes: {len(crashes)}   invalid: {len(bad)} ({len(bad) / len(words):.3%})")
    kinds = Counter(e for *_, errs in bad for e in errs)
    for k, v in kinds.most_common():
        print(f"  {v:6}  {k}")
    for w, e in crashes[:15]:
        print("CRASH", w, e)
    shown = Counter()
    for w, b, a, errs in bad:
        if shown[errs[0]] < 8:
            shown[errs[0]] += 1
            print(f"  {errs[0]:38} {w:18} {b:20} {a}")
    return bad, crashes


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else None)
