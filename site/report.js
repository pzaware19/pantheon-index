// The Pantheon long-form report renderer (vanilla, dependency-free).
(function () {
  const D = window.PANTHEON_DATA;
  const SPORT_COLOR = { cricket: "#1a7f4b", football: "#2563eb", tennis: "#c1901c" };
  const svgNS = "http://www.w3.org/2000/svg";
  const el = (id) => document.getElementById(id);
  function mk(tag, attrs, text) {
    const n = document.createElementNS(svgNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }
  const last = (s) => s.split(" ").slice(-1)[0];

  /* ---------- build TOC from h2 sections + scrollspy ---------- */
  function toc() {
    const nav = el("toc-nav");
    const secs = [...document.querySelectorAll("main section[id]")];
    const links = {};
    secs.forEach((s) => {
      const h = s.querySelector("h2");
      if (!h) return;
      const a = document.createElement("a");
      a.href = "#" + s.id;
      a.textContent = h.textContent;
      a.dataset.for = s.id;
      nav.appendChild(a);
      links[s.id] = a;
    });
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          Object.values(links).forEach((a) => a.classList.remove("active"));
          if (links[e.target.id]) links[e.target.id].classList.add("active");
        }
      });
    }, { rootMargin: "-10% 0px -70% 0px", threshold: 0 });
    secs.forEach((s) => obs.observe(s));
  }

  /* ---------- Figure 1: peer bars ---------- */
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
        const barColor = pr.is_star ? SPORT_COLOR[sport] : "#c7c9c4";
        row.innerHTML =
          `<div class="nm">${pr.name}</div>` +
          `<div class="bar"><i style="width:${Math.max(6, f)}%;background:${barColor}"></i></div>` +
          `<div class="zv">${pr.z.toFixed(2)}</div>`;
        col.appendChild(row);
      });
      wrap.appendChild(col);
    }
  }

  /* ---------- Figure 2: radars ---------- */
  function radar(player) {
    const S = 210, c = S / 2, R = 74;
    const svg = mk("svg", { viewBox: `0 0 ${S} ${S}`, width: "100%" });
    const axes = player.radar, n = axes.length;
    const ang = (i) => -Math.PI / 2 + i * 2 * Math.PI / n;
    const col = SPORT_COLOR[player.sport];
    [0.25, 0.5, 0.75, 1].forEach((f) => {
      let pts = "";
      for (let i = 0; i < n; i++) pts += `${c + Math.cos(ang(i)) * R * f},${c + Math.sin(ang(i)) * R * f} `;
      svg.appendChild(mk("polygon", { points: pts, fill: "none", stroke: "#e6e6e3", "stroke-width": 1 }));
    });
    let dp = "";
    axes.forEach((a, i) => { const f = a.pct / 100; dp += `${c + Math.cos(ang(i)) * R * f},${c + Math.sin(ang(i)) * R * f} `; });
    svg.appendChild(mk("polygon", { points: dp, fill: col, "fill-opacity": 0.18, stroke: col, "stroke-width": 2 }));
    axes.forEach((a, i) => {
      svg.appendChild(mk("line", { x1: c, y1: c, x2: c + Math.cos(ang(i)) * R, y2: c + Math.sin(ang(i)) * R, stroke: "#ececea" }));
      svg.appendChild(mk("circle", { cx: c + Math.cos(ang(i)) * R * a.pct / 100, cy: c + Math.sin(ang(i)) * R * a.pct / 100, r: 3, fill: col }));
      const lx = c + Math.cos(ang(i)) * (R + 16), ly = c + Math.sin(ang(i)) * (R + 16);
      svg.appendChild(mk("text", { x: lx, y: ly + 3, "text-anchor": "middle", "font-size": 9.5, fill: "#6b7280", "font-family": "sans-serif" }, a.pillar));
    });
    return svg;
  }
  function cards() {
    const wrap = el("cards");
    D.players.forEach((p) => {
      const d = document.createElement("div");
      d.className = "pcard";
      d.innerHTML = `<div class="nm">${p.icon} ${p.name}</div><div class="sp">${p.sport}</div>`;
      d.appendChild(radar(p));
      wrap.appendChild(d);
    });
  }

  /* ---------- Figure 3: elegance cards ---------- */
  function elegance() {
    const wrap = el("elegance-cards");
    D.players.forEach((p) => {
      const chips = p.top_terms.slice(0, 6).map((t) => `<span class="chip">${t.term} <b>${t.n}</b></span>`).join("");
      const d = document.createElement("div");
      d.className = "ecard";
      d.innerHTML =
        `<div class="top"><span class="nm">${p.icon} ${last(p.name)}</span><span class="big" style="color:${SPORT_COLOR[p.sport]}">${p.elegance_index}</span></div>` +
        `<div class="sub">${p.elegance_hits} aesthetic hits · ${p.elegance_density}/100 density</div>` +
        `<div class="chips">${chips}</div>`;
      wrap.appendChild(d);
    });
  }

  /* ---------- Figure 4: the plane ---------- */
  function plane() {
    const W = 720, H = 460, m = { l: 58, r: 24, t: 26, b: 52 };
    const svg = mk("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H });
    const xs = D.players.map((p) => p.dominance_z);
    const xMin = Math.min(0.6, Math.min(...xs) - 0.3), xMax = Math.max(...xs) + 0.35;
    const yMin = 40, yMax = 105;
    const X = (v) => m.l + (v - xMin) / (xMax - xMin) * (W - m.l - m.r);
    const Y = (v) => H - m.b - (v - yMin) / (yMax - yMin) * (H - m.t - m.b);
    for (let i = 0; i <= 4; i++) {
      const gx = xMin + (xMax - xMin) * i / 4;
      svg.appendChild(mk("line", { x1: X(gx), y1: m.t, x2: X(gx), y2: H - m.b, stroke: "#eeeeec" }));
      svg.appendChild(mk("text", { x: X(gx), y: H - m.b + 18, "text-anchor": "middle", class: "tick-lab" }, gx.toFixed(1) + "σ"));
      const gy = yMin + (yMax - yMin) * i / 4;
      svg.appendChild(mk("line", { x1: m.l, y1: Y(gy), x2: W - m.r, y2: Y(gy), stroke: "#eeeeec" }));
      svg.appendChild(mk("text", { x: m.l - 8, y: Y(gy) + 4, "text-anchor": "end", class: "tick-lab" }, Math.round(gy)));
    }
    svg.appendChild(mk("text", { x: (m.l + W - m.r) / 2, y: H - 8, "text-anchor": "middle", class: "axis-lab" }, "Standardized Dominance  (σ above era peers)  →"));
    svg.appendChild(mk("text", { x: 15, y: (m.t + H - m.b) / 2, "text-anchor": "middle", class: "axis-lab", transform: `rotate(-90 15 ${(m.t + H - m.b) / 2})` }, "Aesthetic Elegance  →"));

    for (const sport in D.peers) {
      D.peers[sport].forEach((pr) => {
        if (pr.is_star) return;
        svg.appendChild(mk("circle", { cx: X(pr.z), cy: Y(50), r: 3.5, fill: SPORT_COLOR[sport], opacity: 0.3 }));
      });
    }
    svg.appendChild(mk("text", { x: m.l + 4, y: Y(50) - 8, class: "tick-lab" }, "· era peers (dominance only)"));

    // efficient frontier through the three stars (sorted by dominance)
    const front = [...D.players].sort((a, b) => a.dominance_z - b.dominance_z);
    let fpts = front.map((p) => `${X(p.dominance_z)},${Y(p.elegance_index)}`).join(" ");
    svg.appendChild(mk("polyline", { points: fpts, fill: "none", stroke: "#b45309", "stroke-width": 1.5, "stroke-dasharray": "5 4", opacity: 0.7 }));
    const midp = front[1];
    svg.appendChild(mk("text", { x: X(midp.dominance_z) + 14, y: Y(midp.elegance_index) + 26, "font-size": 11, fill: "#b45309", "font-weight": 700, "font-family": "sans-serif", "font-style": "italic" }, "the frontier"));

    D.players.forEach((p) => {
      const c = SPORT_COLOR[p.sport];
      svg.appendChild(mk("circle", { cx: X(p.dominance_z), cy: Y(p.elegance_index), r: 20, fill: c, opacity: 0.12 }));
      svg.appendChild(mk("circle", { cx: X(p.dominance_z), cy: Y(p.elegance_index), r: 7, fill: c, stroke: "#fff", "stroke-width": 2 }));
      svg.appendChild(mk("text", { x: X(p.dominance_z), y: Y(p.elegance_index) - 16, "text-anchor": "middle", class: "star-lab", fill: c }, p.icon + " " + last(p.name)));
    });
    el("plane-fig").appendChild(svg);
  }

  /* ---------- ranking table ---------- */
  function ranking() {
    let rows = D.players.map((p, i) =>
      `<tr><td>${i + 1}</td><td class="nm">${p.icon} ${p.name}</td>` +
      `<td style="color:${SPORT_COLOR[p.sport]};text-transform:capitalize">${p.sport}</td>` +
      `<td class="num">${p.dominance_z.toFixed(2)}σ</td>` +
      `<td class="num">${p.elegance_index}</td>` +
      `<td class="num"><b>${p.pantheon_score}</b></td></tr>`).join("");
    el("ranking-table").innerHTML =
      `<table><thead><tr><th>#</th><th>Athlete</th><th>Sport</th>` +
      `<th class="num">Dominance</th><th class="num">Elegance</th><th class="num">Pantheon</th></tr></thead>` +
      `<tbody>${rows}</tbody></table>`;
  }

  toc(); peers(); cards(); elegance(); plane(); ranking();
})();
