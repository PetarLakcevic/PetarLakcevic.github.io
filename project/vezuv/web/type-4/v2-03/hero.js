// Uvodna slika: <img> se odmah prikaže, a ovdje se ista SVG slika ugradi u stranicu da bi fasete
// reagovale na miš (stilovi su u style.css, blok "Poligon"). Isječak prati object-fit: cover i
// object-position slike, pa izgleda isto kao <img> na svakoj širini.
(() => {
  const box = document.querySelector(".opening-art");
  const img = box && box.querySelector("img");
  if (!box || !img || !window.fetch || !window.DOMParser) return;

  fetch(img.currentSrc || img.src)
    .then((r) => (r.ok ? r.text() : Promise.reject(r.status)))
    .then((text) => {
      const doc = new DOMParser().parseFromString(text, "image/svg+xml");
      const svg = doc.documentElement;
      if (!svg || svg.nodeName.toLowerCase() !== "svg") return;
      const [, , W, H] = (svg.getAttribute("viewBox") || "").split(/\s+/).map(Number);
      if (!W || !H) return;
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.setAttribute("class", "hero-svg");
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", img.alt);
      const live = document.importNode(svg, true);

      const fit = () => {
        const cw = box.clientWidth;
        const ch = box.clientHeight;
        if (!cw || !ch) return;
        const pos = getComputedStyle(img).objectPosition.split(/\s+/);
        const px = parseFloat(pos[0]) / 100 || 0.5;
        const py = parseFloat(pos[1]) / 100 || 0.5;
        const s = Math.max(cw / W, ch / H);
        const vw = cw / s;
        const vh = ch / s;
        live.setAttribute("viewBox", `${((W - vw) * px).toFixed(2)} ${((H - vh) * py).toFixed(2)} ${vw.toFixed(2)} ${vh.toFixed(2)}`);
      };
      fit();
      box.appendChild(live);
      img.hidden = true;

      // Grotlo: miš nad fasetama kratera (.z) pušta poligonalni dim; kad ode, dim se još malo diže pa nestane.
      if (live.querySelector(".dim-skup")) {
        let gasi = 0;
        const uGrotlu = (el) => !!(el && el.closest && el.closest(".z"));
        live.addEventListener("pointerover", (e) => {
          if (!uGrotlu(e.target)) return;
          clearTimeout(gasi);
          live.classList.add("dimi");
        });
        live.addEventListener("pointerout", (e) => {
          if (!uGrotlu(e.target) || uGrotlu(e.relatedTarget)) return;
          clearTimeout(gasi);
          gasi = setTimeout(() => live.classList.remove("dimi"), 2200);
        });
      }
      if (window.ResizeObserver) new ResizeObserver(fit).observe(box);
      else window.addEventListener("resize", fit);
    })
    .catch(() => {});
})();
