"""IELTS academic vocabulary benchmark (Writing Task 1/2 topics).
References are pronunciation-faithful Bangla script (British-leaning, Bangladeshi
conventions); "|" separates accepted variants. Overrides are disabled so the score
reflects the engine, not the curated list."""
import csv
import difflib
import sys
from collections import Counter

import bn_phonetic as bn

REF = """
environment:এনভায়রনমেন্ট pollution:পলিউশন|পলুশন government:গভর্নমেন্ট|গভার্নমেন্ট
economy:ইকোনমি|ইকনমি economic:ইকোনমিক|ইকনমিক society:সোসাইটি technology:টেকনোলজি|টেকনলজি
education:এডুকেশন|এজুকেশন university:ইউনিভার্সিটি significant:সিগনিফিকেন্ট|সিগনিফিক্যান্ট
consequence:কনসিকোয়েন্স advantage:অ্যাডভান্টেজ|অ্যাডভানটেজ
disadvantage:ডিসঅ্যাডভান্টেজ|ডিসঅ্যাডভানটেজ opportunity:অপরচুনিটি|অপারচুনিটি|অপারটিউনিটি|অপরটিউনিটি
responsibility:রেসপনসিবিলিটি|রিসপনসিবিলিটি individual:ইন্ডিভিজুয়াল community:কমিউনিটি
population:পপুলেশন infrastructure:ইনফ্রাস্ট্রাকচার sustainable:সাসটেইনেবল|সাস্টেইনেবল|সাসটেনেবল
sustainability:সাসটেইনেবিলিটি|সাস্টেইনাবিলিটি|সাসটেনাবিলিটি renewable:রিনিউয়েবল|রিনিউএবল|রিনিউয়াবল
energy:এনার্জি climate:ক্লাইমেট temperature:টেম্পারেচার global:গ্লোবাল
globalization:গ্লোবালাইজেশন urbanization:আরবানাইজেশন industrial:ইন্ডাস্ট্রিয়াল
development:ডেভেলপমেন্ট developing:ডেভেলপিং developed:ডেভেলপড country:কান্ট্রি
countries:কান্ট্রিজ unemployment:আনএমপ্লয়মেন্ট employment:এমপ্লয়মেন্ট crime:ক্রাইম
criminal:ক্রিমিনাল punishment:পানিশমেন্ট prison:প্রিজন police:পুলিস|পলিস health:হেলথ
healthcare:হেলথকেয়ার obesity:ওবিসিটি|ওবেসিটি disease:ডিজিজ medicine:মেডিসিন
hospital:হসপিটাল exercise:এক্সারসাইজ lifestyle:লাইফস্টাইল
traditional:ট্র্যাডিশনাল|ট্রাডিশনাল culture:কালচার cultural:কালচারাল tourism:টুরিজম
tourist:টুরিস্ট international:ইন্টারন্যাশনাল language:ল্যাঙ্গুয়েজ|ল্যাংগুয়েজ
communication:কমিউনিকেশন information:ইনফরমেশন|ইনফর্মেশন internet:ইন্টারনেট
social:সোশ্যাল|সোশাল media:মিডিয়া advertisement:অ্যাডভার্টাইজমেন্ট|অ্যাডভার্টিসমেন্ট
advertising:অ্যাডভার্টাইজিং consumer:কনজিউমার|কনসিউমার product:প্রোডাক্ট|প্রডাক্ট
quality:কোয়ালিটি public:পাবলিক private:প্রাইভেট transport:ট্রান্সপোর্ট
traffic:ট্রাফিক|ট্র্যাফিক vehicle:ভেহিকেল|ভিহিকেল|ভিইকল|ভিয়িকল congestion:কনজেশন|কনজেসচন
city:সিটি rural:রুরাল urban:আরবান housing:হাউজিং accommodation:অ্যাকোমোডেশন|অ্যাকমোডেশন
family:ফ্যামিলি children:চিলড্রেন parents:প্যারেন্টস generation:জেনারেশন
elderly:এল্ডারলি|এলডারলি youth:ইউথ teenager:টিনেজার|টিনএজার adult:অ্যাডাল্ট
gender:জেন্ডার equality:ইকুয়ালিটি|ইকোয়ালিটি inequality:ইনইকুয়ালিটি|ইনইকোয়ালিটি
poverty:পভার্টি|পোভার্টি wealth:ওয়েলথ income:ইনকাম salary:স্যালারি career:ক্যারিয়ার
qualification:কোয়ালিফিকেশন skill:স্কিল knowledge:নলেজ research:রিসার্চ science:সায়েন্স
scientist:সায়েন্টিস্ট experiment:এক্সপেরিমেন্ট evidence:এভিডেন্স
analysis:অ্যানালাইসিস|অ্যানালিসিস statistics:স্ট্যাটিস্টিক্স|স্ট্যাটিস্টিকস
percentage:পারসেন্টেজ|পার্সেন্টেজ proportion:প্রোপোর্শন|প্রপোর্শন majority:মেজরিটি|ম্যাজরিটি
minority:মাইনরিটি|মাইনোরিটি increase:ইনক্রিজ|ইনক্রিস decrease:ডিক্রিজ|ডিক্রিস
fluctuate:ফ্লাকচুয়েট significantly:সিগনিফিকেন্টলি|সিগনিফিক্যান্টলি
dramatically:ড্রামাটিক্যালি|ড্রামাটিকলি|ড্রাম্যাটিকলি gradually:গ্র্যাজুয়ালি|গ্রাজুয়ালি
approximately:অ্যাপ্রক্সিমেটলি|অ্যাপ্রোক্সিমেটলি however:হাওয়েভার|হাউএভার
therefore:দেয়ারফোর|দেয়ারফর moreover:মোরওভার|মোরোভার furthermore:ফার্দারমোর|ফারদারমোর
nevertheless:নেভারদালেস|নেভারদিলেস|নেভারদেলেস consequently:কনসিকোয়েন্টলি
although:অলদো|অলদোউ whereas:হোয়্যারঅ্যাজ|হোয়্যারঅ্যাস|ওয়্যারঅ্যাজ despite:ডিসপাইট|ডেসপাইট
perspective:পারস্পেক্টিভ|পার্সপেক্টিভ argument:আর্গুমেন্ট opinion:অপিনিয়ন|ওপিনিয়ন
controversial:কন্ট্রোভার্সিয়াল|কন্ট্রোভার্শাল issue:ইস্যু|ইশু problem:প্রবলেম
solution:সলিউশন|সলুশন measure:মেজার policy:পলিসি regulation:রেগুলেশন
legislation:লেজিসলেশন authority:অথরিটি democracy:ডেমোক্রেসি|ডেমক্রেসি freedom:ফ্রিডম
rights:রাইটস benefit:বেনিফিট impact:ইমপ্যাক্ট|ইম্প্যাক্ট effect:ইফেক্ট
affect:অ্যাফেক্ট|আফেক্ট influence:ইনফ্লুয়েন্স factor:ফ্যাক্টর cause:কজ reason:রিজন
achieve:অ্যাচিভ|আচিভ achievement:অ্যাচিভমেন্ট|আচিভমেন্ট challenge:চ্যালেঞ্জ
competition:কম্পিটিশন|কমপিটিশন competitive:কম্পিটিটিভ|কমপিটিটিভ
efficient:ইফিশিয়েন্ট|ইফিশেন্ট efficiency:ইফিশিয়েন্সি|ইফিশেন্সি
productive:প্রোডাক্টিভ|প্রডাক্টিভ creativity:ক্রিয়েটিভিটি innovation:ইনোভেশন|ইনভেশন
artificial:আর্টিফিশিয়াল|আর্টিফিশাল intelligence:ইন্টেলিজেন্স automation:অটোমেশন
digital:ডিজিটাল device:ডিভাইস smartphone:স্মার্টফোন computer:কম্পিউটার online:অনলাইন
virtual:ভার্চুয়াল deforestation:ডিফরেস্টেশন biodiversity:বায়োডাইভার্সিটি
species:স্পিসিজ|স্পিশিজ wildlife:ওয়াইল্ডলাইফ recycling:রিসাইক্লিং|রিসাইকলিং
waste:ওয়েস্ট plastic:প্লাস্টিক emission:ইমিশন carbon:কার্বন fossil:ফসিল
fuel:ফুয়েল|ফিউয়েল natural:ন্যাচারাল|ন্যাচরাল resource:রিসোর্স|রিসর্স
agriculture:অ্যাগ্রিকালচার|এগ্রিকালচার water:ওয়াটার shortage:শর্টেজ famine:ফ্যামিন
drought:ড্রাউট flood:ফ্লাড disaster:ডিজাস্টার|ডিজ্যাস্টার literacy:লিটারেসি
curriculum:কারিকুলাম discipline:ডিসিপ্লিন academic:অ্যাকাডেমিক|একাডেমিক
vocational:ভোকেশনাল graduate:গ্র্যাজুয়েট student:স্টুডেন্ট teacher:টিচার
classroom:ক্লাসরুম library:লাইব্রেরি|লাইব্রারি examination:ইগজামিনেশন|এক্সামিনেশন
assessment:অ্যাসেসমেন্ট|এসেসমেন্ট compulsory:কম্পালসরি|কমপালসরি abroad:অ্যাব্রড|অ্যাব্রোড
overseas:ওভারসিজ immigration:ইমিগ্রেশন migration:মাইগ্রেশন diversity:ডাইভার্সিটি|ডিভার্সিটি
tolerance:টলারেন্স prejudice:প্রেজুডিস discrimination:ডিসক্রিমিনেশন
volunteer:ভলান্টিয়ার|ভলেন্টিয়ার charity:চ্যারিটি donation:ডোনেশন welfare:ওয়েলফেয়ার
pension:পেনশন budget:বাজেট investment:ইনভেস্টমেন্ট finance:ফাইন্যান্স|ফিন্যান্স|ফাইনান্স
taxation:ট্যাক্সেশন entertainment:এন্টারটেইনমেন্ট|এন্টারটেনমেন্ট leisure:লেজার
celebrity:সেলিব্রিটি sport:স্পোর্ট athlete:অ্যাথলিট museum:মিউজিয়াম heritage:হেরিটেজ
architecture:আর্কিটেকচার essay:এসে paragraph:প্যারাগ্রাফ conclusion:কনক্লুশন
introduction:ইন্ট্রোডাকশন|ইন্ট্রডাকশন vocabulary:ভোকাবুলারি|ভকাবুলারি grammar:গ্রামার|গ্র্যামার
pronunciation:প্রোনানসিয়েশন|প্রনানসিয়েশন fluency:ফ্লুয়েন্সি coherence:কোহিয়ারেন্স
cohesion:কোহিশন|কোহেশন
"""

pairs = [tok.split(":") for tok in REF.split()]
assert len({w for w, _ in pairs}) == len(pairs), "duplicate word"

bn.OVERRIDES.clear()
bn.pronounce.cache_clear()

NORM = str.maketrans({"ী": "ি", "ূ": "ু", "ঙ": "ং", "্": None, "‍": None})


def norm(s):
    return s.translate(NORM).replace("ংগ", "ং")


rows, cnt = [], Counter()
for word, refs in pairs:
    variants = refs.split("|")
    p = bn.pronounce(word)
    out = p.bangla
    sim = max(difflib.SequenceMatcher(None, out, v).ratio() for v in variants)
    if out in variants:
        verdict = "exact"
    elif norm(out) in {norm(v) for v in variants}:
        verdict = "spelling-variant"
    elif sim >= 0.8:
        verdict = "close"
    else:
        verdict = "off"
    cnt[verdict] += 1
    rows.append((word, variants[0], out, f"{sim:.2f}", verdict, p.source))

with open("results_ielts.csv", "w", newline="", encoding="utf-8-sig") as f:
    w = csv.writer(f)
    w.writerow(["english", "expected", "engine_output", "similarity", "verdict", "source"])
    w.writerows(rows)

quiet = "-q" in sys.argv
for r in rows:
    if r[4] != "exact" and not quiet:
        mark = {"spelling-variant": "🟢", "close": "🟡", "off": "❌"}[r[4]]
        print(f"{mark} {r[0]:16} {r[2]:22} (expected {r[1]})")
total = len(rows)
print(f"\nIELTS words: {total}")
for k in ("exact", "spelling-variant", "close", "off"):
    print(f"{k:17} {cnt[k]:4}  {cnt[k] / total:6.1%}")
print(f"{'acceptable':17} {cnt['exact'] + cnt['spelling-variant']:4}  "
      f"{(cnt['exact'] + cnt['spelling-variant']) / total:6.1%}")
print(f"mean similarity   {sum(float(r[3]) for r in rows) / total:.3f}")
