#!/usr/bin/env python3
# -----------------------------------------------------------------------------
# A1_build_index.py
# -----------------------------------------------------------------------------
# GOALS
#   Build "The Pantheon Index": a cross-sport comparison of Sachin Tendulkar,
#   Lionel Messi and Roger Federer on two constructed, comparable axes.
#
#   Axis 1  Standardized Dominance  -> how many SDs above their own sport's
#           era-peer distribution each star sits (the Gould normalization).
#   Axis 2  Aesthetic Elegance      -> a commentary/press sentiment index built
#           from a curated aesthetic lexicon over a text corpus.
#
# AUTHOR : Piyush Zaware (with Claude Code)
# UPDATED: 2026-06-30
#
# INPUTS
#   ../data/players.csv            star + era peers, 5 dominance pillars each
#   ../data/commentary_corpus.csv  curated press/commentary text per star
#
# OUTPUT
#   ../dashboard/data/pantheon_data.js   window.PANTHEON_DATA payload
# -----------------------------------------------------------------------------

import csv
import json
import os
import re
import statistics as stats

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
OUT_DIR = os.path.join(HERE, "..", "dashboard", "data")
SITE_DIR = os.path.join(HERE, "..", "site", "data")

PLAYERS_CSV = os.path.join(DATA, "players.csv")
CORPUS_CSV = os.path.join(DATA, "commentary_corpus.csv")
OUT_JS = os.path.join(OUT_DIR, "pantheon_data.js")
OUT_JS_SITE = os.path.join(SITE_DIR, "pantheon_data.js")

# The five dominance pillars (all "higher is better").
PILLARS = ["peak", "longevity", "consistency", "bigstage", "volume"]
PILLAR_LABELS = {
    "peak": "Peak",
    "longevity": "Longevity",
    "consistency": "Consistency",
    "bigstage": "Big-Stage",
    "volume": "Volume",
}

# Aesthetic lexicon used to score "elegance" from text. Transparent by design:
# each hit is one occurrence of a grace/beauty/artistry token.
ELEGANCE_LEXICON = [
    "grace", "graceful", "elegant", "elegance", "effortless", "effortlessly",
    "sublime", "artistry", "artist", "art", "poetry", "poetic", "silk",
    "silken", "beauty", "beautiful", "aesthetic", "fluid", "balletic",
    "ballet", "magician", "magic", "magical", "genius", "delicate", "touch",
    "timing", "wristwork", "dance", "dancer", "feather", "serene", "majestic",
    "exquisite", "mesmerising", "mesmerizing", "poise", "flow", "flows",
    "glides", "glide", "unhurried", "classical", "maestro", "transcendent",
]

STARS = ["Sachin Tendulkar", "Lionel Messi", "Roger Federer"]
STAR_SPORT = {"Sachin Tendulkar": "cricket", "Lionel Messi": "football",
              "Roger Federer": "tennis"}
STAR_ICON = {"Sachin Tendulkar": "\U0001F3CF", "Lionel Messi": "⚽",
             "Roger Federer": "\U0001F3BE"}


def read_players():
    rows = []
    with open(PLAYERS_CSV, newline="") as f:
        for r in csv.DictReader(f):
            r["is_star"] = int(r["is_star"])
            for p in PILLARS:
                r[p] = float(r[p])
            rows.append(r)
    return rows


def zscores_by_sport(rows):
    """For each sport and pillar, compute population z-scores across peers."""
    sports = sorted({r["sport"] for r in rows})
    moments = {}  # (sport, pillar) -> (mean, pstdev)
    for sp in sports:
        vals = [r for r in rows if r["sport"] == sp]
        for p in PILLARS:
            xs = [r[p] for r in vals]
            mu = stats.mean(xs)
            sd = stats.pstdev(xs) or 1e-9
            moments[(sp, p)] = (mu, sd)
    for r in rows:
        r["z"] = {}
        for p in PILLARS:
            mu, sd = moments[(r["sport"], p)]
            r["z"][p] = (r[p] - mu) / sd
    return sports


def percentile_of(value, population):
    """Share of population <= value, in percent (0-100)."""
    n = len(population)
    below = sum(1 for x in population if x <= value)
    return 100.0 * below / n


def score_elegance():
    """Commentary-sentiment elegance from the aesthetic lexicon."""
    corpus = {s: [] for s in STARS}
    with open(CORPUS_CSV, newline="") as f:
        for r in csv.DictReader(f):
            corpus.setdefault(r["player"], []).append(r["text"])

    lex = set(ELEGANCE_LEXICON)
    results = {}
    for star, texts in corpus.items():
        blob = " ".join(texts).lower()
        words = re.findall(r"[a-z]+", blob)
        n_words = len(words) or 1
        hit_counts = {}
        for w in words:
            if w in lex:
                hit_counts[w] = hit_counts.get(w, 0) + 1
        hits = sum(hit_counts.values())
        density = 100.0 * hits / n_words  # aesthetic hits per 100 words
        top_terms = sorted(hit_counts.items(), key=lambda kv: -kv[1])[:8]
        results[star] = {
            "n_quotes": len(texts),
            "n_words": n_words,
            "hits": hits,
            "density": density,
            "top_terms": [{"term": t, "n": n} for t, n in top_terms],
        }

    # Scale density to a 0-100 relative index (max star = 100).
    max_density = max(v["density"] for v in results.values()) or 1e-9
    for v in results.values():
        v["elegance_index"] = round(100.0 * v["density"] / max_density, 1)
    return results


def build():
    rows = read_players()
    zscores_by_sport(rows)
    elegance = score_elegance()

    payload = {"players": [], "peers": {}, "meta": {}}

    for star in STARS:
        sport = STAR_SPORT[star]
        sport_rows = [r for r in rows if r["sport"] == sport]
        srow = next(r for r in sport_rows if r["player"] == star)

        # Composite dominance = mean of pillar z-scores.
        comp = {r["player"]: stats.mean(r["z"][p] for p in PILLARS)
                for r in sport_rows}
        star_comp = comp[star]
        comp_vals = list(comp.values())
        dom_pct = percentile_of(star_comp, comp_vals)
        rank = sorted(comp.values(), reverse=True).index(star_comp) + 1

        # Per-pillar percentile within sport (for the radar).
        radar = []
        for p in PILLARS:
            pop = [r[p] for r in sport_rows]
            radar.append({
                "pillar": PILLAR_LABELS[p],
                "value": round(srow[p], 3),
                "z": round(srow["z"][p], 2),
                "pct": round(percentile_of(srow[p], pop), 1),
            })

        payload["players"].append({
            "name": star,
            "sport": sport,
            "icon": STAR_ICON[star],
            "dominance_z": round(star_comp, 3),
            "dominance_pct": round(dom_pct, 1),
            "rank_in_sport": rank,
            "peers_n": len(sport_rows),
            "elegance_index": elegance[star]["elegance_index"],
            "elegance_density": round(elegance[star]["density"], 2),
            "elegance_hits": elegance[star]["hits"],
            "elegance_words": elegance[star]["n_words"],
            "n_quotes": elegance[star]["n_quotes"],
            "top_terms": elegance[star]["top_terms"],
            "radar": radar,
        })

        payload["peers"][sport] = [
            {"name": r["player"], "z": round(comp[r["player"]], 3),
             "is_star": r["is_star"]}
            for r in sorted(sport_rows, key=lambda x: -comp[x["player"]])
        ]

    # Pantheon score = balanced blend of the two axes, each rescaled 0-100.
    dom_zs = [p["dominance_z"] for p in payload["players"]]
    dz_min, dz_max = min(dom_zs), max(dom_zs)
    for p in payload["players"]:
        dom_100 = 100.0 * (p["dominance_z"] - dz_min) / ((dz_max - dz_min) or 1)
        # keep a floor so the plane isn't degenerate for 3 elite points
        dom_100 = 60 + 0.4 * dom_100
        p["dominance_scaled"] = round(dom_100, 1)
        p["pantheon_score"] = round(0.5 * dom_100 + 0.5 * p["elegance_index"], 1)

    payload["players"].sort(key=lambda x: -x["pantheon_score"])

    payload["meta"] = {
        "title": "The Pantheon Index",
        "subtitle": "Greatness × Elegance · Tendulkar, Messi, Federer",
        "pillars": [PILLAR_LABELS[p] for p in PILLARS],
        "lexicon_size": len(set(ELEGANCE_LEXICON)),
        "method_note": (
            "Dominance is each star's average z-score across five pillars, measured "
            "against a curated set of era peers in their own sport (the Gould "
            "normalization). The units cancel, so being a certain number of SDs above "
            "your peers means the same thing in cricket, football and tennis. Elegance "
            "is how densely aesthetic language shows up in a curated commentary corpus, "
            "rescaled to 100."
        ),
        "generated_backdrop": "FIFA World Cup 2026",
    }
    return payload


def main():
    payload = build()
    js = ("// AUTO-GENERATED by code/A1_build_index.py. Do not edit by hand.\n"
          "window.PANTHEON_DATA = " + json.dumps(payload, indent=2,
                                                  ensure_ascii=False) + ";\n")
    for path in (OUT_JS, OUT_JS_SITE):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f:
            f.write(js)
        print("Wrote", os.path.relpath(path, HERE))
    print("\nPantheon ranking (blended score):")
    for i, p in enumerate(payload["players"], 1):
        print(f"  {i}. {p['name']:<18} score={p['pantheon_score']:>5}  "
              f"dom_z={p['dominance_z']:>5}  elegance={p['elegance_index']:>5}  "
              f"(rank {p['rank_in_sport']}/{p['peers_n']} in {p['sport']})")


if __name__ == "__main__":
    main()
