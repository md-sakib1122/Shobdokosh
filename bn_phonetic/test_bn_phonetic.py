"""pytest suite for bn_phonetic. Run: pytest -q"""
import json
import re
import subprocess
import sys
import threading
from pathlib import Path

import pytest

import bn_phonetic as bn
from sweep_cmu import validate

HERE = Path(__file__).parent


# ── core regressions: words whose spelling must never drift ──────────────────
GOLDEN = {
    # original examples
    "computer": "কম্পিউটার", "doctor": "ডক্টর", "chair": "চেয়ার",
    # vowel alignment / British vowels
    "teacher": "টিচার", "market": "মার্কেট", "message": "মেসেজ", "office": "অফিস",
    "glass": "গ্লাস", "hospital": "হসপিটাল", "football": "ফুটবল", "mobile": "মোবাইল",
    # glides
    "player": "প্লেয়ার", "power": "পাওয়ার", "quality": "কোয়ালিটি", "music": "মিউজিক",
    "sandwich": "স্যান্ডউইচ", "software": "সফটওয়্যার", "white": "হোয়াইট",
    "language": "ল্যাঙ্গুয়েজ", "equality": "ইকুয়ালিটি", "graduate": "গ্র্যাজুয়েট",
    # clusters and boundaries
    "international": "ইন্টারন্যাশনাল", "understand": "আন্ডারস্ট্যান্ড",
    "unemployment": "আনএমপ্লয়মেন্ট", "complete": "কমপ্লিট", "replace": "রিপ্লেস",
    "problem": "প্রবলেম", "transport": "ট্রান্সপোর্ট", "fluency": "ফ্লুয়েন্সি",
    # silent letters
    "island": "আইলান্ড", "through": "থ্রু", "knowledge": "নলেজ", "honest": "অনেস্ট",
    "rhythm": "রিদম",
    # IELTS vocabulary
    "significant": "সিগনিফিকেন্ট", "democracy": "ডিমক্রেসি", "education": "এজুকেশন",
    "artificial": "আর্টিফিশিয়াল", "efficient": "ইফিশিয়েন্ট", "sustainable": "সাস্টেইনেবল",
    "approximately": "অ্যাপ্রক্সিমেটলি", "duty": "ডিউটি", "society": "সসাইটি",
    # out of dictionary
    "decarbonisation": "ডিকার্বনাইজেশন", "microplastics": "মাইক্রোপ্লাস্টিকস",
    "greenwashing": "গ্রিনওয়াশিং", "upskilling": "আপস্কিলিং",
}


@pytest.mark.parametrize("word,expected", GOLDEN.items())
def test_golden(word, expected):
    assert bn.transliterate(word) == expected


# ── pipeline sources ─────────────────────────────────────────────────────────
@pytest.mark.parametrize("word,src", [
    ("computer", "cmudict"), ("analyse", "british"), ("microplastics", "morphology"),
    ("smartwatch", "compound"), ("netizen", "neural"), ("IELTS", "override"),
    ("GDP", "acronym"), ("dhaka", "override"),
])
def test_sources(word, src):
    assert bn.pronounce(word).source == src


def test_pronunciation_fields():
    p = bn.pronounce("Doctor")
    assert p.word == "Doctor" and p.bangla == "ডক্টর" and p.arpabet and p.reliable
    assert not bn.pronounce("zorblaxian").reliable


# ── text handling ────────────────────────────────────────────────────────────
def test_text_keeps_punctuation_digits_hyphens():
    out = bn.transliterate_text("Well-being matters, in 2026!")
    assert out == "ওয়েল-বিইং ম্যাটারস, ইন 2026!"   # plural -s stays unjoined, like বুকস


@pytest.mark.parametrize("token,expected", [
    ("UK", "ইউকে"), ("GDP", "জিডিপি"), ("USA", "ইউএসএ"), ("AI", "এআই"),
    ("NASA", "নাসা"), ("I", "আই"),
])
def test_acronyms(token, expected):
    assert bn.transliterate_text(token) == expected


def test_shouting_text_is_read_as_words():
    assert bn.transliterate_text("PLEASE HELP ME") == "প্লিজ হেল্প মি"


def test_contractions_possessives_camelcase():
    assert bn.transliterate("don't") == "ডোন্ট"
    assert bn.transliterate("It’s") == "ইটস"
    assert bn.transliterate("Bangladesh's") == "বাংলাদেশেজ"
    assert bn.transliterate("ChatGPT") == "চ্যাটজিপিটি"
    assert bn.transliterate("YouTube") == "ইউটিউব"


def test_analyze_text_order():
    words = [p.word for p in bn.analyze_text("The UK, AI and you.")]
    assert words == ["The", "UK", "AI", "and", "you"]


def test_empty_and_non_alpha():
    assert bn.transliterate("") == ""
    assert bn.transliterate("2026") == "2026"
    assert bn.transliterate_text("") == ""


# ── overrides ────────────────────────────────────────────────────────────────
def test_load_overrides_dict_and_json(tmp_path):
    before = dict(bn.OVERRIDES)
    try:
        assert bn.transliterate("hospital") == "হসপিটাল"
        bn.load_overrides({"Hospital": "হাসপাতাল"})
        assert bn.transliterate("hospital") == "হাসপাতাল"      # cache invalidated
        f = tmp_path / "ovr.json"
        f.write_text(json.dumps({"doctor": "ডাক্তার"}, ensure_ascii=False), encoding="utf-8")
        bn.load_overrides(f, replace=True)
        assert bn.transliterate("doctor") == "ডাক্তার"
        assert bn.transliterate("hospital") == "হসপিটাল"       # replaced set dropped it
        assert bn.transliterate("dhaka") == "ঢাকা"            # built-ins survive replace
    finally:
        bn.OVERRIDES.clear()
        bn.OVERRIDES.update(before)
        bn.pronounce.cache_clear()


# ── robustness ───────────────────────────────────────────────────────────────
def test_works_without_neural_model(monkeypatch):
    monkeypatch.setattr(bn, "_neural", lambda: None)
    p = bn._pronounce("zorblaxian")
    assert p.source == "rules" and p.bangla and not validate(p.bangla)


@pytest.mark.parametrize("word", ["zzz", "qwrtp", "aaaaaa", "x", "rhythms", "strengths",
                                  "antidisestablishmentarianism", "pneumonoultramicroscopic"])
def test_weird_inputs_are_valid_bangla(word):
    out = bn.transliterate(word)
    assert out and not validate(out), out


def test_thread_safety():
    words = list(GOLDEN) * 20
    errors = []

    def run(chunk):
        for w in chunk:
            if bn.transliterate(w) != GOLDEN[w]:
                errors.append(w)

    bn.pronounce.cache_clear()
    threads = [threading.Thread(target=run, args=(words[i::8],)) for i in range(8)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert not errors


def test_dictionary_sample_is_valid():
    import pronouncing
    pronouncing.init_cmu()
    ws = sorted({w for w, _ in pronouncing.pronunciations if re.fullmatch(r"[a-z]+", w)})[::25]
    bad = [(w, bn.transliterate(w)) for w in ws if validate(bn.transliterate(w))]
    assert not bad, bad[:10]


# ── accuracy floors (run the benchmark scripts in a subprocess) ──────────────
def _exact_pct(script):
    out = subprocess.run([sys.executable, str(HERE / script), "-q"], capture_output=True,
                         text=True, cwd=HERE, check=True).stdout
    return float(re.search(r"^exact\s+\d+\s+([\d.]+)%", out, re.M).group(1))


def test_ielts_accuracy_floor():
    assert _exact_pct("bench_ielts.py") >= 80.0


def test_general_accuracy_floor():
    assert _exact_pct("bench_general.py") >= 84.0
