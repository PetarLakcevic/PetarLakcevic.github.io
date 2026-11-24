"use strict";

// Živi reljef znaka 03: isti zid od kuglica kao slika u .brand-relief (izvor/znak_reljef.py --logo 03 --fill inlay),
// samo što svjetlo blago prati miš i skrol. Bez WebGL2 ostaje statična slika.
(() => {
  const box = document.querySelector(".brand-relief");
  const canvas = box && box.querySelector(".relief-live");
  if (!canvas) return;
  const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
  if (!gl) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  // Znak iz brandbooka 03 u 31 red kuglica: četiri trake po 7 redova sa po jednim praznim redom između.
  // Isti raspored kao izvor/znak_reljef.py --logo 03 --fill inlay.
  const N = 31;
  const ROW = Math.sqrt(3) / 2;
  const MARK_H = (N - 1) * ROW + 1;
  const DEF_AZ = 214 * Math.PI / 180;
  const DEF_EL = 31 * Math.PI / 180;
  const RAISED = 16, DIM = 32; // materijal je u donja 4 bita

  // 1/2 bronzani ugao lijevo/desno, 3/4/5 crvene trake, 6 bronzani vrh
  function piece(i, u) {
    if (i < 0 || i >= N || Math.abs(u) > (N - i - 1) / 2 + 1e-6) return 0;
    const b = Math.floor(i / 8), r = i % 8;
    if (r === 7) return 0;
    if (b === 0) {
      const j = Math.round(u + (N - i - 1) / 2);
      const jr = N - i - 1 - j;
      const c = 7 - r;
      if (j < c) return 1;
      if (jr < c) return 2;
      if (j === c || jr === c) return 0;
      return 3;
    }
    return [4, 5, 6][b - 1];
  }

  // materijal: 3/4/5 crvena svijetla/tamna/greben, 6/7/8 bronza svijetla/tamna/greben
  function material(pc, u) {
    if (pc === 1) return 6;
    if (pc === 2) return 7;
    const base = pc === 6 ? 6 : 3;
    return u < -1e-6 ? base : u > 1e-6 ? base + 1 : base + 2;
  }

  function code(i, u) {
    const pc = piece(i, u);
    if (!pc) return 0;
    const m = material(pc, u);
    if (pc === 1 || pc === 2 || pc === 6) return m | RAISED;
    const around = [[i, u - 1], [i, u + 1], [i - 1, u - .5], [i - 1, u + .5], [i + 1, u - .5], [i + 1, u + .5]];
    return around.some(([a, b]) => piece(a, b) !== pc) ? m | RAISED : m | DIM;
  }

  const COLS = N + 1;
  const kinds = new Uint8Array(COLS * N);
  for (let i = 0; i < N; i++) {
    const half = (N - i - 1) / 2;
    for (let u = -half; u <= half + 1e-6; u++) kinds[i * COLS + Math.floor(u + N / 2 + 1e-3)] = code(i, u);
  }

  const VS = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0., 1.); }`;

  const FS = `#version 300 es
precision highp float;
precision highp int;
uniform vec2 uRes;
uniform float uD;
uniform vec2 uO;
uniform vec3 uL;
uniform vec2 uSpot;
uniform vec2 uSpotS;
uniform float uFade;
uniform sampler2D uKind;
out vec4 o;
const int N = ${N};
const float LIFT = .95;

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * .1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

int kindAt(int i, float u) {
  if (i < 0 || i >= N) return 0;
  float c = floor(u + float(N) * .5 + .001);
  if (c < 0. || c > float(N)) return 0;
  return int(texelFetch(uKind, ivec2(int(c), i), 0).r * 255. + .5);
}

float surf(vec2 q, out vec3 n, out int kd, out float vr) {
  float p = uD * .8660254;
  float fi = floor((q.y - uO.y) / p);
  float best = 0.;
  n = vec3(0., 0., 1.);
  kd = -1;
  vr = 0.;
  for (int di = 0; di < 2; di++) {
    int i = int(fi) + di;
    float s = mod(float(N - 1 - i), 2.) > .5 ? .5 : 0.;
    float k = floor((q.x - uO.x) / uD - s + .5);
    float u = k + s;
    vec2 id = vec2(float(i), k);
    vec2 c = vec2(uO.x + u * uD, uO.y + float(i) * p) + (vec2(hash(id), hash(id + 19.19)) - .5) * .06 * uD;
    float r = .485 * uD * (1. + (hash(id + 7.7) - .5) * .06);
    int t = kindAt(i, u);
    float cz = r + ((t & 16) != 0 ? LIFT * uD : 0.) + (hash(id + 3.3) - .5) * .08 * uD;
    vec2 dv = q - c;
    float rr = dot(dv, dv);
    if (rr < r * r) {
      float dz = sqrt(r * r - rr);
      if (cz + dz > best) {
        best = cz + dz;
        n = vec3(dv / r, dz / r);
        kd = t;
        vr = hash(id + 11.1) * 2. - 1.;
      }
    }
  }
  return best;
}

float height(vec2 q) { vec3 n; int k; float v; return surf(q, n, k, v); }

vec3 albedo(int m) {
  if (m == 3) return vec3(.22398, .00169, .00777);
  if (m == 4) return vec3(.11015, 0., .00337);
  if (m == 5) return vec3(.16706, .00085, .00557);
  if (m == 6) return vec3(.16941, .09016, .04324);
  if (m == 7) return vec3(.0915, .04069, .01538);
  if (m == 8) return vec3(.13045, .06543, .02931);
  return vec3(.024, .024, .0235);
}

void main() {
  vec2 q = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec3 n; int kd; float vr;
  float h = surf(q, n, kd, vr);

  float tanE = uL.z / length(uL.xy);
  float tmax = (LIFT + 1.2) * uD / max(tanE - .28, .15);
  float vis = 0.;
  for (int a = 0; a < 2; a++) {
    float ang = atan(uL.y, uL.x) + (a == 0 ? -.1 : .1);
    vec2 ld = vec2(cos(ang), sin(ang));
    float hz = -9.;
    for (int s = 1; s <= 14; s++) {
      float t = .5 * pow(tmax / .5, float(s) / 14.);
      hz = max(hz, (height(q + ld * t) - h) / t);
    }
    vis += clamp(.5 + (tanE - hz) / .32, 0., 1.);
  }
  vis *= .5;

  float m1 = 0., m2 = 0.;
  for (int j = 0; j < 6; j++) {
    float a = float(j) * 1.0471976 + .5;
    vec2 dir = vec2(cos(a), sin(a));
    m1 += height(q + dir * .35 * uD);
    m2 += height(q + dir * 1.35 * uD);
  }
  float o1 = max(m1 / 6. - h, 0.) / uD;
  float o2 = max(m2 / 6. - h, 0.) / uD;
  float ao = exp(-(2.6 * o1 + 1.5 * o2));

  vec2 sp = (q - uSpot) / uSpotS;
  float spot = .012 + .988 * exp(-.5 * dot(sp, sp));
  vec3 alb = kd < 0 ? vec3(.012) : albedo(kd & 15);
  alb *= (1. + .12 * vr) * ((kd >= 0 && (kd & 32) != 0) ? .55 : 1.);
  float near = (kd >= 0 && (kd & 16) != 0) ? 1. : .78;
  float ndl = max(dot(n, uL), 0.);
  float ndh = max(dot(n, normalize(uL + vec3(0., 0., 1.))), 0.);
  float rim = pow(clamp(1. - n.z, 0., 1.), 2.2) * max(dot(n.xy, normalize(uL.xy)), 0.);
  float key = 3.1 * spot * vis * ndl * near;
  float fill = .16 * ao * (.35 + .65 * n.z) * (.12 + .88 * spot);
  float spec = .085 * spot * vis * pow(ndh, 30.) * near;
  float sheen = kd >= 0 ? .35 * spot * vis * rim * near : 0.;
  vec3 col = alb * (key + fill) + (spec + sheen * .12) * vec3(.92, .93, .95);
  col *= sqrt(ao);
  col = 1. - exp(-.85 * col);
  vec3 srgb = mix(col * 12.92, 1.055 * pow(col, vec3(1. / 2.4)) - .055, step(.0031308, col));
  vec3 bg = vec3(16., 17., 17.) / 255.;
  vec3 c = bg + srgb * (1. - bg);
  float y = q.y / uRes.y;
  c = bg + (c - bg) * smoothstep(0., uFade, y) * smoothstep(0., uFade, 1. - y);
  c += (hash(q + .5) - .5) / 255.;
  o = vec4(c, 1.);
}`;

  let program = null;
  let uni = {};
  let lost = false;

  function shader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn("relief shader:", gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  function init() {
    const vs = shader(gl.VERTEX_SHADER, VS);
    const fs = shader(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return false;
    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("relief program:", gl.getProgramInfoLog(program));
      return false;
    }
    gl.useProgram(program);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, COLS, N, 0, gl.RED, gl.UNSIGNED_BYTE, kinds);
    for (const p of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, p, gl.NEAREST);
    for (const p of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE);
    uni = {};
    for (const name of ["uRes", "uD", "uO", "uL", "uSpot", "uSpotS", "uFade", "uKind"]) uni[name] = gl.getUniformLocation(program, name);
    gl.uniform1i(uni.uKind, 0);
    return true;
  }

  // raspored: isti kao u znak_reljef.py (desktop traka i uži kadar za telefon)
  const L = { W: 1, H: 1, d: 1, p: 1, x0: 0, y0: 0, markW: 1, fade: .17, sx: .8 };
  function layout() {
    const cssW = Math.max(1, box.clientWidth);
    const cssH = Math.max(1, box.clientHeight);
    let scale = Math.min(2, Math.max(1.5, window.devicePixelRatio || 1));
    const budget = 3.2e6;
    if (cssW * cssH * scale * scale > budget) scale = Math.sqrt(budget / (cssW * cssH));
    L.W = Math.round(cssW * scale);
    L.H = Math.round(cssH * scale);
    canvas.width = L.W;
    canvas.height = L.H;
    const narrow = L.W / L.H < 3.2;
    const frac = narrow ? .62 : .58;
    L.sx = narrow ? 1 : .8;
    L.fade = narrow ? .15 : .17;
    L.d = frac * L.H / MARK_H;
    L.p = L.d * ROW;
    L.x0 = L.W / 2;
    L.y0 = L.H / 2 - (N - 1) * L.p / 2 - .012 * L.H;
    L.markW = N * L.d;
  }

  const rest = () => ({ ax: Math.cos(DEF_AZ), ay: Math.sin(DEF_AZ), el: DEF_EL, sx: -.08, sy: 0 });
  const cur = rest();
  const tgt = rest();

  function draw() {
    if (!program || lost) return;
    const len = Math.hypot(cur.ax, cur.ay) || 1;
    const ce = Math.cos(cur.el);
    gl.viewport(0, 0, L.W, L.H);
    gl.uniform2f(uni.uRes, L.W, L.H);
    gl.uniform1f(uni.uD, L.d);
    gl.uniform2f(uni.uO, L.x0, L.y0);
    gl.uniform3f(uni.uL, ce * cur.ax / len, ce * cur.ay / len, Math.sin(cur.el));
    gl.uniform2f(uni.uSpot, L.x0 + cur.sx * L.markW, L.y0 + (N - 1) * L.p * (.4 + cur.sy));
    gl.uniform2f(uni.uSpotS, L.sx * L.markW, .85 * MARK_H * L.d);
    gl.uniform1f(uni.uFade, L.fade);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  let visible = false;
  let hovering = false;
  let dirty = true;
  let frame = 0;
  let last = 0;

  function fromScroll() {
    Object.assign(tgt, rest());
    if (reducedMotion.matches) return;
    const box2 = box.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const t = Math.min(1, Math.max(0, (vh - box2.top) / (vh + box2.height))) - .5;
    const az = DEF_AZ + t * .9;
    tgt.ax = Math.cos(az);
    tgt.ay = Math.sin(az);
    tgt.sx = -.08 + t * .35;
  }

  function fromPointer(event) {
    const r = canvas.getBoundingClientRect();
    const px = (event.clientX - r.left) * L.W / r.width;
    const py = (event.clientY - r.top) * L.H / r.height;
    const vx = px - L.x0;
    const vy = py - (L.y0 + (N - 1) * L.p * .45);
    const dist = Math.hypot(vx, vy) || 1;
    const w = Math.min(1, Math.max(0, (dist - .1 * L.markW) / (.8 * L.markW)));
    const ax = Math.cos(DEF_AZ) * (1 - w) + vx / dist * w;
    const ay = Math.sin(DEF_AZ) * (1 - w) + vy / dist * w;
    const al = Math.hypot(ax, ay) || 1;
    tgt.ax = ax / al;
    tgt.ay = ay / al;
    const far = Math.min(1, dist / (1.6 * L.markW));
    tgt.el = (50 - 22 * far) * Math.PI / 180;
    tgt.sx = Math.max(-.7, Math.min(.7, -.08 + vx / L.markW * .3));
    tgt.sy = Math.max(-.25, Math.min(.25, vy / (MARK_H * L.d) * .25));
  }

  function tick(now) {
    frame = 0;
    const dt = last ? Math.min(.05, (now - last) / 1000) : 1 / 60;
    last = now;
    const k = 1 - Math.exp(-dt / .22);
    let moving = false;
    for (const key of ["ax", "ay", "el", "sx", "sy"]) {
      const delta = tgt[key] - cur[key];
      if (Math.abs(delta) > 4e-4) {
        cur[key] += delta * k;
        moving = true;
      } else {
        cur[key] = tgt[key];
      }
    }
    if (moving || dirty) {
      draw();
      if (dirty && !box.classList.contains("is-live")) box.classList.add("is-live");
      dirty = false;
    }
    if (moving) frame = requestAnimationFrame(tick);
    else last = 0;
  }

  function kick() {
    if (!frame && visible && !lost) frame = requestAnimationFrame(tick);
  }

  if (!init()) return;
  layout();
  fromScroll();
  Object.assign(cur, tgt);

  new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) kick();
  }, { rootMargin: "200px 0px" }).observe(box);

  new ResizeObserver(() => {
    layout();
    dirty = true;
    kick();
  }).observe(box);

  window.addEventListener("scroll", () => {
    if (!visible || hovering) return;
    fromScroll();
    kick();
  }, { passive: true });

  box.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch" || reducedMotion.matches) return;
    hovering = true;
    fromPointer(event);
    kick();
  });
  box.addEventListener("pointerleave", () => {
    hovering = false;
    fromScroll();
    kick();
  });
  reducedMotion.addEventListener("change", () => {
    fromScroll();
    kick();
  });

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    lost = true;
    box.classList.remove("is-live");
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  });
  canvas.addEventListener("webglcontextrestored", () => {
    lost = false;
    if (!init()) return;
    dirty = true;
    kick();
  });
})();
