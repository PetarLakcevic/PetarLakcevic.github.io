// "O grupi": brojevi sa data-broj odbroje od nule kad prvi put uđu u ekran (bez toga stoje gotovi).
(() => {
  const els = [...document.querySelectorAll("[data-broj]")];
  if (!els.length || !("IntersectionObserver" in window)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const run = (el) => {
    const to = Number(el.dataset.broj);
    const t0 = performance.now();
    const dur = 900 + Math.min(700, to * 2.5);
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      el.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      run(e.target);
    }
  }, { threshold: 0.6 });
  for (const el of els) {
    if (el.getBoundingClientRect().top < window.innerHeight) continue;   // već vidljiv: ostaje kakav jeste
    el.textContent = "0";
    io.observe(el);
  }
})();
