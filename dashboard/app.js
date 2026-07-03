// The Pantheon Index — renderer (vanilla, dependency-free SVG).
(function () {
  const D = window.PANTHEON_DATA;
  const SPORT_COLOR = { cricket: "#33d17a", football: "#4aa8ff", tennis: "#f4c14b" };
  const el = (id) => document.getElementById(id);
  const svgNS = "http://www.w3.org/2000/svg";
  function mk(tag, attrs, text) {
    const n = document.createElementNS(svgNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }

  /* ---------- podium ---------- */
  function podium() {
    const wrap = el("podium");
    D.players.forEach((p, i) => {
      const d = document.createElement("div");
      d.className = "pod " + p.sport;
      d.innerHTML =
        `<div class="rk">#${i + 1}</div>` +
        `<div class="ic">${p.icon}</div>` +
        `<div class="nm">${p.name}</div>` +
        `<div class="sp">${p.sport}</div>` +
        `<div class="sc">${p.pantheon_score}</div>` +
        `<div class="bd"><span>DOM ${p.dominance_z} σ</span><span>ELEG ${p.elegance_index}</span></div>`;
      wrap.appendChild(d);
    });
  }

  /* ---------- the Greatness × Elegance plane ---------- */
  function plane() {
    const W = 900, H = 520, m = { l: 64, r: 30, t: 30, b: 56 };
    const svg = mk("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H });
    // scales: x = dominance_z, y = elegance_index
    const xs = D.players.map((p) => p.dominance_z);
    const xMin = Math.min(0.6, Math.min(...xs) - 0.3);
    const xMax = Math.max(...xs) + 0.35;
    const yMin = 40, yMax = 105;
    const X = (v) => m.l + (v - xMin) / (xMax - xMin) * (W - m.l - m.r);
    const Y = (v) => H - m.b - (v - yMin) / (yMax - yMin) * (H - m.t - m.b);

    // grid + "elite quadrant" shading (top-right)
    svg.appendChild(mk("rect", {
      x: X((xMin + xMax) / 2), y: m.t, width: X(xMax) - X((xMin + xMax) / 2),
      height: Y((yMin + yMax) / 2) - m.t, fill: "#f4c14b", opacity: 0.05
    }));
    svg.appendChild(mk("text", {
      x: X(xMax) - 8, y: m.t + 18, "text-anchor": "end",
      "font-size": 12, fill: "#f4c14b", "font-weight": 700
    }, "THE SUBLIME QUADRANT"));

    for (let i = 0; i <= 4; i++) {
      const gx = xMin + (xMax - xMin) * i / 4;
      svg.appendChild(mk("line", { x1: X(gx), y1: m.t, x2: X(gx), y2: H - m.b, stroke: "#243349", "stroke-width": 1 }));
      svg.appendChild(mk("text", { x: X(gx), y: H - m.b + 20, "text-anchor": "middle", class: "dot-lab" }, gx.toFixed(1) + "σ"));
    }
    for (let i = 0; i <= 4; i++) {
      const gy = yMin + (yMax - yMin) * i / 4;
      svg.appendChild(mk("line", { x1: m.l, y1: Y(gy), x2: W - m.r, y2: Y(gy), stroke: "#243349", "stroke-width": 1 }));
      svg.appendChild(mk("text", { x: m.l - 10, y: Y(gy) + 4, "text-anchor": "end", class: "dot-lab" }, Math.round(gy)));
    }
    // axis titles
    svg.appendChild(mk("text", { x: (m.l + W - m.r) / 2, y: H - 12, "text-anchor": "middle", fill: "#8ea3bf", "font-size": 13, "font-weight": 700 }, "Standardized Dominance  (σ above era peers)  →"));
    const yt = mk("text", { x: 16, y: (m.t + H - m.b) / 2, "text-anchor": "middle", fill: "#8ea3bf", "font-size": 13, "font-weight": 700, transform: `rotate(-90 16 ${(m.t + H - m.b) / 2})` }, "Aesthetic Elegance  →");
    svg.appendChild(yt);

    // peer points (small, greyed) for context
    for (const sport in D.peers) {
      D.peers[sport].forEach((pr) => {
        if (pr.is_star) return;
        svg.appendChild(mk("circle", { cx: X(pr.z), cy: Y(52), r: 4, fill: SPORT_COLOR[sport], opacity: 0.25 }));
      });
    }
    svg.appendChild(mk("text", { x: m.l + 6, y: Y(52) - 8, class: "dot-lab" }, "· era peers (dominance only)"));

    // the three stars
    D.players.forEach((p) => {
      const c = SPORT_COLOR[p.sport];
      const g = mk("g", {});
      g.appendChild(mk("circle", { cx: X(p.dominance_z), cy: Y(p.elegance_index), r: 22, fill: c, opacity: 0.16 }));
      g.appendChild(mk("circle", { cx: X(p.dominance_z), cy: Y(p.elegance_index), r: 9, fill: c, stroke: "#0a0e14", "stroke-width": 2 }));
      g.appendChild(mk("text", { x: X(p.dominance_z), cy: 0, y: Y(p.elegance_index) - 18, "text-anchor": "middle", class: "star-lab", fill: c }, p.icon + " " + p.name.split(" ").slice(-1)[0]));
      svg.appendChild(g);
    });

    el("plane").appendChild(svg);
  }

  /* ---------- radar per player ---------- */
  function radar(player) {
    const S = 230, c = S / 2, R = 84;
    const svg = mk("svg", { viewBox: `0 0 ${S} ${S}`, width: "100%" });
    const axes = player.radar, n = axes.length;
    const ang = (i) => -Math.PI / 2 + i * 2 * Math.PI / n;
    const col = SPORT_COLOR[player.sport];
    // rings
    [0.25, 0.5, 0.75, 1].forEach((f) => {
      let pts = "";
      for (let i = 0; i < n; i++) pts += `${c + Math.cos(ang(i)) * R * f},${c + Math.sin(ang(i)) * R * f} `;
      svg.appendChild(mk("polygon", { points: pts, fill: "none", stroke: "#243349", "stroke-width": 1 }));
    });
    // data polygon (percentile /100)
    let dp = "";
    axes.forEach((a, i) => { const f = a.pct / 100; dp += `${c + Math.cos(ang(i)) * R * f},${c + Math.sin(ang(i)) * R * f} `; });
    svg.appendChild(mk("polygon", { points: dp, fill: col, "fill-opacity": 0.25, stroke: col, "stroke-width": 2 }));
    // labels + points
    axes.forEach((a, i) => {
      const lx = c + Math.cos(ang(i)) * (R + 18), ly = c + Math.sin(ang(i)) * (R + 18);
      svg.appendChild(mk("line", { x1: c, y1: c, x2: c + Math.cos(ang(i)) * R, y2: c + Math.sin(ang(i)) * R, stroke: "#243349" }));
      svg.appendChild(mk("circle", { cx: c + Math.cos(ang(i)) * R * a.pct / 100, cy: c + Math.sin(ang(i)) * R * a.pct / 100, r: 3, fill: col }));
      svg.appendChild(mk("text", { x: lx, y: ly + 3, "text-anchor": "middle", "font-size": 10, fill: "#8ea3bf" }, a.pillar));
    });
    return svg;
  }

  function cards() {
    const wrap = el("cards");
    D.players.forEach((p) => {
      const d = document.createElement("div");
      d.className = "pcard";
      d.innerHTML =
        `<div class="hd"><div class="ic">${p.icon}</div><div><div class="nm">${p.name}</div><div class="sp">${p.sport}</div></div></div>`;
      d.appendChild(radar(p));
      const s = document.createElement("div");
      s.innerHTML =
        `<div class="stat"><span>Dominance</span><b>${p.dominance_z} σ</b></div>` +
        `<div class="stat"><span>Rank in sport</span><b>#${p.rank_in_sport} of ${p.peers_n}</b></div>` +
        `<div class="stat"><span>Elegance index</span><b>${p.elegance_index}</b></div>` +
        `<div class="stat"><span>Pantheon score</span><b>${p.pantheon_score}</b></div>`;
      d.appendChild(s);
      wrap.appendChild(d);
    });
  }

  /* ---------- peer bars ---------- */
  function peers() {
    const wrap = el("peers");
    for (const sport in D.peers) {
      const list = D.peers[sport];
      const zmax = Math.max(...list.map((x) => x.z));
      const zmin = Math.min(...list.map((x) => x.z));
      const col = document.createElement("div");
      col.className = "peercol";
      col.innerHTML = `<h3 style="color:${SPORT_COLOR[sport]}">${sport}</h3>`;
      list.forEach((pr) => {
        const f = (pr.z - zmin) / ((zmax - zmin) || 1) * 100;
        const row = document.createElement("div");
        row.className = "prow" + (pr.is_star ? " hero-row" : "");
        row.innerHTML =
          `<div class="nm">${pr.name}</div>` +
          `<div class="bar"><i style="width:${Math.max(6, f)}%"></i></div>` +
          `<div class="zv">${pr.z.toFixed(2)}</div>`;
        col.appendChild(row);
      });
      wrap.appendChild(col);
    }
  }

  /* ---------- elegance cards ---------- */
  function elegance() {
    const wrap = el("elegance");
    D.players.forEach((p) => {
      const chips = p.top_terms.slice(0, 6).map((t) => `<span class="chip">${t.term} <b>${t.n}</b></span>`).join("");
      const d = document.createElement("div");
      d.className = "ecard";
      d.innerHTML =
        `<div class="top"><div class="nm">${p.icon} ${p.name}</div><div class="big">${p.elegance_index}</div></div>` +
        `<div style="font-size:12px;color:#8ea3bf">${p.elegance_hits} aesthetic hits · ${p.elegance_words} words · ${p.elegance_density}/100 density</div>` +
        `<div class="chips">${chips}</div>`;
      wrap.appendChild(d);
    });
  }

  /* ---------- methodology ---------- */
  function method() {
    el("method").innerHTML = `
      <p>${D.meta.method_note}</p>
      <h4>Axis 1 — Standardized Dominance (the Gould normalization)</h4>
      <p>Raw output can't cross sports — a batting average, a goals-per-90 and a match-win % share no units. So instead of comparing outputs we compare <b>position within a distribution</b>: for each of five pillars we compute a z-score against a curated set of ~8 era peers in that sport, then average them.</p>
      <ul>
        <li><code>Peak</code> — height of the best window (peak-window rate stat)</li>
        <li><code>Longevity</code> — elite years sustained</li>
        <li><code>Consistency</code> — share of seasons at an elite level</li>
        <li><code>Big-Stage</code> — knockout / World Cup / major-final output</li>
        <li><code>Volume</code> — accumulated career output vs peers</li>
      </ul>
      <p>Because a z-score is unitless, <b>"1.5σ above your peers" means the same thing in cricket, football and tennis</b> — that is what makes the three comparable.</p>
      <h4>Axis 2 — Aesthetic Elegance (from language)</h4>
      <p>The genuinely novel axis. We quantify elegance not from play but from <b>how the world writes about them</b>: a curated commentary/press corpus scored against a ${D.meta.lexicon_size}-word aesthetic lexicon (<i>grace, effortless, sublime, artistry, poetry, silk…</i>). Density of aesthetic language per 100 words, scaled to 100. Federer's max score is the David-Foster-Wallace effect made numeric.</p>
      <div class="honest">
        <b>Honesty box.</b> This is a constructed metric, not a law of nature. (1) Player and peer numbers are <b>curated approximations</b> chosen to be representative and swappable — the pipeline reads two CSVs, so real, fuller datasets drop straight in. (2) The commentary corpus is curated, not scraped; it is designed to accept a larger scraped corpus later. (3) The blended "Pantheon score" is one defensible weighting (50/50) of two axes that are genuinely different things — read the <b>plane</b>, not the ranking. The point is the <b>method</b>, and the finding that all three top their own sport while occupying the same rare corner of the greatness–elegance plane.
      </div>`;
  }

  podium(); plane(); cards(); peers(); elegance(); method();
})();
