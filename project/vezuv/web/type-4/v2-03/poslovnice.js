"use strict";

// Poslovnice: split-flap board + bead map of the three markets.
(() => {
  const root = document.getElementById("poslovnice");
  if (!root) return;

  const source = JSON.parse(document.getElementById("poslovnice-podaci").textContent);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const ROWS = 8;
  const CITY = 14;
  const DRUM = " ABCČĆDĐEFGHIJKLMNOPRSŠTUVZŽ0123456789.·-";
  const NOISE = "ABCČĆDĐEFGHIJKLMNOPRSŠTUVZŽ0123456789";
  const SHORT = { "Istočno Novo Sarajevo": "I.N. Sarajevo", "Kozarska Dubica": "K. Dubica" };
  const HUB = { sve: "Podgorica", cg: "Podgorica", sr: "Beograd", rs: "Banja Luka" };
  const LABELS = { cg: [42.2, 19.85], sr: [45.62, 20.25], rs: [44.05, 16.85] };
  const K = Math.cos((44 * Math.PI) / 180);

  // ---------- data
  const markets = source.trzista;
  const marketById = Object.fromEntries(markets.map((m) => [m.id, m]));
  const cities = [];
  for (const market of markets) {
    for (const c of market.gradovi) {
      cities.push({ ...c, market, key: `${market.id}:${c.grad}`, wx: c.lon * K, wy: -c.lat, phase: Math.random() * 6.28, delay: 0, screen: null });
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
  const board = root.querySelector(".board");
  const list = root.querySelector(".board-rows");
  const pageLabel = root.querySelector(".board-page");
  const marketLabel = root.querySelector(".board-market");
  const note = root.querySelector(".board-note");
  const mapBox = root.querySelector(".branch-map");
  const canvas = mapBox.querySelector("canvas");
  const ctx = canvas.getContext("2d");

  // ---------- split-flap tiles: each tile turns forward through the drum until it reaches its letter
  const FLIP = [
    { transform: "perspective(70px) rotateX(0deg)", filter: "brightness(1)" },
    { transform: "perspective(70px) rotateX(-80deg)", filter: "brightness(.45)", offset: 0.5 },
    { transform: "perspective(70px) rotateX(0deg)", filter: "brightness(1)" },
  ];
  const spinning = new Set();
  let spinFrame = 0;

  function makeTiles(host, n) {
    const tiles = [];
    for (let i = 0; i < n; i++) {
      const tile = document.createElement("span");
      tile.className = "tile";
      tile.textContent = " ";
      host.append(tile);
      tiles.push(tile);
    }
    return tiles;
  }

  function spinTo(tile, ch, delay) {
    const goal = DRUM.indexOf(ch);
    if (reduce.matches || goal < 0) {
      spinning.delete(tile);
      tile.textContent = ch;
      return;
    }
    let cur = DRUM.indexOf(tile.textContent);
    if (cur < 0) cur = 0;
    const steps = (goal - cur + DRUM.length) % DRUM.length;
    if (steps === 0 && !spinning.has(tile)) return;
    if (steps > 7) cur = (goal - 7 + DRUM.length) % DRUM.length;
    tile._spin = { cur, goal, at: performance.now() + delay };
    spinning.add(tile);
    if (!spinFrame) spinFrame = requestAnimationFrame(runSpins);
  }

  function runSpins(now) {
    for (const tile of spinning) {
      const s = tile._spin;
      if (now < s.at) continue;
      s.cur = (s.cur + 1) % DRUM.length;
      tile.textContent = DRUM[s.cur];
      tile.animate(FLIP, { duration: 74, easing: "ease-in-out" });
      s.at = now + 58 + Math.random() * 22;
      if (s.cur === s.goal) spinning.delete(tile);
    }
    spinFrame = spinning.size ? requestAnimationFrame(runSpins) : 0;
  }

  function setTiles(tiles, text, delay = 0, right = false) {
    const t = text.toUpperCase();
    const padded = right ? t.padStart(tiles.length).slice(-tiles.length) : t.padEnd(tiles.length).slice(0, tiles.length);
    tiles.forEach((tile, i) => spinTo(tile, padded[i], delay + i * 24));
  }

  // Small text (info column): random letters settling left to right.
  const scrambles = new WeakMap();
  function scramble(el, text) {
    if (reduce.matches) {
      el.textContent = text;
      return;
    }
    const token = {};
    scrambles.set(el, token);
    const length = Math.max(text.length, el.textContent.length);
    const start = performance.now();
    let last = 0;
    const frame = (now) => {
      if (scrambles.get(el) !== token) return;
      if (now - last < 45) return void requestAnimationFrame(frame);
      last = now;
      let out = "";
      let done = true;
      for (let i = 0; i < length; i++) {
        const ch = text[i] ?? "";
        if (ch === " " || now - start > 140 + i * 30) out += ch;
        else {
          done = false;
          out += NOISE[(Math.random() * NOISE.length) | 0];
        }
      }
      el.textContent = out;
      if (!done) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

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
    const n = span("cell cell-n");
    const city = span("cell cell-city");
    const mk = span("cell cell-mk");
    const info = span("b-info");
    for (const el of [n, city, mk, info]) el.setAttribute("aria-hidden", "true");
    const label = span("sr-only");
    btn.append(n, city, mk, info, label);
    const detail = document.createElement("div");
    detail.className = "row-detail";
    detail.id = `poslovnice-red-${i}`;
    detail.hidden = true;
    btn.setAttribute("aria-controls", detail.id);
    li.append(btn, detail);
    list.append(li);
    const row = { li, btn, info, label, detail, data: null, n: makeTiles(n, 2), city: makeTiles(city, CITY), mk: makeTiles(mk, 2) };
    btn.addEventListener("click", () => {
      stopAuto();
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
    const was = row.li.classList.contains("is-open");
    if (isOpen && row.detail.dataset.key !== row.data.key) fillDetail(row, row.data);
    row.li.classList.toggle("is-open", isOpen);
    row.btn.setAttribute("aria-expanded", String(isOpen));
    row.detail.hidden = !isOpen;
    if (row.data && was !== isOpen) scramble(row.info, isOpen ? "Na karti" : "Prikaži");
  }

  function renderBoard(delay = 0) {
    const items = lists[marketId];
    rows.forEach((row, i) => {
      const city = items[page * ROWS + i] || null;
      const changed = row.data !== city;
      row.data = city;
      row.li.classList.toggle("is-empty", !city);
      row.btn.disabled = !city;
      const wait = delay + i * 55;
      setTiles(row.n, city ? String(city.broj).padStart(2, "0") : "", wait, true);
      setTiles(row.city, city ? SHORT[city.grad] || city.grad : "", wait + 50);
      setTiles(row.mk, city ? city.market.kod : "", wait + 90);
      row.label.textContent = city ? `${city.grad}, ${city.market.naziv}, ${city.broj} ${plural(city.broj)}` : "";
      if (changed) {
        row.li.classList.remove("is-open");
        row.info.textContent = city ? "Prikaži" : "";
      }
      showOpen(row);
    });
    pageLabel.textContent = `Str. ${page + 1}/${pageCount()}`;
  }

  function goToPage(next) {
    page = (next + pageCount()) % pageCount();
    if (open && !lists[marketId].slice(page * ROWS, page * ROWS + ROWS).includes(open)) select(null, false);
    renderBoard();
  }

  for (const button of root.querySelectorAll(".pager")) {
    button.addEventListener("click", () => {
      stopAuto();
      goToPage(page + Number(button.dataset.page));
    });
  }

  function setMarket(id, { fly = true } = {}) {
    marketId = id;
    page = 0;
    open = null;
    for (const tab of tabs) tab.setAttribute("aria-pressed", String(tab.dataset.market === id));
    marketLabel.textContent = `Volcano Bet · ${id === "sve" ? "Sva tržišta" : marketById[id].naziv}`;
    note.textContent = notes[id];
    renderBoard();
    lightUp(id);
    if (fly) flyTo(viewFor(id));
  }

  for (const tab of tabs) {
    tab.addEventListener("click", () => {
      stopAuto();
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
    stopAuto();
    if (open === city) return select(null);
    if (marketId !== "sve" && city.market.id !== marketId) setMarket(city.market.id, { fly: false });
    const target = Math.floor(lists[marketId].indexOf(city) / ROWS);
    if (target !== page) {
      page = target;
      renderBoard();
    }
    select(city);
  }

  function setHover(city) {
    if (hover === city) return;
    hover = city;
    for (const row of rows) row.li.classList.toggle("is-hover", Boolean(city) && row.data === city);
    requestDraw();
  }

  // Pages turn by themselves, like a departures board, until someone uses the board.
  let auto = !reduce.matches;
  let autoTimer = 0;
  let boardHovered = false;
  function stopAuto() {
    auto = false;
    clearInterval(autoTimer);
  }
  board.addEventListener("pointerenter", () => { boardHovered = true; });
  board.addEventListener("pointerleave", () => { boardHovered = false; });
  board.addEventListener("focusin", stopAuto);
  function startAuto() {
    if (!auto || autoTimer) return;
    autoTimer = setInterval(() => {
      if (!auto || boardHovered || open || !visible || document.hidden || pageCount() < 2) return;
      goToPage(page + 1);
    }, 6500);
  }

  // Local time (all three markets share one time zone).
  const clock = root.querySelectorAll(".board-clock b");
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Belgrade", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  function tick() {
    time.format(new Date()).split(":").forEach((part, i) => {
      if (clock[i].textContent !== part) clock[i].textContent = part;
    });
  }
  tick();
  setInterval(tick, 5000);

  // Market counters in the tabs.
  const counters = tabs.map((tab) => {
    const host = tab.querySelector(".market-count");
    return { tiles: makeTiles(host, host.dataset.count.length), value: host.dataset.count };
  });

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
  let sweepStart = Infinity;
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

  function flyTo(target, duration = 1250) {
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

  function lightUp(id) {
    const hub = cities.find((c) => c.grad === HUB[id]);
    for (const city of cities) {
      city.delay = Math.hypot(city.wx - hub.wx, city.wy - hub.wy) * 420 + Math.random() * 120;
    }
    sweepStart = reduce.matches ? -1e9 : performance.now();
    requestDraw();
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
      lit: beadSprite(mix(lit, white, 0.55), lit, mix(lit, [0, 0, 0], 0.5), lit, 0.16),
      hot: beadSprite(white, mix(lit, white, 0.7), mix(lit, white, 0.2), mix(lit, white, 0.4), 0.2),
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
    const t = now - sweepStart;
    for (const city of lists.sve) {
      const s = city.screen;
      if (!s) continue;
      const inMarket = marketId === "sve" || city.market.id === marketId;
      const focus = city === open || city === hover;
      const sprite = city === open ? sprites.hot : inMarket ? sprites.lit : sprites.dim;
      const rise = inMarket ? Math.max(0, Math.min(1, (t - city.delay) / 380)) : 1;
      const base = inMarket ? 1 : 0.55;
      const half = sprite.size / 2;
      s.beads.forEach(([x, y], k) => {
        const twinkle = reduce.matches ? 1 : 0.8 + 0.2 * Math.sin(now / 520 + city.phase + k * 1.7);
        ctx.globalAlpha = Math.min(1, base * rise * (focus ? 1 : twinkle));
        ctx.drawImage(sprite.canvas, x - half, y - half, sprite.size, sprite.size);
      });
    }
    ctx.globalAlpha = 1;

    // Ring around the open city.
    if (open && open.screen) {
      const s = open.screen;
      const pulse = reduce.matches ? 0 : (now % 1800) / 1800;
      ctx.strokeStyle = `rgba(243,242,239,${0.55 * (1 - pulse)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.reach + 7 + pulse * 14, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Labels: market names, then the hovered or open city.
    ctx.font = '400 10px "Plex Mono", ui-monospace, monospace';
    if ("letterSpacing" in ctx) ctx.letterSpacing = "1.2px";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    for (const id of marketId === "sve" && !open ? ["cg", "sr", "rs"] : []) {
      const [lat, lon] = LABELS[id];
      const text = marketById[id].naziv.toUpperCase();
      const half = ctx.measureText(text).width / 2 + 8;
      const [x, y] = toScreen(lon * K, -lat);
      ctx.fillStyle = isActive(id) ? "rgba(243,242,239,.55)" : "rgba(243,242,239,.22)";
      ctx.fillText(text, Math.min(W - half, Math.max(half, x)), y);
    }
    const tagged = hover || open;
    if (tagged && tagged.screen) {
      const s = tagged.screen;
      const name = tagged.grad.toUpperCase();
      const count = String(tagged.broj);
      ctx.font = '400 11px "Plex Mono", ui-monospace, monospace';
      const width = ctx.measureText(`${name}  ${count}`).width;
      const left = s.x + s.reach + 14 + width > W - 8;
      const x = left ? s.x - s.reach - 14 : s.x + s.reach + 14;
      ctx.textAlign = left ? "right" : "left";
      ctx.fillStyle = "rgba(16,17,17,.78)";
      ctx.fillRect(left ? x - width - 8 : x - 6, s.y - 10, width + 14, 20);
      ctx.fillStyle = "#f3f2ef";
      ctx.fillText(left ? `${count}  ${name}` : `${name}  ${count}`, x, s.y + 0.5);
    }
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  }

  // Render loop: runs while the map is on screen (twinkle, flights, sweep), otherwise idle.
  let drawing = false;
  let lastFrame = 0;
  function requestDraw() {
    if (drawing || !cam) return;
    drawing = true;
    requestAnimationFrame(frame);
  }
  function frame(now) {
    const busy = Boolean(flight) || (now >= sweepStart && now - sweepStart < 3200) || pointer.inside;
    if (busy || reduce.matches || now - lastFrame > 32) {
      lastFrame = now;
      draw(now);
    }
    if (visible && !reduce.matches) requestAnimationFrame(frame);
    else drawing = false;
  }

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

  // First time the section comes into view: counters turn, the board fills, the network lights up.
  let started = false;
  new IntersectionObserver((entries, observer) => {
    if (started || !entries.some((entry) => entry.isIntersecting)) return;
    started = true;
    observer.disconnect();
    counters.forEach((c, i) => setTiles(c.tiles, c.value, 150 + i * 140, true));
    setMarket("sve", { fly: false });
    startAuto();
  }, { threshold: 0.15 }).observe(root);

  marketLabel.textContent = "Volcano Bet · Sva tržišta";
  note.textContent = notes.sve;
  pageLabel.textContent = `Str. 1/${pageCount()}`;
  if (document.fonts) document.fonts.load('10px "Plex Mono"').then(() => requestDraw());
})();
