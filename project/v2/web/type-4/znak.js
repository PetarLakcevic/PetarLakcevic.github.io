"use strict";

// Prekidač znaka u zaglavlju: osnovni znak Reljefa ("1") ili znak iz brandbooka 03 ("03").
// Izbor se pamti u pregledaču i važi i na stranicama priča; ?znak=03 ili ?znak=1 u adresi ga postavlja.
// Skripta u <head> postavlja data-znak prije crtanja, pa nema treptaja starog znaka.
(() => {
  const KEY = "vezuv-reljef-znak";
  const root = document.documentElement;
  const icon = document.querySelector('link[rel="icon"]');
  const iconDir = icon ? icon.getAttribute("href").replace(/znak(-03)?\.svg$/, "") : "";
  const buttons = Array.from(document.querySelectorAll(".znak-switch [data-pick]"));
  const current = () => (root.dataset.znak === "03" ? "03" : "1");

  function apply(z, announce) {
    if (z === "03") root.dataset.znak = "03";
    else delete root.dataset.znak;
    for (const b of buttons) {
      const on = b.dataset.pick === z;
      b.setAttribute("aria-checked", String(on));
      b.tabIndex = on ? 0 : -1;
    }
    if (icon) icon.setAttribute("href", iconDir + (z === "03" ? "znak-03.svg" : "znak.svg"));
    if (announce) document.dispatchEvent(new CustomEvent("znak", { detail: z }));
  }

  function pick(z) {
    if (z === current()) return;
    try {
      localStorage.setItem(KEY, z);
    } catch (e) {}
    apply(z, true);
  }

  apply(current(), false);
  for (const b of buttons) {
    b.addEventListener("click", () => pick(b.dataset.pick));
    b.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
      event.preventDefault();
      const other = buttons.find((x) => x !== b);
      pick(other.dataset.pick);
      other.focus();
    });
  }

  // izbor iz druge kartice (npr. stranica priče otvorena pored naslovne)
  window.addEventListener("storage", (event) => {
    if (event.key !== KEY || (event.newValue !== "03" && event.newValue !== "1") || event.newValue === current()) return;
    apply(event.newValue, true);
  });
})();
