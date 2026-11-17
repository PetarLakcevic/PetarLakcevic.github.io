/* Vezuv d.o.o. – site behaviour. No dependencies. */
(() => {
  const doc = document.documentElement;
  doc.classList.add('js');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Header: solid background once the page scrolls. */
  const header = document.querySelector('.site-header');
  const onScroll = () => header && header.classList.toggle('is-scrolled', window.scrollY > 24);
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });

  /* Mobile menu */
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.getElementById('mobile-nav');
  if (toggle && menu) {
    const setMenu = (open) => {
      document.body.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Zatvori meni' : 'Otvori meni');
      menu.inert = !open;
    };
    setMenu(false);
    toggle.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
    addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('menu-open')) { setMenu(false); toggle.focus(); }
    });
    matchMedia('(min-width: 1181px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  }

  /* Reveal on scroll */
  const revealables = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealables.forEach((el) => io.observe(el));
  } else {
    revealables.forEach((el) => el.classList.add('is-in'));
  }

  /* Count-up for key figures. The final number is already in the markup. */
  const counters = document.querySelectorAll('[data-count]');
  if ('IntersectionObserver' in window && !reduceMotion && counters.length) {
    const run = (el) => {
      const target = Number(el.dataset.count);
      const start = performance.now();
      const dur = 1400;
      const tick = (now) => {
        const p = Math.min(1, (now - start) / dur);
        el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const co = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) { run(entry.target); co.unobserve(entry.target); } });
    }, { threshold: 0.6 });
    counters.forEach((el) => co.observe(el));
  }

  /* News archive: filter by year */
  document.querySelectorAll('[data-filter]').forEach((group) => {
    const target = document.querySelector(group.dataset.filter);
    const chips = group.querySelectorAll('.chip');
    chips.forEach((chip) => chip.addEventListener('click', () => {
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      const year = chip.dataset.year;
      target.querySelectorAll('[data-year]').forEach((g) => { g.hidden = !(year === 'all' || g.dataset.year === year); });
    }));
  });

  /* Contact form. Not connected to a server yet: see README. */
  const form = document.querySelector('.js-contact');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      form.classList.add('is-sent');
      form.reset();
      const note = form.querySelector('.form__note');
      if (note) note.focus();
    });
  }
})();
