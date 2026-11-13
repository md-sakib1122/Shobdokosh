"""
bn_phonetic.py — English → Bangla pronunciation script (বাংলা উচ্চারণ লিপি)

Built for an IELTS learning app: shows how an English word is pronounced, written in
Bangla script the way Bangladeshi readers expect (computer → কম্পিউটার, doctor → ডক্টর,
chair → চেয়ার), leaning British where UK and US pronunciation differ (office → অফিস,
glass → গ্লাস).

Lookup pipeline (first hit wins)
    1. OVERRIDES            curated spellings (built-in + optional JSON file)
    2. CMUdict              134k words with stress, via `pronouncing`
    3. British spelling     colour/organisation/analyse/travelled → US form → CMUdict
    4. Morphology           un-/re-/dis-… + -s/-ed/-ing/-ness/-ize/-ism… on a known stem
    5. Compounds            microplastics = micro + plastics, smartwatch = smart + watch
    6. Neural G2P           g2p_en's GRU model run in pure numpy (no NLTK, no network)
    7. Grapheme rules       last resort if the neural checkpoint is unavailable
Acronyms not in the dictionary are spelled out (IELTS → আইইএলটিএস).

Phones → Bangla
    * every vowel phone is aligned to its spelling group (DP) so ambiguous vowels resolve
      like Bangladeshi spelling: doctor→ডক্টর, teacher→টিচার, market→মার্কেট, message→মেসেজ
    * kar vs. independent vowel, য়-glide in hiatus (প্লেয়ার, পাওয়ার), W/Y glides
      (কোয়ালিটি, স্যান্ডউইচ, মিউজিক), -air/-ear (চেয়ার, নিয়ার), NG (সিঙ্গার, ব্যাংক),
      ঞ্চ/ঞ্জ, reph, ra/ya-phala, wh- (হোয়াইট)
    * conjunct policy: only clusters Bangla actually writes (ন্ট ম্প ক্ট স্ট …)

API
    transliterate("computer")                  → 'কম্পিউটার'
    pronounce("decarbonisation")               → Pronunciation(word, bangla, arpabet, source)
    transliterate_text("I'm taking the IELTS!") → 'আইম টেকিং দ্য আইইএলটিএস!'
    load_overrides("overrides.json")           # {"word": "বাংলা", ...}
    warmup()                                   # call once at app startup

Neural model weights: checkpoint from g2p_en (Kyubyong Park & Jongseok Kim, Apache-2.0).
Looked up in $BN_G2P_CHECKPOINT, then ./g2p_checkpoint.npz next to this file, then an
installed g2p_en package. Without it, step 6 is skipped.
"""
from __future__ import annotations

import json
import os
import re
import threading
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import pronouncing

# ───────────────────────────── phone inventory ─────────────────────────────
VOWELS = {"AA", "AE", "AH", "AO", "AW", "AY", "EH", "ER", "EY",
          "IH", "IY", "OW", "OY", "UH", "UW"}

CONSONANTS = {
    "B": "ব", "CH": "চ", "D": "ড", "DH": "দ", "F": "ফ", "G": "গ", "HH": "হ",
    "JH": "জ", "K": "ক", "L": "ল", "M": "ম", "N": "ন", "NG": "ং", "P": "প",
    "R": "র", "S": "স", "SH": "শ", "T": "ট", "TH": "থ", "V": "ভ", "Z": "জ",
    "ZH": "জ",
}

# Default vowel forms: (independent, kar after consonant, glide after vowel)
VOWEL_FORMS = {
    "AA": ("আ", "া", "য়া"),   "AE": ("অ্যা", "্যা", "য়া"), "AH": ("আ", "া", "য়া"),
    "AO": ("অ", "", "য়"),     "AW": ("আউ", "াউ", "য়াউ"),  "AY": ("আই", "াই", "য়াই"),
    "EH": ("এ", "ে", "য়ে"),   "ER": ("আ", "া", "য়া"),     "EY": ("এ", "ে", "য়ে"),
    "IH": ("ই", "ি", "য়ি"),   "IY": ("ই", "ি", "য়ি"),     "OW": ("ও", "ো", "য়ো"),
    "OY": ("অয়", "য়", "য়"),   "UH": ("উ", "ু", "য়ু"),     "UW": ("উ", "ু", "য়ু"),
}

# W + vowel.  (independent/medial form, kar form after an onset consonant)
W_FORMS = {
    "IH": ("উই", "ুই"),   "IY": ("উই", "ুই"),    "EH": ("ওয়ে", "োয়ে"), "EY": ("ওয়ে", "োয়ে"),
    "AE": ("ওয়্যা", "োয়্যা"), "AA": ("ওয়া", "োয়া"), "AH": ("ওয়া", "োয়া"), "AO": ("ওয়া", "োয়া"),
    "AY": ("ওয়াই", "োয়াই"), "AW": ("ওয়াউ", "োয়াউ"), "ER": ("ওয়া", "োয়া"), "OW": ("ও", "ো"),
    "UH": ("উ", "ু"),     "UW": ("উ", "ু"),      "OY": ("ওয়", "োয়"),
}

# Medial clusters Bangla loanword spelling actually writes as conjuncts.
# Anything else stays unjoined (inherent vowel, unpronounced): হসপিটাল, ফুটবল.
CONJUNCTS = {
    ("ন", "ট"), ("ন", "ড"), ("ন", "থ"), ("ঞ", "চ"), ("ঞ", "জ"),
    ("ম", "প"), ("ম", "ব"), ("ক", "ট"), ("ক", "স"), ("স", "ট"), ("স", "ক"),
    ("ল", "ট"), ("ল", "ড"), ("ল", "প"), ("ল", "ম"),
}
UNSTRESSED_CONJUNCTS = {("ন", "স")}   # fluency, currency, pencil (not consider)
FINAL_ONLY_CONJUNCTS = {("ল", "ক"), ("ল", "ফ"), ("প", "ট"), ("ন", "স")}   # milk, self, concept, dance

HASANTA, ZWJ = "্", "‍"

# Spelling letters each vowel phone usually comes from (for alignment cost)
TYPICAL = {"AA": "ao", "AE": "a", "AH": "aeoui", "AO": "aou", "AW": "ou",
           "AY": "iy", "EH": "ea", "ER": "eioua", "EY": "aei", "IH": "iey",
           "IY": "eiy", "OW": "o", "OY": "o", "UH": "ou", "UW": "ou"}

# ───────────────────────────── spelling alignment ─────────────────────────────
def _vowel_groups(word: str) -> list[tuple[str, int]]:
    """Maximal runs of vowel letters (y/w join a run when acting as vowels)."""
    groups, i, n = [], 0, len(word)
    while i < n:
        ch = word[i]
        is_v = ch in "aeiou" or (ch == "y" and i > 0 and word[i - 1] not in "aeiou")
        if not is_v:
            i += 1
            continue
        start = i
        i += 1
        while i < n and word[i] in "aeiou":
            i += 1
        if i < n and word[i] in "wy" and i > start:
            i += 1                                  # renew|able, play|er: w/y closes it
        groups.append((word[start:i], start))
    return groups


def _skip_cost(word: str, g: tuple[str, int]) -> float:
    text, start = g
    rest = word[start + len(text):]
    if text == "e" and rest in ("", "s", "d"):     # silent e / -es / -ed
        return 0.1 if rest == "" else 0.3
    return 1.0


def _pair_cost(word: str, g: tuple[str, int], ph: str) -> float:
    ph = ph.rstrip("012")
    text, start = g
    c = 0.0 if any(ch in text for ch in TYPICAL[ph]) else 1.0
    after = word[start + len(text):]
    if ph == "ER" and "r" not in after[:2]:
        c += 0.5                                    # ER should sit before an r
    if text in "io" and len(after) == 2 and after[1] == "e" and after[0] not in "aeiouwy":
        # magic e (mobile, time, cake): prefer the long vowel
        if ph in ("IH", "AH", "AE", "EH", "AA"):
            c += 0.3
        elif ph == "IY" and text == "i":
            c += 0.15
    return c


def _align(word: str, vphones: list[str]) -> tuple[float, list[tuple[str, int] | None]]:
    """Monotonic DP: each vowel phone → one spelling group; groups may be skipped
    (silent) or shared by two phones (radio 'io' → IY OW)."""
    groups = _vowel_groups(word)
    n, m = len(vphones), len(groups)
    if m == 0:
        return float(n), [None] * n

    @lru_cache(maxsize=None)
    def best(i: int, j: int, last_used: bool):
        if i == n:
            return sum(_skip_cost(word, groups[k]) for k in range(j, m)), ()
        options = []
        if j < m:   # assign phone i to group j
            c = _pair_cost(word, groups[j], vphones[i])
            sub, path = best(i + 1, j + 1, True)
            options.append((c + sub, (j,) + path))
            sub, path = best(i, j + 1, False)          # skip group j
            options.append((_skip_cost(word, groups[j]) + sub, path))
        if vphones[i] == "AH0":                        # epenthetic schwa: rhythm, -ism
            sub, path = best(i + 1, j, last_used)
            options.append((0.45 + sub, (None,) + path))
        if last_used and j > 0:                        # share previous group
            # sharing a one-letter group is unlikely (prism ≠ pri-sim); 'io','ue','ea' fine
            c = (0.4 if len(groups[j - 1][0]) > 1 else 0.9) + _pair_cost(word, groups[j - 1], vphones[i])
            sub, path = best(i + 1, j, True)
            options.append((c + sub, (j - 1,) + path))
        if not options:                                # out of groups
            return float(n - i) * 1.5, (None,) * (n - i)
        return min(options, key=lambda t: t[0])

    cost, path = best(0, 0, False)
    return cost, [groups[k] if k is not None else None for k in path]


# ───────────────────────────── core conversion ─────────────────────────────
def _parse(pron: str) -> list[tuple[str, str]]:
    out = []
    for ph in pron.split():
        m = re.match(r"([A-Z]+)(\d?)", ph)
        out.append((m.group(1), m.group(2)))
    return out


def _closed_e(word: str, grp, nxt) -> bool:
    """'e' in a closed syllable (mark-et, pock-et, want-ed) or before -ge (college)."""
    if not grp:
        return False
    after = word[grp[1] + len(grp[0]):]
    if nxt == "JH":
        return True
    return bool(after) and after[0] not in "aeiouy" and (len(after) == 1 or after[1] not in "aeiouy")


def _vowel_forms(word, phones, i, grp, shared=False) -> tuple[str, str, str, bool]:
    """Resolve one vowel phone in context → (independent, kar, glide, emits_R).
    shared: this vowel shares its spelling group with the previous vowel (radio 'io')."""
    p, s = phones[i]
    if shared and grp and len(grp[0]) > 1:
        grp = (grp[0][1:], grp[1] + 1)          # influ-e-ncer: use the later letter
    nxt = phones[i + 1][0] if i + 1 < len(phones) else None
    nxt2 = phones[i + 2][0] if i + 2 < len(phones) else None
    is_last = i == len(phones) - 1
    g = grp[0] if grp else ""
    indep, kar, glide = VOWEL_FORMS[p]
    r_closed = nxt == "R" and (nxt2 is None or nxt2 not in VOWELS)
    age = "a" in g and (nxt == "JH" or (nxt == "N" and nxt2 == "JH"))  # message, orange
    if grp and g == "a" and s == "0":               # chocolate, private, palace (-aCe)
        tail = word[grp[1] + 1:]
        age = age or (len(tail) == 2 and tail[1] == "e")
    if grp and g == "ai" and s == "0":              # captain, mountain
        age = True

    aring_ahead = (nxt == "R" and g == "a" and grp is not None
                   and re.fullmatch(r"r(ing|ed|er|ers)", word[grp[1] + 1:]) is not None)
    if p == "ER":
        if s == "0" and "o" in g and "e" not in g and "ou" not in g:   # doctor → -অর
            return "অ", "", "য়", True
        return "আ", "া", "য়া", True

    # British bath-trap /ɑː/: glass, class, bath, chance, answer, plant, advantage
    nxt3 = phones[i + 3][0] if i + 3 < len(phones) else None
    bath = (nxt in ("S", "F") and (nxt2 is None or nxt2 not in VOWELS)) \
        or (nxt == "TH" and (nxt2 is None or nxt2 == "R")) \
        or (nxt == "N" and nxt2 in ("S", "CH")) \
        or (nxt == "N" and nxt2 == "T" and (nxt3 is None or nxt3 not in VOWELS
                                             or (nxt3 == "IH" and i + 4 < len(phones)
                                                 and phones[i + 4][0] == "JH")))
    if p == "AE" and bath:
        indep, kar, glide = "আ", "া", "য়া"
    # US merges marry/Mary: EH before R+vowel spelled 'a' → ্যা (parents, charity)
    if p == "EH" and s == "1" and nxt == "R" and nxt2 in VOWELS and g == "a" and i > 0 \
            and not aring_ahead:
        indep, kar, glide = "অ্যা", "্যা", "য়া"
    # cause, because, law: US AA spelled au/aw → British অ
    if p == "AA" and g in ("au", "aw"):
        indep, kar, glide = "অ", "", "য়"
    # train, sustain, entertain: ai → েই
    if p == "EY" and g == "ai":
        indep, kar, glide = "এই", "েই", "য়েই"

    if p == "AA" and "o" in g and "a" not in g:       # British o: doctor, office, shop
        indep, kar, glide = "অ", "", "য়"

    elif p == "IY" and g == "ay" and is_last:
        indep, kar, glide = "এ", "ে", "য়ে"                  # monday, friday
    elif p == "AO":
        if any(x in g for x in ("oa", "ou")):
            indep, kar, glide = "ও", "ো", "য়ো"              # board, course
        port = nxt == "R" and nxt2 is not None and nxt2 not in VOWELS and i > 0 \
            and phones[i - 1][0] == "P"
        if ((nxt == "R" and nxt2 is None) or port) and kar == "":    # door, four, airport
            indep, kar, glide = "ও", "ো", "য়ো"

    elif p == "AH":
        if s == "0":
            tail = word[grp[1] + len(grp[0]):] if grp else ""
            prev_p = phones[i - 1][0] if i > 0 else None
            if "u" in g and prev_p in ("JH", "CH"):
                indep, kar, glide = "উ", "ু", "য়ু"          # education এজুকেশন
            elif g in ("ia", "ie") and prev_p in ("SH", "ZH", "CH"):
                before = word[grp[1] - 2:grp[1] - 1] if grp[1] >= 2 else ""
                if g == "ie":
                    indep, kar, glide = "ইয়ে", "িয়ে", "য়িয়ে"   # efficient, ancient
                elif before in ("e", "o", "a"):
                    indep, kar, glide = "অ্যা", "্যা", "য়া"   # social, special
                else:
                    indep, kar, glide = "ইয়া", "িয়া", "য়িয়া"   # artificial, essential
            elif g in ("a",) and re.fullmatch(
                    r"n(t|ts|ce|ces|cy|cies|tly)|cy|cies|ble|bles|bly|"
                    r"[^aeiou]e(ly|s|d|ness)?", tail):
                indep, kar, glide = "এ", "ে", "য়ে"          # significant, democracy, -able
            elif is_last and g == "o":
                indep, kar, glide = "ও", "ো", "য়ো"          # auto|mation → অটোমেশন
            elif is_last:
                indep, kar, glide = "আ", "া", "য়া"          # pizza, camera, India
            elif age:
                indep, kar, glide = "এ", "ে", "য়ে"          # orange
            elif grp and g == "e" and grp[1] > 0 and word[grp[1] - 1] == "l" \
                    and word[grp[1] + 1:] in ("", "s", "d"):
                indep, kar, glide = "অ", "", "য়"            # table, apple, noodles
            elif "o" in g or g == "au":
                indep, kar, glide = "অ", "", "য়"            # computer, button, authority
            elif g.startswith("e"):
                indep, kar, glide = "এ", "ে", "য়ে"          # problem, student
            elif "i" in g:
                indep, kar, glide = "ই", "ি", "য়ি"          # pencil, university
            elif "a" in g or "u" in g:
                indep, kar, glide = "আ", "া", "য়া"          # hospital, minus
            else:
                indep, kar, glide = "অ", "", "য়"
            if g == "a" and indep == "আ" and not is_last:
                indep = "অ্যা"                              # about, adult, approximately

    elif p == "IH" and s == "0" and i == 0 and g == "e" and (
            (nxt == "K" and nxt2 == "S") or (nxt in ("N", "M") and nxt2 not in VOWELS)):
        indep, kar, glide = "এ", "ে", "য়ে"                  # explain → এক্স, environment → এন
    elif p == "IH" and s == "0" and (age or (g.startswith("e") and _closed_e(word, grp, nxt))) \
            and any(q in VOWELS for q, _ in phones[:i]):
        indep, kar, glide = "এ", "ে", "য়ে"                  # market, pocket, college (not re-/tele)

    # -air / -ear / -eer : chair চেয়ার, near নিয়ার ; preparing, caring → েয়ারিং
    aring = (p == "EH" and nxt == "R" and g == "a" and grp is not None
             and re.fullmatch(r"r(ing|ed|er|ers)", word[grp[1] + 1:]) is not None)
    if p in ("EH", "AE") and (r_closed or aring):
        indep, kar, glide = "এয়া", "েয়া", "য়েয়া"
    elif p in ("IH", "IY") and (r_closed or (
            nxt == "R" and grp is not None and g in ("e", "ea", "ee")
            and re.match(r"r(e|a|ing)", word[grp[1] + len(g):]))):
        indep, kar, glide = "ইয়া", "িয়া", "য়িয়া"     # here, coherence, appearance

    # diphthong before vowel or R: fire ফায়ার, power পাওয়ার, hour আওয়ার
    if p == "AY" and r_closed:
        return "আয়া", "ায়া", "য়ায়া", False
    if p == "AW" and r_closed:
        return "আওয়া", "াওয়া", "য়াওয়া", False
    if nxt in VOWELS and not (p == "AY" and nxt == "AH" and "iet" in word):
        if p == "AY":
            indep, kar, glide = "আ", "া", "য়া"
        elif p == "AW":
            indep, kar, glide = "আও", "াও", "য়াও"
    return indep, kar, glide, False


class _Tok:
    __slots__ = ("kind", "text", "onset", "no_reph", "brk", "stress", "weak_r", "last_syll")

    def __init__(self, kind, text, onset=False):
        self.kind, self.text, self.onset, self.no_reph, self.brk = kind, text, onset, False, False
        self.stress = ""   # stress digit of the vowel phone right after this consonant
        self.weak_r = False  # র from unstressed ER: exercise এক্সারসাইজ, not এক্সার্সাইজ
        self.last_syll = False  # the vowel after this consonant is the word's last vowel


def _phones_to_tokens(word: str, phones: list[tuple[str, str]],
                      marks: dict[int, str] | None = None) -> list[_Tok]:
    """marks: phone index → '|' (word/prefix boundary: new onset, no cluster across,
    vowel written independent after a consonant) or '+' (suffix: no cluster across)."""
    marks = marks or {}
    vidx = [k for k, (p, _) in enumerate(phones) if p in VOWELS]
    _, groups = _align(word, [phones[k][0] + (phones[k][1] if phones[k][0] == "AH" else "")
                              for k in vidx])
    grp_of = dict(zip(vidx, groups))
    shared_of = {vidx[k]: groups[k] is not None and groups[k] == groups[k - 1]
                 for k in range(1, len(vidx))}

    toks: list[_Tok] = []
    seen_vowel = False
    pending_brk = False
    i, n = 0, len(phones)
    strong_at = sorted(k for k, m in marks.items() if m == "|")

    def next_strong(k):
        return next((b for b in strong_at if b > k), n)

    def _mark(t):
        nonlocal pending_brk
        if pending_brk:
            t.brk, pending_brk = True, False
        return t

    def push_vowel(text):
        nonlocal seen_vowel
        if text:
            toks.append(_mark(_Tok("V", text)))
        elif toks and toks[-1].kind == "C":
            toks.append(_mark(_Tok("V", "")))   # inherent vowel: still breaks clusters
        seen_vowel = True

    def push_cons(text, nxt_idx=None):
        t = _mark(_Tok("C", text, onset=not seen_vowel))
        j = i + 1 if nxt_idx is None else nxt_idx
        if j < n and phones[j][0] in VOWELS:
            t.stress = phones[j][1]
            t.last_syll = not any(q in VOWELS for q, _ in phones[j + 1:])
        # chair-type glides (এয়ার, ফায়ার, আওয়ার) never take reph: এয়ারপোর্ট
        if text == "র" and toks and toks[-1].kind == "V" and toks[-1].text.endswith(
                ("েয়া", "িয়া", "ায়া", "াওয়া", "এয়া", "ইয়া", "আয়া", "আওয়া", "োয়্যা", "ওয়্যা")):
            t.no_reph = True
        toks.append(t)

    while i < n:
        p, s = phones[i]
        strong = marks.get(i) == "|"
        if i in marks and toks:
            pending_brk = True
            if strong:
                seen_vowel = False
        prev_kind = toks[-1].kind if toks else None
        nxt = phones[i + 1][0] if i + 1 < n else None

        seg = phones[:next_strong(i)]              # boundary acts as word end (more|over)
        if p in VOWELS:
            if p == "AH" and s == "0" and i > 0 and phones[i - 1][0] == "AY" and "iet" in word:
                i += 1                                 # society → সোসাইটি
                continue
            indep, kar, glide, emit_r = _vowel_forms(word, seg, i, grp_of.get(i),
                                                     shared_of.get(i, False))
            if strong and prev_kind == "C":
                push_vowel(indep)                     # over|all → ওভারঅল
            elif prev_kind == "C":
                if kar.startswith("্যা") and toks[-1].text == "র" and not (
                        len(toks) > 1 and toks[-2].kind == "C"):
                    toks[-1].text = "র" + ZWJ        # র‍্যা
                push_vowel(kar)
            elif prev_kind == "V":
                prev_p = phones[i - 1][0]
                if prev_p in ("IY", "IH") and p in ("OW", "IH"):
                    push_vowel("ও" if p == "OW" else "ই")   # radio রেডিও, being বিইং
                else:
                    push_vowel(glide)
            else:
                push_vowel(indep)
            if emit_r:
                push_cons("র")
                toks[-1].weak_r = s == "0"
            i += 1
            continue

        if p == "W" and i == 0 and word.startswith("wh") and nxt in VOWELS:
            push_cons("হ")
            prev_kind = "C"
        if p in ("W", "Y") and nxt in VOWELS:
            v = nxt
            gw = grp_of.get(i + 1)
            if p == "W" and gw and gw[0].startswith("u") and len(gw[0]) > 1:
                grp_of[i + 1] = (gw[0][1:], gw[1] + 1)          # conseq-ue-nce → e
            if prev_kind == "C" and toks[-1].text == "ং":
                prev_kind = None                    # Pyongyang → পিয়ংইয়াং
            indep, kar, glide, emit_r = _vowel_forms(word, seg, i + 1, grp_of.get(i + 1))
            r_special = kar in ("েয়া", "িয়া")
            qu = (p == "W" and prev_kind == "C" and toks[-1].text in ("ক", "গ", "ঙ্গ")
                  and not toks[-1].onset and re.search(r"[qg]u", word))
            if p == "W" and prev_kind == "V" and toks[-1].text.endswith(("ু", "উ")):
                text = glide                                            # u + w-glide → য়
            elif qu:
                text = "ুই" if v in ("IH", "IY") else "ু" + glide       # equality, language
            elif p == "W":
                after_onset = prev_kind == "C" and toks[-1].onset
                if r_special and v in ("IH", "IY"):
                    text = "ুইয়া" if after_onset else "উইয়া"       # queer, weird
                elif r_special:
                    text = "োয়্যা" if after_onset else "ওয়্যা"       # software
                else:
                    text = W_FORMS[v][1] if after_onset else W_FORMS[v][0]
            else:  # Y
                if prev_kind == "C":
                    if v in ("UW", "UH"):
                        text = "িউ"                                   # music, computer
                    elif phones[i + 1][1] == "0" and v in ("AH", "ER") and "u" in (
                            grp_of.get(i + 1) or ("",))[0]:
                        text = "ু"                                    # regular, popular
                    else:
                        text = "ি" + glide
                elif prev_kind == "V":
                    text = "য়" + kar if v not in ("UW", "UH") else "ইউ"   # lawyer
                else:
                    text = "ইউ" if v in ("UW", "UH") else "ই" + (
                        "য়া" if r_special else glide)               # you, yes, year
            push_vowel(text)
            if emit_r:
                push_cons("র")
                toks[-1].weak_r = phones[i + 1][1] == "0"
            i += 2
            continue

        if p == "W":
            push_vowel("উ"); i += 1; continue
        if p == "Y":
            push_vowel("ই"); i += 1; continue

        # consonants
        after_cj = phones[i + 2][1] if i + 2 < n and phones[i + 2][0] in VOWELS else ""
        if p == "N" and nxt in ("CH", "JH") and after_cj in ("", "0"):
            push_cons("ঞ")
        elif p == "NG":
            if nxt == "G":
                after = phones[i + 2][0] if i + 2 < n else None
                after2 = phones[i + 3][0] if i + 3 < n else None
                glide_v = after in ("Y", "W") and after2 in VOWELS        # angular
                push_cons("ঙ্গ" if after in VOWELS or glide_v else "ং")
                i += 2
                continue
            push_cons("ঙ্গ" if nxt in VOWELS else "ং")
        elif p == "Z" and i == n - 1 and word.endswith("s") and prev_kind == "C":
            push_cons("স")
        elif p == "ZH":
            sion = nxt == "AH" and i + 2 < n and phones[i + 2][0] == "N"
            push_cons("শ" if sion else "জ")
        else:
            push_cons(CONSONANTS[p])
        i += 1
    return toks


def _is_final_cluster(toks, k) -> bool:
    for j in range(k, len(toks)):
        if j > k and toks[j].brk:
            return True                      # trans|port: segment end counts as word end
        if toks[j].kind != "C":
            return False
    return True


_L_ONSET = {"প", "ক", "ফ"}   # re-PLACE, in-CLUDE, in-FLAtion — but PROB-lem, PUB-lic


def _render(toks: list[_Tok]) -> str:
    n = len(toks)

    def pair(k):
        if k + 1 >= n or toks[k].kind != "C" or toks[k + 1].kind != "C" or toks[k + 1].brk:
            return None
        return toks[k], toks[k + 1]

    def l_onset(k):           # consonant k + ল start a syllable: stressed, or after a coda
        p = pair(k)
        if not (p and p[1].text == "ল" and p[0].text in _L_ONSET):
            return False
        after_coda = k > 0 and toks[k - 1].kind == "C" and not toks[k].brk
        return p[1].stress in ("1", "2") or after_coda

    out = []
    for k, t in enumerate(toks):
        out.append(t.text)
        p = pair(k)
        if not p:
            continue
        a, b = t.text, p[1].text
        if a in ("ং", "ঙ্গ") or b == "ং":
            continue
        reph = a.startswith("র") and not t.onset and not t.no_reph \
            and not (t.weak_r and p[1].stress == "1")
        if b.startswith("র") or reph or t.onset:
            join = True                       # ra-phala, reph, word-initial cluster
        elif l_onset(k):
            join = True                       # রিপ্লেস, ইনক্লুড
        elif l_onset(k + 1):
            join = False                      # কমপ্লিট, এমপ্লয় (coda stays apart)
        else:
            join = (a, b[0]) in CONJUNCTS or (
                (a, b[0]) in FINAL_ONLY_CONJUNCTS and _is_final_cluster(toks, k + 1)) or (
                (a, b[0]) in UNSTRESSED_CONJUNCTS and p[1].stress == "0" and p[1].last_syll)
        if join:
            out.append(HASANTA)
    return "".join(out)


# ───────────────────────────── grapheme fallback (OOV) ─────────────────────────────
_G_DIGRAPH = {"sh": "শ", "ch": "চ", "th": "থ", "ph": "ফ", "ck": "ক", "ng": "ং",
              "gh": "গ", "wh": "ও", "qu": "কু", "tch": "চ"}
_G_CONS = {"b": "ব", "c": "ক", "d": "ড", "f": "ফ", "g": "গ", "h": "হ", "j": "জ",
           "k": "ক", "l": "ল", "m": "ম", "n": "ন", "p": "প", "q": "ক", "r": "র",
           "s": "স", "t": "ট", "v": "ভ", "w": "ও", "x": "ক্স", "z": "জ"}
_G_VOW = {"ee": ("ই", "ি"), "ea": ("ই", "ি"), "oo": ("উ", "ু"), "ou": ("আউ", "াউ"),
          "ai": ("এ", "ে"), "ay": ("এ", "ে"), "oa": ("ও", "ো"), "a": ("আ", "া"),
          "e": ("এ", "ে"), "i": ("ই", "ি"), "o": ("ও", "ো"), "u": ("আ", "া"), "y": ("ই", "ি")}


def _grapheme_fallback(word: str) -> str:
    w = word.lower()
    if len(w) > 2 and w.endswith("e") and w[-2] not in "aeiou":
        w = w[:-1]                                     # silent e
    toks, i, seen_v = [], 0, False
    while i < len(w):
        for L in (3, 2, 1):
            chunk = w[i:i + L]
            if chunk in _G_VOW and not (chunk == "y" and i == 0):
                indep, kar = _G_VOW[chunk]
                toks.append(_Tok("V", kar if toks and toks[-1].kind == "C" else indep))
                seen_v = True
                break
            if chunk in _G_DIGRAPH or (L == 1 and chunk in _G_CONS):
                c = _G_DIGRAPH.get(chunk) or _G_CONS[chunk]
                if chunk == "c" and w[i + 1:i + 2] in ("e", "i", "y"):
                    c = "স"
                if chunk == "g" and w[i + 1:i + 2] in ("e", "i"):
                    c = "জ"
                if chunk == "y":
                    c = "য়"
                toks.append(_Tok("C", c, onset=not seen_v))
                break
        else:
            L = 1
        i += L
    return _render(toks)



# ───────────────────────────── overrides ─────────────────────────────
# Only words the pipeline cannot derive. Pronunciation-faithful (this is a learning
# app), so Bangla-ised spellings that teach a wrong sound are deliberately NOT here.
_BUILTIN_OVERRIDES: dict[str, str] = {
    # function words (weak forms)
    "the": "দ্য", "a": "আ", "an": "অ্যান", "of": "অফ", "and": "অ্যান্ড", "to": "টু",
    "for": "ফর", "or": "অর", "are": "আর", "were": "ওয়্যার", "your": "ইওর",
    "one": "ওয়ান", "two": "টু", "once": "ওয়ান্স",
    # irregular spelling-to-sound the rules misread
    "colour": "কালার", "color": "কালার", "schedule": "শিডিউল", "pizza": "পিৎজা",
    "hello": "হ্যালো", "genre": "জঁরা", "debris": "ডেব্রি", "biscuit": "বিস্কিট",
    "lieutenant": "লেফটেন্যান্ট", "television": "টেলিভিশন",
    "environment": "এনভায়রনমেন্ট", "environmental": "এনভায়রনমেন্টাল",
    "government": "গভর্নমেন্ট", "governments": "গভর্নমেন্টস", "career": "ক্যারিয়ার",
    "whereas": "হোয়্যারঅ্যাজ", "america": "আমেরিকা", "either": "আইদার", "neither": "নাইদার", "women": "উইমেন", "woman": "উওম্যান",
    # well-known acronyms read as words or with a fixed form
    "ielts": "আইইএলটিএস", "toefl": "টোফেল", "gre": "জিআরই", "gmat": "জিম্যাট",
    "unesco": "ইউনেস্কো", "unicef": "ইউনিসেফ", "nato": "ন্যাটো", "nasa": "নাসা",
    "covid": "কোভিড",
    # Bangladeshi proper nouns (silent letters / missing or wrong CMU entries)
    "bangladesh": "বাংলাদেশ", "dhaka": "ঢাকা", "sylhet": "সিলেট", "ayesha": "আয়েশা",
    "chittagong": "চিটাগং", "rajshahi": "রাজশাহী", "khulna": "খুলনা", "barisal": "বরিশাল",
    "cox's": "কক্সেস", "padma": "পদ্মা", "jamuna": "যমুনা", "bangla": "বাংলা",
    "bengali": "বেঙ্গলি", "taka": "টাকা", "rahman": "রহমান", "hasina": "হাসিনা",
}

OVERRIDES: dict[str, str] = dict(_BUILTIN_OVERRIDES)
_LOCK = threading.Lock()


def load_overrides(src: str | Path | dict, *, replace: bool = False) -> int:
    """Add curated spellings from a dict or a UTF-8 JSON file {"word": "বাংলা"}.
    `replace=True` drops previously loaded entries (built-ins are kept)."""
    if isinstance(src, dict):
        data = src
    else:
        with open(src, encoding="utf-8") as f:
            data = json.load(f)
    clean = {str(k).strip().lower(): str(v).strip() for k, v in data.items()
             if str(k).strip() and not str(k).startswith("_")}       # "_comment" keys skipped
    with _LOCK:
        if replace:
            OVERRIDES.clear()
            OVERRIDES.update(_BUILTIN_OVERRIDES)
        OVERRIDES.update(clean)
        pronounce.cache_clear()
    return len(clean)


# ───────────────────────────── dictionary access ─────────────────────────────
_EXCLUDE: set[str] = set()       # test hook: pretend these words are out of dictionary


def _cmu(word: str) -> list[str]:
    if word in _EXCLUDE:
        return []
    out = []
    for pr in pronouncing.phones_for_word(word):
        pr = pr.split("#", 1)[0].strip()             # some entries carry '# abbrev'
        if pr and pr not in out:
            out.append(pr)
    return out


def _vowels_of(pron: str) -> list[str]:
    return [p for p, _ in _parse(pron) if p in VOWELS]


def _vowels_ah(pron: str) -> list[str]:
    """Vowel phones for alignment; AH keeps its stress digit (AH0 may be epenthetic)."""
    return [p + s if p == "AH" else p for p, s in _parse(pron) if p in VOWELS]


def _best_variant(spelling: str, prons: list[str]) -> str:
    best = min(prons, key=lambda pr: _align(spelling, _vowels_ah(pr))[0]
               - (0.45 if pr == prons[0] else 0.0))
    # same vowels, but a variant with /j/ exists → prefer it (news → নিউজ)
    siblings = [pr for pr in prons if _vowels_of(pr) == _vowels_of(best) and " Y " in f" {pr} "]
    return siblings[0] if siblings else best


# British → American spelling, tried only when the British form is missing from CMU
_BRITISH_RULES = [
    (re.compile(r"isation"), "ization"), (re.compile(r"is(e|es|ed|er|ers|ing)$"), r"iz\1"),
    (re.compile(r"ys(e|es|ed|ing)$"), r"yz\1"), (re.compile(r"(?<=[^aeiou])our"), "or"),
    (re.compile(r"tre(s|d)?$"), r"ter\1"), (re.compile(r"bre(s)?$"), r"ber\1"),
    (re.compile(r"(?<=[aeiou])ll(ed|ing|er|ers)$"), r"l\1"), (re.compile(r"ence$"), "ense"),
    (re.compile(r"ogue(s?)$"), r"og\1"), (re.compile(r"amme(s?)$"), r"am\1"),
    (re.compile(r"ae"), "e"), (re.compile(r"oe(?=[a-z])"), "e"),
]


def _american(word: str) -> str:
    out = word
    for rx, rep in _BRITISH_RULES:
        out = rx.sub(rep, out)
    return out


def _british_variants(word: str) -> list[str]:
    seen, out = {word}, []
    for rx, rep in _BRITISH_RULES:
        v = rx.sub(rep, word)
        if v not in seen:
            seen.add(v)
            out.append(v)
    full = _american(word)
    if full not in seen:
        out.append(full)
    return out


def _known(word: str) -> tuple[str, str] | None:
    """CMU or British-variant hit → (best pron, source)."""
    prons = _cmu(word)
    if prons:
        return _best_variant(word, prons), "cmudict"
    for v in _british_variants(word):
        prons = _cmu(v)
        if prons:
            return _best_variant(word, prons), "british"
    return None


# ───────────────────────────── morphology ─────────────────────────────
_PLURAL, _PAST = "<PL>", "<PAST>"
_SUFFIXES = sorted([
    ("ization", "AY0 Z EY1 SH AH0 N"), ("izations", "AY0 Z EY1 SH AH0 N Z"),
    ("isation", "AY0 Z EY1 SH AH0 N"), ("isations", "AY0 Z EY1 SH AH0 N Z"),
    ("fulness", "F AH0 L N AH0 S"), ("lessness", "L AH0 S N AH0 S"),
    ("ments", "M AH0 N T S"), ("ment", "M AH0 N T"), ("ness", "N AH0 S"),
    ("lessly", "L AH0 S L IY0"), ("less", "L AH0 S"), ("fully", "F AH0 L IY0"),
    ("ful", "F AH0 L"), ("ably", "AH0 B L IY0"), ("able", "AH0 B AH0 L"),
    ("izing", "AY2 Z IH0 NG"), ("ized", "AY2 Z D"), ("izes", "AY2 Z IH0 Z"), ("ize", "AY2 Z"),
    ("ising", "AY2 Z IH0 NG"), ("ised", "AY2 Z D"), ("ises", "AY2 Z IH0 Z"), ("ise", "AY2 Z"),
    ("isms", "IH2 Z AH0 M Z"), ("ism", "IH2 Z AH0 M"), ("ists", "IH0 S T S"), ("ist", "IH0 S T"),
    ("ships", "SH IH2 P S"), ("ship", "SH IH2 P"), ("hoods", "HH UH2 D Z"), ("hood", "HH UH2 D"),
    ("wise", "W AY2 Z"), ("wards", "W ER0 D Z"), ("ward", "W ER0 D"), ("like", "L AY2 K"),
    ("proof", "P R UW2 F"), ("ingly", "IH0 NG L IY0"), ("ings", "IH0 NG Z"), ("ing", "IH0 NG"),
    ("ers", "ER0 Z"), ("er", "ER0"), ("est", "AH0 S T"), ("ly", "L IY0"),
    ("ed", _PAST), ("'s", _PLURAL), ("es", _PLURAL), ("s", _PLURAL),
], key=lambda t: -len(t[0]))

_PREFIXES = sorted([
    ("counter", "K AW2 N T ER0"), ("inter", "IH2 N T ER0"), ("under", "AH2 N D ER0"),
    ("over", "OW2 V ER0"), ("super", "S UW2 P ER0"), ("hyper", "HH AY2 P ER0"),
    ("cyber", "S AY2 B ER0"), ("multi", "M AH2 L T IY0"), ("micro", "M AY2 K R OW0"),
    ("macro", "M AE2 K R OW0"), ("trans", "T R AE2 N S"), ("socio", "S OW2 S IY0 OW0"),
    ("eco", "IY2 K OW0"), ("bio", "B AY2 OW0"), ("geo", "JH IY2 OW0"), ("auto", "AO2 T OW0"),
    ("tele", "T EH2 L IH0"), ("anti", "AE2 N T IY0"), ("semi", "S EH2 M IY0"),
    ("mega", "M EH2 G AH0"), ("mini", "M IH2 N IY0"), ("post", "P OW2 S T"),
    ("non", "N AA2 N"), ("pre", "P R IY0"), ("mis", "M IH0 S"), ("dis", "D IH0 S"),
    ("out", "AW2 T"), ("up", "AH2 P"), ("sub", "S AH2 B"), ("un", "AH0 N"), ("re", "R IY0"), ("de", "D IY0"),
    ("co", "K OW0"), ("im", "IH0 M"), ("in", "IH0 N"), ("ir", "IH0"), ("il", "IH0"),
], key=lambda t: -len(t[0]))

_SIBILANT = {"S", "Z", "SH", "ZH", "CH", "JH"}
_VOICELESS = {"P", "T", "K", "F", "TH", "S", "SH", "CH"}


def _suffix_phones(kind: str, stem_pron: str) -> str:
    last = re.sub(r"\d", "", stem_pron.split()[-1])
    if kind == _PLURAL:
        return "IH0 Z" if last in _SIBILANT else ("S" if last in _VOICELESS else "Z")
    if kind == _PAST:
        return "IH0 D" if last in ("T", "D") else ("T" if last in _VOICELESS else "D")
    return kind


def _stem_candidates(base: str) -> list[str]:
    c = [base]
    if base and base[-1] not in "aeiouy":
        c.append(base + "e")                                  # making → make
    if len(base) > 2 and base[-1] == base[-2] and base[-1] not in "aeiouls":
        c.append(base[:-1])                                   # running → run
    if base.endswith("i"):
        c.append(base[:-1] + "y")                             # happiness → happy
    return c


def _plain(pron: str) -> list[str]:
    return [re.sub(r"\d", "", p) for p in pron.split() if p not in ("|", "+")]


# stem-changing suffixes: (suffix, stem ending, stem tail phones, new tail phones)
_STEM_CHANGE = [
    ("ability", "able", "AH B AH L", "AH0 B IH1 L AH0 T IY0"),
    ("ibility", "ible", "AH B AH L", "AH0 B IH1 L AH0 T IY0"),
    ("ically", "ic", "", "L IY0"),
    ("ation", "ate", "EY T", "EY1 SH AH0 N"),
    ("ations", "ate", "EY T", "EY1 SH AH0 N Z"),
]
_STEM_CHANGE_LOOSE = [
    ("ation", "", "", "EY1 SH AH0 N"),                        # transform-ation
    ("ation", "e", "", "EY1 SH AH0 N"),                       # explore-ation
    ("ity", "", "", "AH0 T IY0"),                             # neutral-ity
]


def _stem_pron(stem: str, depth: int) -> str | None:
    hit = _known(stem)
    return hit[0] if hit else _morph(stem, depth + 1)


def _morph(word: str, depth: int = 0) -> str | None:
    """Prefix/suffix decomposition onto a known stem. Returns a phone string with
    boundary markers: '|' after a prefix, '+' before a consonant-initial suffix."""
    if depth > 2 or len(word) < 5:
        return None
    hit = _stem_change(word, depth, _STEM_CHANGE)
    if hit:
        return hit
    for suf, kind in _SUFFIXES:
        if word.endswith(suf) and len(word) - len(suf) >= 3:
            for stem in _stem_candidates(word[: -len(suf)]):
                pron = _stem_pron(stem, depth)
                if pron:
                    add = _suffix_phones(kind, pron)
                    joint = "+" if add.split()[0] not in VOWELS_STRESSED else ""
                    return f"{pron} {joint} {add}".replace("  ", " ")
    for pre, ph in _PREFIXES:
        rest = word[len(pre):]
        if word.startswith(pre) and len(rest) >= (5 if len(pre) <= 2 else 4):
            pron = _stem_pron(rest, depth)
            if pron:
                return f"{ph} | {pron}"
    return _stem_change(word, depth, _STEM_CHANGE_LOOSE)


def _stem_change(word: str, depth: int, table) -> str | None:
    for suf, stem_end, tail, new_tail in table:
        if word.endswith(suf) and len(word) - len(suf) >= 3:
            pron = _stem_pron(word[: -len(suf)] + stem_end, depth)
            if not pron:
                continue
            ph, t = pron.split(), tail.split()
            if t:
                if _plain(" ".join(ph[-len(t):])) != t:
                    continue
                ph = ph[: -len(t)]
            return " ".join(ph + new_tail.split())
    return None


VOWELS_STRESSED = {v + d for v in VOWELS for d in "012"}


def _compound(word: str) -> str | None:
    """Split into two dictionary words. Both halves ≥ 4 letters and the right half must
    start with a consonant — CMU lists junk like 'ing', 'mer', 'ter', and hold-out testing
    showed loose splitting is right only ~35% of the time (strict, in-pipeline: ~70%)."""
    best, best_score = None, -1
    for i in range(4, len(word) - 3):
        left, right = word[:i], word[i:]
        if right[0] in "aeiouy":
            continue
        lh = _known(left)
        if not lh:
            continue
        rh = _known(right)
        rp = rh[0] if rh else _morph(right, 2)
        if rp:
            score = len(left) ** 2 + len(right) ** 2 + (5 if rh else 0)
            if score > best_score:
                best, best_score = f"{lh[0]} | {rp}", score
    return best


def _skel(pron_or_list) -> list[str]:
    ph = _plain(pron_or_list) if isinstance(pron_or_list, str) else pron_or_list
    return ["V" if p in VOWELS else p for p in ph]


def _detect_marks(word: str, pron: str) -> str:
    """For dictionary words, find prefix / compound / suffix boundaries whose phones match
    exactly (ignoring stress), so understand → আন্ডারস্ট্যান্ড, international →
    ইন্টারন্যাশনাল, books → বুকস. Conservative: no exact phone match, no mark."""
    ph = _plain(pron)
    raw = pron.split()
    cut_left = None
    for pre, pp in _PREFIXES:
        rest = word[len(pre):]
        if word.startswith(pre) and len(rest) >= 4:
            k = len(pp.split())
            if _skel(ph[:k]) == _skel(pp) and any(_skel(r) == _skel(ph[k:]) for r in _cmu(rest)):
                cut_left = k
                break
    if cut_left is None:      # both halves ≥ 4 letters: CMU lists junk like 'mer', 'ing'
        for i in range(4, len(word) - 3):
            if word[i] in "aeiouy":
                continue
            L, R = _cmu(word[:i]), _cmu(word[i:])
            if not (L and R):
                continue
            for lp in L:
                k = len(lp.split())
                if _skel(ph[:k]) == _skel(lp) and any(_skel(r) == _skel(ph[k:]) for r in R):
                    cut_left = k
                    break
            if cut_left is not None:
                break
    cut_right = None
    for suf, kind in _SUFFIXES:
        if word.endswith(suf) and len(word) - len(suf) >= 3:
            for stem in _stem_candidates(word[: -len(suf)]):
                for sp in _cmu(stem):
                    add = _suffix_phones(kind, sp).split()
                    if add[0] in VOWELS_STRESSED:
                        continue
                    if ph == _plain(sp) + _plain(" ".join(add)):
                        cut_right = len(ph) - len(add)
                        break
                if cut_right is not None:
                    break
            if cut_right is not None:
                break
    out = []
    for k, p in enumerate(raw):
        if k == cut_left and k > 0:
            out.append("|")
        elif k == cut_right and k > 0:
            out.append("+")
        out.append(p)
    return " ".join(out)


def _split_marks(pron: str) -> tuple[str, dict[int, str]]:
    clean, marks = [], {}
    for p in pron.split():
        if p in ("|", "+"):
            if clean:
                marks[len(clean)] = p
        else:
            clean.append(p)
    return " ".join(clean), marks


# ───────────────────────────── neural G2P (numpy port of g2p_en) ─────────────────────────────
class _NeuralG2P:
    GRAPHEMES = ["<pad>", "<unk>", "</s>"] + list("abcdefghijklmnopqrstuvwxyz")
    PHONEMES = ["<pad>", "<unk>", "<s>", "</s>"] + [
        "AA0", "AA1", "AA2", "AE0", "AE1", "AE2", "AH0", "AH1", "AH2", "AO0", "AO1", "AO2",
        "AW0", "AW1", "AW2", "AY0", "AY1", "AY2", "B", "CH", "D", "DH", "EH0", "EH1", "EH2",
        "ER0", "ER1", "ER2", "EY0", "EY1", "EY2", "F", "G", "HH", "IH0", "IH1", "IH2", "IY0",
        "IY1", "IY2", "JH", "K", "L", "M", "N", "NG", "OW0", "OW1", "OW2", "OY0", "OY1", "OY2",
        "P", "R", "S", "SH", "T", "TH", "UH0", "UH1", "UH2", "UW", "UW0", "UW1", "UW2", "V",
        "W", "Y", "Z", "ZH"]

    def __init__(self, path: str):
        import numpy as np
        self.np = np
        with np.load(path) as z:
            self.v = {k: z[k].astype(np.float32) for k in z.files}
        self.g2i = {g: i for i, g in enumerate(self.GRAPHEMES)}

    def _cell(self, x, h, pre):
        np, v = self.np, self.v
        gi = x @ v[pre + "w_ih"].T + v[pre + "b_ih"]
        gh = h @ v[pre + "w_hh"].T + v[pre + "b_hh"]
        k = gi.shape[-1] // 3
        r = 1 / (1 + np.exp(-(gi[:, :k] + gh[:, :k])))
        z = 1 / (1 + np.exp(-(gi[:, k:2 * k] + gh[:, k:2 * k])))
        n = np.tanh(gi[:, 2 * k:] + r * gh[:, 2 * k:])
        return (1 - z) * n + z * h

    def predict(self, word: str) -> str | None:
        np, v = self.np, self.v
        ids = [self.g2i.get(c, 1) for c in word] + [2]
        h = np.zeros((1, v["enc_w_hh"].shape[1]), np.float32)
        for i in ids:
            h = self._cell(v["enc_emb"][[i]], h, "enc_")
        out, prev = [], 2                                  # <s>
        for _ in range(len(word) + 8):
            h = self._cell(v["dec_emb"][[prev]], h, "dec_")
            prev = int((h @ v["fc_w"].T + v["fc_b"]).argmax())
            if prev == 3:                                  # </s>
                break
            out.append(self.PHONEMES[prev])
        out = [p for p in out if not p.startswith("<")]
        return " ".join(out) if any(p[-1].isdigit() for p in out) else None


_NEURAL: _NeuralG2P | None = None
_NEURAL_TRIED = False


def _checkpoint_path() -> str | None:
    env = os.environ.get("BN_G2P_CHECKPOINT")
    if env and os.path.exists(env):
        return env
    local = Path(__file__).with_name("g2p_checkpoint.npz")
    if local.exists():
        return str(local)
    import importlib.util                       # find g2p_en WITHOUT importing it (no NLTK)
    spec = importlib.util.find_spec("g2p_en")
    if spec and spec.submodule_search_locations:
        p = Path(list(spec.submodule_search_locations)[0]) / "checkpoint20.npz"
        if p.exists():
            return str(p)
    return None


def _neural() -> _NeuralG2P | None:
    global _NEURAL, _NEURAL_TRIED
    if not _NEURAL_TRIED:
        with _LOCK:
            if not _NEURAL_TRIED:
                path = _checkpoint_path()
                try:
                    _NEURAL = _NeuralG2P(path) if path else None
                except Exception:                  # bad file / numpy missing → skip step
                    _NEURAL = None
                _NEURAL_TRIED = True
    return _NEURAL


# ───────────────────────────── British phone fixes ─────────────────────────────
def _britishize(word: str, pron: str) -> str:
    """Nudge US-only CMU vowels toward the British forms Bangladeshi learners use.
    Works on a marked phone string ('|'/'+' boundaries are preserved)."""
    toks = pron.split()
    pos = [k for k, t in enumerate(toks) if t not in ("|", "+")]
    ph = [toks[k] for k in pos]
    base = [re.sub(r"\d", "", p) for p in ph]

    def setp(j, val):
        toks[pos[j]] = val

    # mobile, fragile, missile: -ile → আইল
    if word.endswith(("ile", "iles")) and len(word) > 5 and len(base) >= 2:
        k = len(base) - (2 if word.endswith("ile") else 3)
        if 0 <= k and base[k] in ("AH", "IH") and ph[k].endswith("0") and base[k + 1] == "L":
            setp(k, "AY2")
    # dictionary, necessary: -ary EH R IY → ারি ; category, territory: -ory AO R IY → রি
    if len(base) >= 3 and base[-2:] == ["R", "IY"] and not word.endswith("rary"):
        if word.endswith("ary") and base[-3] == "EH":
            setp(len(base) - 3, "AH0")
        elif word.endswith("ory") and base[-3] == "AO" and not ph[-3].endswith("1"):
            setp(len(base) - 3, "AH0")
    # organisation / globalization: -iz- before -ation → আইজেশন
    if re.search(r"i[sz]ation", word):
        for k in range(len(base) - 3):
            if base[k] in ("AH", "IH") and base[k + 1:k + 4] == ["Z", "EY", "SH"]:
                setp(k, "AY0")
    # British /j/ after T D N: duty ডিউটি, produce প্রোডিউস, nuclear নিউক্লিয়ার
    vowel_idx = [k for k, b in enumerate(base) if b in VOWELS]
    _, groups = _align(word, [ph[k] if base[k] == "AH" else base[k] for k in vowel_idx])
    grp = dict(zip(vowel_idx, groups))
    inserts = []
    for k, b in enumerate(base):
        if b == "UW" and k > 0 and base[k - 1] in ("T", "D", "N") \
                and not (k > 1 and base[k - 2] == "S") and (k + 1 == len(base) or base[k + 1] != "W"):
            g = (grp.get(k) or ("",))[0]
            if ("u" in g or g in ("ew", "eu")) and "oo" not in g and "ou" not in g:
                inserts.append(pos[k])
    for at in reversed(inserts):
        toks.insert(at, "Y")
    return " ".join(toks)


# ───────────────────────────── acronyms ─────────────────────────────
_LETTER_NAMES = {
    "a": "এ", "b": "বি", "c": "সি", "d": "ডি", "e": "ই", "f": "এফ", "g": "জি",
    "h": "এইচ", "i": "আই", "j": "জে", "k": "কে", "l": "এল", "m": "এম", "n": "এন",
    "o": "ও", "p": "পি", "q": "কিউ", "r": "আর", "s": "এস", "t": "টি", "u": "ইউ",
    "v": "ভি", "w": "ডাবলিউ", "x": "এক্স", "y": "ওয়াই", "z": "জেড",
}


def spell_letters(word: str) -> str:
    return "".join(_LETTER_NAMES.get(c, c) for c in word.lower())


# ───────────────────────────── public API ─────────────────────────────
@dataclass(frozen=True)
class Pronunciation:
    word: str
    bangla: str
    arpabet: str | None   # phones used (None for override / acronym / rules)
    source: str           # override | cmudict | british | morphology | compound |
                          # neural | acronym | rules | passthrough

    @property
    def reliable(self) -> bool:
        """False for model guesses — a UI can mark these or log them for review."""
        return self.source not in ("neural", "rules", "passthrough")


_ALPHA = re.compile(r"^[a-z]+(?:'[a-z]+)?$")
_CAMEL = re.compile(r"[A-Z]?[a-z]+|[A-Z]+(?![a-z])")


def _possessive(bangla: str) -> str:
    last = bangla[-1:]
    if last in "সশজচ":
        return bangla + "েজ"                        # Bangladesh's → বাংলাদেশেজ
    return bangla + ("স" if last in "টপকফথ" else "জ")


def _letter_spelled(raw: str, prons: list[str]) -> bool:
    """CMU stores many acronyms letter by letter (USA, CEO): one vowel per letter."""
    if not prons or len(raw) > 6:
        return False
    need = len(raw) + 2 * raw.upper().count("W")
    return len(_vowels_of(prons[0])) == need


def _acronym(raw: str, w: str, acronyms_mode: bool = True) -> Pronunciation | None:
    """ALL-CAPS token: ≤3 letters are spelled (UN, AI, GDP, CEO); longer ones are read
    as a word only if the dictionary has a word reading (NASA, NATO), else spelled."""
    if not (raw.isupper() and len(raw) > 1 and raw.isalpha()):
        return None
    prons = _cmu(w)
    if _letter_spelled(raw, prons):
        return Pronunciation(raw, spell_letters(w), None, "acronym")
    if not acronyms_mode:
        return None
    if len(raw) >= 4 and prons:
        vowels = len(_vowels_of(prons[0]))
        if vowels < len(raw) - raw.upper().count("W") * 2:
            return None                              # read as a word
    return Pronunciation(raw, spell_letters(w), None, "acronym")


@lru_cache(maxsize=100_000)
def pronounce(word: str, acronyms: bool = True) -> Pronunciation:
    """English word → Pronunciation. With acronyms=True (default) ALL-CAPS tokens are
    treated as acronyms (GDP → জিডিপি); transliterate_text turns this off for text
    written entirely in capitals."""
    return _pronounce(word, acronyms)


def _pronounce(word: str, acronyms: bool = True, order=("morphology", "compound", "neural")) -> Pronunciation:
    raw = word.strip().replace("’", "'")
    w = raw.lower()
    if not w:
        return Pronunciation(word, "", None, "passthrough")
    if w in OVERRIDES:
        return Pronunciation(word, OVERRIDES[w], None, "override")
    if w.endswith("'s") and w[:-2] in OVERRIDES:
        return Pronunciation(word, _possessive(OVERRIDES[w[:-2]]), None, "override")
    if not _ALPHA.match(w):
        return Pronunciation(word, raw, None, "passthrough")
    if acr := _acronym(raw, w, acronyms):
        return Pronunciation(word, acr.bangla, None, "acronym")

    hit = _known(w)
    parts = _CAMEL.findall(raw)
    if not hit and len(parts) > 1 and "".join(parts) == raw.replace("'", ""):
        subs = [pronounce(p, acronyms) for p in parts]
        src = "compound" if all(x.reliable for x in subs) else "neural"
        return Pronunciation(word, "".join(x.bangla for x in subs), None, src)
    if hit:
        pron, src = hit
    else:
        pron, src = None, None
        bare = w.replace("'", "")
        for name in order:
            if name == "morphology":
                pron = _morph(bare)
            elif name == "compound":
                pron = _compound(bare)
            elif name == "neural" and (model := _neural()):
                pron = model.predict(_american(bare))
            if pron:
                src = name
                break
        if not pron:
            return Pronunciation(word, _grapheme_fallback(bare), None, "rules")

    if src in ("cmudict", "british"):
        pron = _detect_marks(w.replace("'", ""), pron)
    clean, marks = _split_marks(_britishize(w.replace("'", ""), pron))
    bangla = _render(_phones_to_tokens(w.replace("'", ""), _parse(clean), marks))
    return Pronunciation(word, bangla, clean, src)


def transliterate(word: str) -> str:
    """English word → Bangla script pronunciation."""
    return pronounce(word).bangla


def source(word: str) -> str:
    return pronounce(word).source


_WORD_RE = re.compile(r"[A-Za-z]+(?:['’][A-Za-z]+)*")


def _shouting(text: str) -> bool:
    words = [w for w in _WORD_RE.findall(text) if len(w) > 1]
    return len(words) >= 3 and sum(w.isupper() for w in words) / len(words) > 0.6


def analyze_text(text: str) -> list[Pronunciation]:
    """Every English word in `text`, in order — handy for per-word tooltips in a UI."""
    acr = not _shouting(text)
    return [pronounce(m.group(0), acr) for m in _WORD_RE.finditer(text)]


def transliterate_text(text: str) -> str:
    """Replace every English word with its Bangla pronunciation; punctuation, digits,
    hyphens and spacing are kept (well-being → ওয়েল-বিয়িং)."""
    acr = not _shouting(text)
    return _WORD_RE.sub(lambda m: pronounce(m.group(0), acr).bangla, text)


def warmup() -> None:
    """Load CMUdict and the neural model up front (call at app startup)."""
    pronouncing.phones_for_word("warmup")
    _neural()
    pronounce("warmup")


if os.environ.get("BN_OVERRIDES_PATH"):
    load_overrides(os.environ["BN_OVERRIDES_PATH"])


if __name__ == "__main__":
    import sys
    for w in sys.argv[1:] or ["computer", "doctor", "chair", "decarbonisation", "IELTS"]:
        p = pronounce(w)
        print(f"{w:20} {p.bangla:22} {p.source:11} {p.arpabet or ''}")
