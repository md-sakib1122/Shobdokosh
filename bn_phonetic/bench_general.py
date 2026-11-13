"""Benchmark bn_phonetic on 200 everyday English words vs. common Bangladeshi spellings.
Overrides are DISABLED during the benchmark so the score reflects the rule engine only."""
import csv
import difflib
from collections import Counter

import bn_phonetic as bn
from bn_phonetic import transliterate, source

bn.OVERRIDES.clear()          # benchmark the rule engine only
bn.pronounce.cache_clear()

# word: accepted Bangla spellings ("|" separated)
REF = """
computer:কম্পিউটার laptop:ল্যাপটপ mobile:মোবাইল phone:ফোন internet:ইন্টারনেট
email:ইমেইল|ইমেল keyboard:কিবোর্ড mouse:মাউস printer:প্রিন্টার screen:স্ক্রিন
camera:ক্যামেরা video:ভিডিও radio:রেডিও television:টেলিভিশন software:সফটওয়্যার
website:ওয়েবসাইট password:পাসওয়ার্ড online:অনলাইন office:অফিস manager:ম্যানেজার
meeting:মিটিং project:প্রজেক্ট|প্রোজেক্ট file:ফাইল data:ডাটা|ডেটা program:প্রোগ্রাম
battery:ব্যাটারি charger:চার্জার cable:ক্যাবল|কেবল button:বাটন message:মেসেজ
doctor:ডক্টর teacher:টিচার engineer:ইঞ্জিনিয়ার driver:ড্রাইভার nurse:নার্স
police:পুলিশ lawyer:লয়ার pilot:পাইলট farmer:ফার্মার officer:অফিসার
actor:অ্যাক্টর singer:সিঙ্গার|সিংগার player:প্লেয়ার student:স্টুডেন্ট captain:ক্যাপ্টেন
director:ডিরেক্টর minister:মিনিস্টার waiter:ওয়েটার tailor:টেইলর|টেইলার barber:বারবার
chair:চেয়ার table:টেবিল door:ডোর window:উইন্ডো bottle:বোতল|বটল
glass:গ্লাস plate:প্লেট spoon:স্পুন cup:কাপ fan:ফ্যান
light:লাইট bed:বেড pillow:পিলো sofa:সোফা mirror:মিরর
bucket:বাকেট box:বক্স bag:ব্যাগ key:কি lock:লক
clock:ক্লক watch:ওয়াচ pen:পেন pencil:পেন্সিল paper:পেপার
book:বুক card:কার্ড ticket:টিকেট|টিকিট brush:ব্রাশ soap:সোপ
towel:টাওয়েল shirt:শার্ট jacket:জ্যাকেট pocket:পকেট belt:বেল্ট
tea:টি coffee:কফি milk:মিল্ক water:ওয়াটার juice:জুস
cake:কেক bread:ব্রেড butter:বাটার cheese:চিজ egg:এগ
chicken:চিকেন burger:বার্গার pizza:পিজা|পিৎজা sandwich:স্যান্ডউইচ chocolate:চকলেট
sugar:সুগার salt:সল্ট rice:রাইস apple:অ্যাপল banana:ব্যানানা|বানানা
orange:অরেঞ্জ mango:ম্যাঙ্গো|ম্যাংগো lemon:লেমন tomato:টমেটো potato:পটেটো
onion:অনিয়ন noodles:নুডলস soup:স্যুপ|সুপ hospital:হসপিটাল school:স্কুল
college:কলেজ university:ইউনিভার্সিটি station:স্টেশন market:মার্কেট hotel:হোটেল
restaurant:রেস্টুরেন্ট|রেস্টুরেন্ট bank:ব্যাংক park:পার্ক road:রোড street:স্ট্রিট
airport:এয়ারপোর্ট bus:বাস car:কার train:ট্রেন truck:ট্রাক
taxi:ট্যাক্সি bicycle:বাইসাইকেল ship:শিপ city:সিটি village:ভিলেজ
garden:গার্ডেন house:হাউস room:রুম kitchen:কিচেন bathroom:বাথরুম
library:লাইব্রেরি museum:মিউজিয়াম cinema:সিনেমা club:ক্লাব gym:জিম
shop:শপ mall:মল bridge:ব্রিজ tower:টাওয়ার parking:পার্কিং
hello:হ্যালো sorry:সরি thanks:থ্যাংকস please:প্লিজ okay:ওকে
welcome:ওয়েলকাম good:গুড morning:মর্নিং night:নাইট happy:হ্যাপি
birthday:বার্থডে party:পার্টি friend:ফ্রেন্ড family:ফ্যামিলি mother:মাদার
father:ফাদার brother:ব্রাদার sister:সিস্টার baby:বেবি uncle:আঙ্কেল|আংকেল
money:মানি dollar:ডলার price:প্রাইস time:টাইম minute:মিনিট
hour:আওয়ার week:উইক month:মান্থ year:ইয়ার monday:মানডে|মনডে
sunday:সানডে friday:ফ্রাইডে january:জানুয়ারি april:এপ্রিল october:অক্টোবর
number:নাম্বার problem:প্রবলেম question:কোয়েশ্চন|কোশ্চেন answer:আনসার exam:এক্সাম|এগজাম
class:ক্লাস test:টেস্ট result:রেজাল্ট game:গেম football:ফুটবল
cricket:ক্রিকেট ball:বল team:টিম match:ম্যাচ goal:গোল
music:মিউজিক song:সং movie:মুভি picture:পিকচার photo:ফটো
color:কালার red:রেড green:গ্রিন blue:ব্লু black:ব্ল্যাক
white:হোয়াইট yellow:ইয়েলো power:পাওয়ার energy:এনার্জি fire:ফায়ার
smart:স্মার্ট quality:কোয়ালিটি service:সার্ভিস system:সিস্টেম free:ফ্রি
sale:সেল offer:অফার order:অর্ডার delivery:ডেলিভারি customer:কাস্টমার
company:কোম্পানি business:বিজনেস marketing:মার্কেটিং support:সাপোর্ট update:আপডেট
download:ডাউনলোড upload:আপলোড share:শেয়ার like:লাইক comment:কমেন্ট
news:নিউজ weather:ওয়েদার summer:সামার winter:উইন্টার rain:রেইন
cloud:ক্লাউড queen:কুইন king:কিং magic:ম্যাজিক science:সায়েন্স
history:হিস্ট্রি english:ইংলিশ medicine:মেডিসিন vitamin:ভিটামিন virus:ভাইরাস
"""

pairs = [tok.split(":") for tok in REF.split()]
print("words:", len(pairs))
assert len({w for w, _ in pairs}) == len(pairs)

NORM = str.maketrans({"ী": "ি", "ূ": "ু", "ঙ": "ং", "্": None, "‍": None})


def norm(s):
    return s.translate(NORM).replace("ংগ", "ং")


rows, cnt = [], Counter()
for word, refs in pairs:
    variants = refs.split("|")
    out = transliterate(word)
    sim = max(difflib.SequenceMatcher(None, out, v).ratio() for v in variants)
    if out in variants:
        verdict = "exact"
    elif norm(out) in {norm(v) for v in variants}:
        verdict = "spelling-variant"      # differs only in ্ / ী-ি / ঙ-ং
    elif sim >= 0.8:
        verdict = "close"
    else:
        verdict = "off"
    cnt[verdict] += 1
    rows.append((word, variants[0], out, f"{sim:.2f}", verdict, source(word)))

with open("results_general.csv", "w", newline="", encoding="utf-8-sig") as f:
    w = csv.writer(f)
    w.writerow(["english", "expected", "engine_output", "similarity", "verdict", "source"])
    w.writerows(rows)

for r in rows:
    mark = {"exact": "✅", "spelling-variant": "🟢", "close": "🟡", "off": "❌"}[r[4]]
    print(f"{mark} {r[0]:12} {r[2]:18} (expected {r[1]})")
print()
total = len(rows)
for k in ("exact", "spelling-variant", "close", "off"):
    print(f"{k:17} {cnt[k]:4}  {cnt[k] / total:6.1%}")
print(f"{'acceptable':17} {cnt['exact'] + cnt['spelling-variant']:4}  "
      f"{(cnt['exact'] + cnt['spelling-variant']) / total:6.1%}")
print(f"mean similarity   {sum(float(r[3]) for r in rows) / total:.3f}")
print("OOV (fallback):", [r[0] for r in rows if r[5] == "fallback"])
