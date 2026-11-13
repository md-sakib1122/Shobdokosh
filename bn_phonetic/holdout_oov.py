"""Hold-out test: hide a dictionary word, run each fallback path alone, compare with the
dictionary-path output. NOTE: the neural model was trained on CMUdict, so its score here
is optimistic (it has seen these words); morphology/compound have no such leak."""
import difflib, random, re, sys
from collections import defaultdict
import pronouncing
import bn_phonetic as bn
from sweep_cmu import validate

random.seed(7)
pronouncing.init_cmu()
words = sorted({w for w, _ in pronouncing.pronunciations if re.fullmatch(r"[a-z]{6,}", w)})
sample = random.sample(words, int(sys.argv[1]) if len(sys.argv) > 1 else 3000)
bn.OVERRIDES.clear()

stats = defaultdict(lambda: [0, 0, 0.0, 0])   # applied, exact, sim, invalid
examples = defaultdict(list)
for w in sample:
    ref = bn.pronounce(w).bangla
    bn._EXCLUDE.add(w)
    for path in ("morphology", "compound", "neural"):
        p = bn._pronounce(w, True, (path,))
        if p.source != path:
            continue
        st = stats[path]
        st[0] += 1
        st[1] += p.bangla == ref
        st[2] += difflib.SequenceMatcher(None, p.bangla, ref).ratio()
        st[3] += bool(validate(p.bangla))
        if p.bangla != ref and len(examples[path]) < 12:
            examples[path].append((w, p.bangla, ref))
    bn._EXCLUDE.discard(w)

print(f"{len(sample)} held-out dictionary words (len ≥ 6)")
print(f"{'path':11} {'applies':>8} {'exact':>8} {'sim':>6} {'invalid':>8}")
for path in ("morphology", "compound", "neural"):
    a, e, s, inv = stats[path]
    if a:
        print(f"{path:11} {a / len(sample):8.1%} {e / a:8.1%} {s / a:6.3f} {inv:8}")
for path, ex in examples.items():
    print(f"\n{path} mismatches:")
    for w, got, ref in ex:
        print(f"  {w:18} {got:20} ref {ref}")
