# bn_phonetic — English → Bangla pronunciation for EnglishJoy

Shows how an English word is pronounced, written in Bangla script:
computer → কম্পিউটার, doctor → ডক্টর, chair → চেয়ার, decarbonisation → ডিকার্বনাইজেশন.

## Files
| File | Purpose |
|---|---|
| `bn_phonetic.py` | The engine (single module) |
| `g2p_checkpoint.npz` | Neural model weights for unknown words — keep next to `bn_phonetic.py` |
| `pronunciation_router.py` | FastAPI router: `GET /pronunciation/word`, `POST /pronunciation/text` |
| `overrides.json` | Your curated spellings (win over the engine) |
| `test_bn_phonetic.py` | pytest suite (81 tests incl. accuracy floors) |
| `bench_ielts.py`, `bench_general.py` | Accuracy benchmarks → `results_*.csv` |
| `sweep_cmu.py` | Runs all 124k dictionary words through a Bangla orthography validator |
| `holdout_oov.py` | Measures the out-of-dictionary fallbacks on hidden dictionary words |

## Install
```bash
pip install -r requirements.txt     # pronouncing, numpy
```
No NLTK, no network calls at runtime.

## Use
```python
import bn_phonetic as bn
bn.warmup()                                   # once at startup (~0.2 s)
bn.transliterate("sustainability")            # 'সাস্টেইনাবিলিটি'
bn.pronounce("netizen")                       # Pronunciation(word, bangla, arpabet, source)
bn.transliterate_text("I'm taking the IELTS!")  # 'আইম টেকিং দ্য আইইএলটিএস!'
bn.analyze_text(essay)                        # per-word results for UI tooltips
bn.load_overrides("overrides.json")           # or set BN_OVERRIDES_PATH
```
`pronounce(w).reliable` is `False` for neural/rule guesses — the router logs those so you
can review them and add good spellings to `overrides.json`.

## How a word is resolved
1. overrides → 2. CMUdict (134k words) → 3. British spelling (colour, analyse, -isation)
→ 4. morphology (un-/re-/-ness/-ize/-ability…) → 5. compounds (smart+watch)
→ 6. neural G2P → 7. letter rules. ALL-CAPS tokens are spelled as acronyms (GDP → জিডিপি).

## Accuracy (engine only, overrides disabled)
| Benchmark | Exact | Acceptable* | Similarity |
|---|---|---|---|
| 233 IELTS academic words | 82.4% | 87.6% | 0.983 |
| 250 everyday loanwords | 85.6% | 88.4% | 0.978 |
| 124k dictionary words — malformed Bangla | 0 | | |

*Acceptable = exact or differs only in ্ / ী-ি / ঙ-ং.
Unknown-word fallbacks on hidden dictionary words: morphology 81% exact; compounds
~70% where the pipeline reaches them (51% if forced on every word); neural ~67%
(optimistic: the model was trained on CMUdict).

## Deliberate choices (it is a pronunciation app)
- Faithful sound over habitual spelling: developed → ডিভেলপট (sounds like *t*),
  train → ট্রেইন, police → পলিস — everyday Bangladeshi spelling would use ড / ট্রেন / পুলিশ.
- British where UK/US differ: office → অফিস, glass → গ্লাস, mobile → মোবাইল,
  duty → ডিউটি, dictionary → ডিকশনারি.
- Bangladeshi conventions for script: reph, ya-phala (ব্যাংক), এয়ার for -air.
Change any of these per word with overrides.

## Tests
```bash
pytest -q            # 81 tests, ~2 s
python sweep_cmu.py  # full-dictionary validity sweep, ~20 s
```

## Credits
Neural weights: `checkpoint20.npz` from g2p_en by Kyubyong Park & Jongseok Kim,
Apache License 2.0 (https://github.com/Kyubyong/g2p). Pronunciations: CMU Pronouncing
Dictionary via `pronouncing`.
