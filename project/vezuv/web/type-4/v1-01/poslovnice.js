"use strict";

// City directory and bead map for the three markets.
(() => {
  const root = document.getElementById("poslovnice");
  if (!root) return;

  const source = JSON.parse(document.getElementById("poslovnice-podaci").textContent);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const ROWS = 8;
  const LABELS = { cg: [42.2, 19.85], sr: [45.62, 20.25], rs: [44.05, 16.85] };
  const K = Math.cos((44 * Math.PI) / 180);

  // ---------- data
  const markets = source.trzista;
  const marketById = Object.fromEntries(markets.map((m) => [m.id, m]));
  const cities = [];
  for (const market of markets) {
    for (const c of market.gradovi) {
      cities.push({ ...c, market, key: `${market.id}:${c.grad}`, wx: c.lon * K, wy: -c.lat, screen: null });
    }
  }
  const byCount = (a, b) => b.broj - a.broj || a.grad.localeCompare(b.grad, "sr");
  const lists = { sve: cities.slice().sort(byCount) };
  for (const m of markets) lists[m.id] = cities.filter((c) => c.market === m).sort(byCount);
  const shownCg = lists.cg.reduce((n, c) => n + c.broj, 0);
  const notes = {
    sve: `Srbija i Republika Srpska: zvanični spiskovi. Crna Gora: na karti su ${shownCg} od ${marketById.cg.ukupno} poslovnica, iz javnog imenika.`,
  };
  for (const m of markets) notes[m.id] = m.napomena;

  const plural = (n) => {
    const d = n % 10;
    const h = n % 100;
    return d >= 2 && d <= 4 && (h < 12 || h > 14) ? "poslovnice" : "poslovnica";
  };

  // ---------- elements
  const tabs = Array.from(root.querySelectorAll(".market"));
  const list = root.querySelector(".board-rows");
  const pageLabel = root.querySelector(".board-page");
  const note = root.querySelector(".board-note");
  const mapBox = root.querySelector(".branch-map");
  const canvas = mapBox.querySelector("canvas");
  const ctx = canvas.getContext("2d");

  // ---------- board
  let marketId = "sve";
  let page = 0;
  let open = null;
  let hover = null;

  const span = (cls) => {
    const el = document.createElement("span");
    el.className = cls;
    return el;
  };

  const rows = [];
  for (let i = 0; i < ROWS; i++) {
    const li = document.createElement("li");
    li.className = "row is-empty";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "row-btn";
    btn.disabled = true;
    btn.setAttribute("aria-expanded", "false");
    const city = span("cell-city");
    const mk = span("cell-mk");
    const n = span("cell-n");
    const toggle = span("toggle-icon");
    toggle.setAttribute("aria-hidden", "true");
    btn.append(city, mk, n, toggle);
    const detail = document.createElement("div");
    detail.className = "row-detail";
    detail.id = `poslovnice-red-${i}`;
    detail.hidden = true;
    btn.setAttribute("aria-controls", detail.id);
    li.append(btn, detail);
    list.append(li);
    const row = { li, btn, city, mk, n, detail, data: null };
    btn.addEventListener("click", () => {
      if (row.data) select(open === row.data ? null : row.data);
    });
    btn.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "mouse" && row.data) setHover(row.data);
    });
    btn.addEventListener("pointerleave", () => setHover(null));
    rows.push(row);
  }

  const pageCount = () => Math.max(1, Math.ceil(lists[marketId].length / ROWS));

  function fillDetail(row, city) {
    const ul = document.createElement("ul");
    for (const shop of city.poslovnice) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(`Volcano, ${shop.adresa}, ${city.grad}`);
      a.target = "_blank";
      a.rel = "noopener";
      const addr = span("addr");
      addr.textContent = shop.adresa;
      const tag = span("tag");
      tag.textContent = shop.oznaka ? (shop.naziv ? `${shop.oznaka} · ${shop.naziv}` : shop.oznaka) : "";
      const arrow = document.createElement("i");
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "↗";
      a.append(addr, tag, arrow);
      li.append(a);
      ul.append(li);
    }
    row.detail.replaceChildren(ul);
    row.detail.dataset.key = city.key;
  }

  function showOpen(row) {
    const isOpen = Boolean(row.data) && row.data === open;
    if (isOpen && row.detail.dataset.key !== row.data.key) fillDetail(row, row.data);
    row.li.classList.toggle("is-open", isOpen);
    row.btn.setAttribute("aria-expanded", String(isOpen));
    row.detail.hidden = !isOpen;
  }

  function renderBoard() {
    const items = lists[marketId];
    rows.forEach((row, i) => {
      const city = items[page * ROWS + i] || null;
      row.data = city;
      row.li.classList.toggle("is-empty", !city);
      row.btn.disabled = !city;
      row.city.textContent = city ? city.grad : "";
      row.mk.textContent = city ? city.market.naziv : "";
      row.n.textContent = city ? city.broj : "";
      if (city) row.btn.setAttribute("aria-label", `${city.grad}, ${city.market.naziv}, ${city.broj} ${plural(city.broj)}`);
      else row.btn.removeAttribute("aria-label");
      showOpen(row);
    });
    pageLabel.textContent = `${page + 1} / ${pageCount()}`;
  }

  function goToPage(next) {
    setHover(null);
    page = (next + pageCount()) % pageCount();
    if (open && !lists[marketId].slice(page * ROWS, page * ROWS + ROWS).includes(open)) select(null, false);
    renderBoard();
  }

  for (const button of root.querySelectorAll(".pager")) {
    button.addEventListener("click", () => {
      goToPage(page + Number(button.dataset.page));
    });
  }

  function setMarket(id, { fly = true } = {}) {
    marketId = id;
    page = 0;
    open = null;
    for (const tab of tabs) tab.setAttribute("aria-pressed", String(tab.dataset.market === id));
    setHover(null);
    note.textContent = notes[id];
    renderBoard();
    if (fly) flyTo(viewFor(id));
  }

  for (const tab of tabs) {
    tab.addEventListener("click", () => {
      if (tab.dataset.market !== marketId) setMarket(tab.dataset.market);
      else if (open) select(null);
    });
  }

  function select(city, fly = true) {
    open = city;
    for (const row of rows) showOpen(row);
    if (fly) flyTo(city ? cityView(city) : viewFor(marketId));
    requestDraw();
  }

  // Open a city from the map: switch market or page if needed.
  function reveal(city) {
    if (open === city) return select(null);
    if (marketId !== "sve" && city.market.id !== marketId) setMarket(city.market.id, { fly: false });
    const target = Math.floor(lists[marketId].indexOf(city) / ROWS);
    if (target !== page) {
      page = target;
      renderBoard();
    }
    select(city);
    if (window.matchMedia("(max-width: 780px)").matches) {
      const row = rows.find((item) => item.data === city);
      row.btn.scrollIntoView({ block: "nearest", behavior: reduce.matches ? "instant" : "smooth" });
    }
  }

  function setHover(city) {
    if (hover === city) return;
    hover = city;
    for (const row of rows) row.li.classList.toggle("is-hover", Boolean(city) && row.data === city);
    requestDraw();
  }

  // ---------- bead map
  const features = source.granice.map((f) => ({ id: f.id, rings: f.rings.map((r) => r.map(([lon, lat]) => [lon * K, -lat])) }));
  const boxes = {};
  for (const id of ["cg", "sr", "rs"]) {
    const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    for (const f of features) {
      if (f.id !== id) continue;
      for (const r of f.rings) for (const [x, y] of r) {
        box.x0 = Math.min(box.x0, x); box.x1 = Math.max(box.x1, x);
        box.y0 = Math.min(box.y0, y); box.y1 = Math.max(box.y1, y);
      }
    }
    boxes[id] = box;
  }
  boxes.sve = {
    x0: Math.min(boxes.cg.x0, boxes.sr.x0, boxes.rs.x0), y0: Math.min(boxes.cg.y0, boxes.sr.y0, boxes.rs.y0),
    x1: Math.max(boxes.cg.x1, boxes.sr.x1, boxes.rs.x1), y1: Math.max(boxes.cg.y1, boxes.sr.y1, boxes.rs.y1),
  };

  let W = 0;
  let H = 0;
  let dpr = 1;
  let DX = 7;
  let RH = 6;
  let cam = null;
  let flight = null;
  let patterns = null;
  let sprites = null;
  let offscreen = null;
  let visible = false;
  let pendingFrame = 0;
  const pointer = { x: 0, y: 0, inside: false };

  function fit(box) {
    const pad = Math.max(16, W * 0.07);
    const s = Math.min((W - 2 * pad) / (box.x1 - box.x0), (H - 2 * pad) / (box.y1 - box.y0));
    return { x: (box.x0 + box.x1) / 2, y: (box.y0 + box.y1) / 2, s };
  }
  const viewFor = (id) => fit(boxes[id]);
  function cityView(city) {
    const base = viewFor(marketId === "sve" ? city.market.id : marketId);
    return { x: city.wx, y: city.wy, s: base.s * 1.6 };
  }

  function flyTo(target, duration = 650) {
    if (!cam || reduce.matches || !W) {
      cam = { ...target };
      flight = null;
      requestDraw();
      return;
    }
    const from = { ...cam };
    const distance = Math.hypot(target.x - from.x, target.y - from.y) * Math.min(from.s, target.s);
    flight = { from, to: { ...target }, start: performance.now(), duration, lift: Math.min(0.9, (distance / Math.max(W, H)) * 0.8) };
    requestDraw();
  }

  function stepFlight(now) {
    if (!flight) return;
    const { from, to, lift, start, duration } = flight;
    const p = Math.min(1, (now - start) / duration);
    const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    const scale = Math.log(from.s) + (Math.log(to.s) - Math.log(from.s)) * e - lift * Math.sin(Math.PI * e);
    cam = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, s: Math.exp(scale) };
    if (p >= 1) flight = null;
  }

  function hexToRgb(hex) {
    const h = hex.replace("#", "").trim();
    const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
  }
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  function beadPattern(fill, shine) {
    const w = Math.max(4, Math.round(DX * dpr));
    const h = Math.max(4, Math.round(2 * RH * dpr));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d");
    const r = w * 0.36;
    for (const [x, y] of [[0, 0], [w, 0], [0, h], [w, h], [w / 2, h / 2]]) {
      const grad = g.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.05, x, y, r);
      grad.addColorStop(0, shine);
      grad.addColorStop(1, fill);
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    const pattern = ctx.createPattern(c, "repeat");
    pattern.setTransform(new DOMMatrix().scaleSelf(1 / dpr, 1 / dpr));
    return pattern;
  }

  function beadSprite(core, mid, edge, glow, glowAlpha) {
    const size = Math.ceil(DX * 3.4 * dpr);
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d");
    const m = size / 2;
    const halo = g.createRadialGradient(m, m, 0, m, m, m);
    halo.addColorStop(0, rgb(glow, glowAlpha));
    halo.addColorStop(1, rgb(glow, 0));
    g.fillStyle = halo;
    g.fillRect(0, 0, size, size);
    const r = DX * 0.42 * dpr;
    const bead = g.createRadialGradient(m - r * 0.35, m - r * 0.45, r * 0.05, m, m, r);
    bead.addColorStop(0, rgb(core));
    bead.addColorStop(0.55, rgb(mid));
    bead.addColorStop(1, rgb(edge));
    g.fillStyle = bead;
    g.beginPath();
    g.arc(m, m, r, 0, Math.PI * 2);
    g.fill();
    return { canvas: c, size: size / dpr };
  }

  function setup() {
    const rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    if (!W || !H) return false;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const step = W < 420 ? 5.2 : 6.4;
    DX = Math.round(step * dpr) / dpr;
    RH = Math.round(DX * 0.866 * dpr) / dpr;
    const lit = hexToRgb(getComputedStyle(root).getPropertyValue("--map-lit") || "#fa512c");
    const white = [255, 255, 255];
    patterns = {
      on: beadPattern("#2a2c2b", "#4b4d4b"),
      off: beadPattern("#1d1f1e", "#2e302f"),
      ctx: beadPattern("#161717", "#1f2120"),
      light: beadPattern("#6b6d69", "#d9d8d2"),
    };
    sprites = {
      lit: beadSprite(mix(lit, white, 0.55), lit, mix(lit, [0, 0, 0], 0.5), lit, 0),
      hot: beadSprite(white, mix(lit, white, 0.7), mix(lit, white, 0.2), mix(lit, white, 0.4), 0.08),
      dim: beadSprite(mix(lit, [16, 17, 17], 0.2), mix(lit, [16, 17, 17], 0.45), mix(lit, [0, 0, 0], 0.65), lit, 0.05),
    };
    offscreen = document.createElement("canvas");
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    cam = open ? cityView(open) : viewFor(marketId);
    flight = null;
    return true;
  }

  const toScreen = (x, y) => [(x - cam.x) * cam.s + W / 2, (y - cam.y) * cam.s + H / 2];

  // Each shop lights one bead of the lattice, packed around its city.
  function placeBeads() {
    const taken = new Set();
    for (const city of lists.sve) {
      const [sx, sy] = toScreen(city.wx, city.wy);
      if (sx < -60 || sx > W + 60 || sy < -60 || sy > H + 60) {
        city.screen = null;
        continue;
      }
      const R = Math.ceil(Math.sqrt(city.broj)) + 2;
      const j0 = Math.round(sy / RH);
      const candidates = [];
      for (let j = j0 - R; j <= j0 + R; j++) {
        const shift = j & 1 ? DX / 2 : 0;
        const i0 = Math.round((sx - shift) / DX);
        for (let i = i0 - R; i <= i0 + R; i++) {
          const x = i * DX + shift;
          const y = j * RH;
          candidates.push([(x - sx) ** 2 + (y - sy) ** 2, x, y, `${i},${j}`]);
        }
      }
      candidates.sort((a, b) => a[0] - b[0]);
      const beads = [];
      let reach = 0;
      for (const [d, x, y, id] of candidates) {
        if (beads.length >= city.broj) break;
        if (taken.has(id)) continue;
        taken.add(id);
        beads.push([x, y]);
        reach = Math.max(reach, Math.sqrt(d));
      }
      city.screen = { x: sx, y: sy, beads, reach };
    }
  }

  function draw(now) {
    if (!cam) return;
    stepFlight(now);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const paths = {};
    const land = new Path2D();
    for (const f of features) {
      const path = new Path2D();
      for (const ring of f.rings) {
        ring.forEach(([x, y], i) => {
          const sx = (x - cam.x) * cam.s + W / 2;
          const sy = (y - cam.y) * cam.s + H / 2;
          if (i) path.lineTo(sx, sy);
          else path.moveTo(sx, sy);
        });
        path.closePath();
      }
      paths[f.id] = path;
      if (f.id !== "ctx") land.addPath(path);
    }
    const isActive = (id) => id !== "ctx" && (marketId === "sve" || marketId === id);

    for (const f of features) {
      ctx.save();
      ctx.clip(paths[f.id]);
      ctx.fillStyle = f.id === "ctx" ? patterns.ctx : isActive(f.id) ? patterns.on : patterns.off;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    ctx.lineJoin = "round";
    ctx.lineWidth = 1;
    for (const f of features) {
      if (f.id === "ctx") continue;
      ctx.strokeStyle = isActive(f.id) ? "rgba(243,242,239,.2)" : "rgba(243,242,239,.08)";
      ctx.stroke(paths[f.id]);
    }

    // A soft light follows the pointer over the beads, like the relief band below.
    if (pointer.inside) {
      const o = offscreen.getContext("2d");
      o.setTransform(dpr, 0, 0, dpr, 0, 0);
      o.globalCompositeOperation = "source-over";
      o.clearRect(0, 0, W, H);
      o.save();
      o.clip(land);
      o.fillStyle = patterns.light;
      o.fillRect(pointer.x - 140, pointer.y - 140, 280, 280);
      o.restore();
      o.globalCompositeOperation = "destination-in";
      const glow = o.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 130);
      glow.addColorStop(0, "rgba(0,0,0,.55)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      o.fillStyle = glow;
      o.fillRect(0, 0, W, H);
      ctx.drawImage(offscreen, 0, 0, W, H);
    }

    placeBeads();
    for (const city of lists.sve) {
      const s = city.screen;
      if (!s) continue;
      const inMarket = marketId === "sve" || city.market.id === marketId;
      const sprite = city === open ? sprites.hot : inMarket ? sprites.lit : sprites.dim;
      const half = sprite.size / 2;
      ctx.globalAlpha = inMarket ? 1 : 0.55;
      s.beads.forEach(([x, y]) => {
        ctx.drawImage(sprite.canvas, x - half, y - half, sprite.size, sprite.size);
      });
    }
    ctx.globalAlpha = 1;

    // Ring around the open city.
    if (open && open.screen) {
      const s = open.screen;
      ctx.strokeStyle = "rgba(243,242,239,.5)";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.reach + 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Labels: market names, then the hovered or open city.
    ctx.font = "400 12px Inter, Arial, sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    for (const id of marketId === "sve" && !open ? ["cg", "sr", "rs"] : []) {
      const [lat, lon] = LABELS[id];
      const text = marketById[id].naziv;
      const half = ctx.measureText(text).width / 2 + 8;
      const [x, y] = toScreen(lon * K, -lat);
      ctx.fillStyle = isActive(id) ? "rgba(243,242,239,.5)" : "rgba(243,242,239,.22)";
      ctx.fillText(text, Math.min(W - half, Math.max(half, x)), y);
    }
    const tagged = hover || open;
    if (tagged && tagged.screen) {
      const s = tagged.screen;
      const name = tagged.grad;
      const count = String(tagged.broj);
      ctx.font = "500 13px Inter, Arial, sans-serif";
      const nameWidth = ctx.measureText(name).width;
      ctx.font = "400 12px Inter, Arial, sans-serif";
      const countWidth = ctx.measureText(count).width;
      const width = nameWidth + 7 + countWidth;
      const left = s.x + s.reach + 12 + width > W - 8;
      const x = left ? s.x - s.reach - 12 - width : s.x + s.reach + 12;
      ctx.textAlign = "left";
      ctx.shadowColor = "rgba(16,17,17,.95)";
      ctx.shadowBlur = 8;
      ctx.font = "500 13px Inter, Arial, sans-serif";
      ctx.fillStyle = "#f3f2ef";
      ctx.fillText(name, x, s.y + 0.5);
      ctx.font = "400 12px Inter, Arial, sans-serif";
      ctx.fillStyle = "rgba(243,242,239,.55)";
      ctx.fillText(count, x + nameWidth + 7, s.y + 0.5);
      ctx.shadowBlur = 0;
    }
  }

  // The resting map is a still image. Only a camera move needs consecutive frames.
  function requestDraw() {
    if (!pendingFrame && visible && cam) pendingFrame = requestAnimationFrame(frame);
  }

  function frame(now) {
    pendingFrame = 0;
    if (!visible) return;
    draw(now);
    if (flight) requestDraw();
  }

  reduce.addEventListener("change", () => {
    if (reduce.matches && flight) {
      cam = flight.to;
      flight = null;
      requestDraw();
    }
  });

  function hitTest() {
    let best = null;
    let bestDistance = Infinity;
    for (const city of cities) {
      const s = city.screen;
      if (!s) continue;
      const d = Math.hypot(pointer.x - s.x, pointer.y - s.y);
      if (d < s.reach + 9 && d < bestDistance) {
        best = city;
        bestDistance = d;
      }
    }
    return best;
  }

  canvas.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.inside = event.pointerType === "mouse";
    const city = hitTest();
    canvas.classList.toggle("is-pointing", Boolean(city));
    setHover(city);
    requestDraw();
  });
  canvas.addEventListener("pointerleave", () => {
    pointer.inside = false;
    canvas.classList.remove("is-pointing");
    setHover(null);
    requestDraw();
  });
  canvas.addEventListener("click", (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    const city = hitTest();
    if (city) reveal(city);
  });

  new ResizeObserver(() => {
    if (setup()) requestDraw();
  }).observe(canvas);

  new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    if (visible) requestDraw();
  }).observe(mapBox);

  setMarket("sve", { fly: false });
  if (document.fonts) document.fonts.load("12px Inter").then(() => requestDraw());
})();
