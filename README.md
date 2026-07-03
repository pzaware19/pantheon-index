# The Pantheon Index · Tendulkar × Messi × Federer

A cross-sport experiment. Can *greatness married to elegance* be measured on one
comparable scale? Built in the backdrop of the **FIFA World Cup 2026**.

Three athletes stand in for the sublime in their game: **Sachin Tendulkar**
(cricket), **Lionel Messi** (football), **Roger Federer** (tennis). This project
places all three on **two constructed, comparable axes**.

## The two axes

| Axis | What it is | How it's built |
|------|------------|----------------|
| **Standardized Dominance** | How far above their *own era's peers* each star sits | Mean z-score across 5 pillars vs ~8 curated era peers per sport (the **Gould normalization**, so units cancel and "1.5σ above peers" means the same in every sport) |
| **Aesthetic Elegance** | How the world *writes* about them | Density of an aesthetic lexicon (*grace, effortless, sublime, artistry, poetry…*) over a curated commentary/press corpus, scaled to 100 |

The five dominance pillars: **Peak, Longevity, Consistency, Big-Stage, Volume.**

## Headline finding

All three rank **#1 in their own sport** on composite dominance, and on the
greatness-and-elegance plane they trace an **efficient frontier**: no merely-great
peer is both more dominant and more elegant than they are. The separation is in the
detail. Federer maxes the elegance axis (the David Foster Wallace effect), while
Messi and Tendulkar push the dominance edge.

## Structure

```
Pantheon/
├── data/
│   ├── players.csv            # star + era peers, 5 pillars each (curated, swappable)
│   └── commentary_corpus.csv  # curated press/commentary text per star
├── code/
│   └── A1_build_index.py      # computes z-scores + elegance -> dashboard payload
├── site/                      # long-form research article (Quarto-style)
│   ├── index.html             # scrollable narrative w/ sticky Contents TOC
│   ├── styles.css             # light editorial theme
│   ├── report.js              # scrollspy TOC + SVG figures
│   └── data/pantheon_data.js  # AUTO-GENERATED (same payload as dashboard)
├── dashboard/                 # dark "sports-broadcast" interactive dashboard
│   ├── index.html
│   ├── app.js                 # vanilla SVG renderer (podium, plane, radars, bars)
│   ├── styles.css
│   └── data/pantheon_data.js  # AUTO-GENERATED payload, do not hand-edit
└── README.md
```

## Run

```bash
# 1. rebuild the payload from the CSVs (writes to both site/ and dashboard/)
python3 Pantheon/code/A1_build_index.py

# 2a. serve the long-form report (recommended entry point)
cd Pantheon/site && python3 -m http.server 8077        # -> http://localhost:8077

# 2b. or the interactive dashboard
cd Pantheon/dashboard && python3 -m http.server 8078   # -> http://localhost:8078
```

Two front ends, one payload:
- **`site/`** is a long-form, editorial research article (light theme, sticky Contents
  TOC, embedded figures, honest-limitations sections). This is the "read it" surface.
  It's fully static, so it deploys to GitHub Pages as-is.
- **`dashboard/`** is a darker, broadcast-style interactive hub. The "explore it" surface.

## Honesty box

This is a **constructed metric**, not a law of nature.

- Player/peer numbers are **curated approximations**, chosen to be representative
  and easy to swap. The whole pipeline reads two CSVs, so a fuller real dataset
  drops straight in.
- The commentary corpus is **curated, not scraped**, though the scorer is built to
  accept a larger scraped corpus.
- The blended "Pantheon score" is one defensible 50/50 weighting of two genuinely
  different things. **Read the plane, not the ranking.**

What matters is the *method*, and the finding that three athletes from three sports
land in the same corner of a plane that measures both how far above everyone they
were and how beautiful it looked.
