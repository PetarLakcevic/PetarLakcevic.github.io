"use strict";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const header = document.querySelector(".masthead");
const seal = document.querySelector(".contact-seal");
const stories = document.querySelector(".stories");
const brandRelief = document.querySelector(".brand-relief");
const menuButton = document.querySelector(".menu-toggle");
const menu = document.getElementById("meni");
const contact = document.getElementById("kontakt-panel");
const opening = document.querySelector(".opening-art");
const compact = window.matchMedia("(max-width: 780px)");

function updateLayout() {
  header.classList.toggle("scrolled", window.scrollY > 48);
  const sealCenter = window.innerHeight - 20 - seal.offsetHeight / 2;
  const news = stories.getBoundingClientRect();
  const overStories = news.top <= sealCenter && news.bottom >= sealCenter;
  const nearLogo = brandRelief.getBoundingClientRect().top <= sealCenter;
  const readingOnPhone = compact.matches && opening.getBoundingClientRect().bottom < 90;
  seal.classList.toggle("tucked", overStories || nearLogo || readingOnPhone);
}

let layoutFrame = 0;
function scheduleLayout() {
  if (layoutFrame) return;
  layoutFrame = requestAnimationFrame(() => {
    layoutFrame = 0;
    updateLayout();
  });
}
window.addEventListener("scroll", scheduleLayout, { passive: true });
window.addEventListener("resize", scheduleLayout);
updateLayout();

function openPanel(dialog) {
  dialog.showModal();
  document.body.classList.add("modal-open");
  menuButton.setAttribute("aria-expanded", String(menu.open));
}

if (typeof contact.showModal === "function") {
  header.classList.add("has-menu");
  menuButton.hidden = false;
  menuButton.addEventListener("click", () => openPanel(menu));
  for (const link of document.querySelectorAll("[data-contact]")) {
    link.setAttribute("aria-haspopup", "dialog");
    link.setAttribute("aria-controls", contact.id);
    link.addEventListener("click", (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      openPanel(contact);
    });
  }
  for (const dialog of [menu, contact]) {
    dialog.querySelector("[data-close]").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
    });
    dialog.addEventListener("close", () => {
      document.body.classList.toggle("modal-open", Boolean(document.querySelector("dialog[open]")));
      menuButton.setAttribute("aria-expanded", String(menu.open));
    });
  }
  for (const link of menu.querySelectorAll("nav a")) {
    link.addEventListener("click", () => {
      menu.close();
      const section = document.getElementById(link.hash.slice(1));
      section.setAttribute("tabindex", "-1");
      section.focus({ preventScroll: true });
    });
  }
  window.matchMedia("(min-width: 781px)").addEventListener("change", (event) => {
    if (event.matches && menu.open) menu.close();
  });
}

const rail = document.querySelector(".story-rail");
const cards = Array.from(rail.children);
const railControls = document.querySelector(".rail-controls");
const previous = railControls.querySelector('[data-step="-1"]');
const next = railControls.querySelector('[data-step="1"]');
const count = railControls.querySelector(".rail-count");
let railTarget = null;
let activeCard = -1;
let stops = [];
let drag = null;
let suppressClick = false;

function nearestCard() {
  let nearest = 0;
  for (let i = 1; i < stops.length; i++) {
    if (Math.abs(stops[i] - rail.scrollLeft) < Math.abs(stops[nearest] - rail.scrollLeft)) nearest = i;
  }
  return nearest;
}

function updateRail() {
  if (railTarget !== null && Math.abs(stops[railTarget] - rail.scrollLeft) < 2) railTarget = null;
  const current = railTarget ?? nearestCard();
  if (current === activeCard) return;
  if (activeCard >= 0) cards[activeCard].removeAttribute("aria-current");
  activeCard = current;
  cards[current].setAttribute("aria-current", "true");
  const label = String(activeCard + 1).padStart(2, "0") + " / " + String(cards.length).padStart(2, "0");
  if (count.textContent !== label) count.textContent = label;
  previous.disabled = activeCard === 0;
  next.disabled = activeCard === cards.length - 1;
}

function measureRail() {
  const end = rail.scrollWidth - rail.clientWidth;
  const center = rail.getBoundingClientRect().left + rail.clientWidth / 2;
  stops = cards.map((card) => {
    const box = card.getBoundingClientRect();
    return Math.max(0, Math.min(end, rail.scrollLeft + box.left + box.width / 2 - center));
  });
  if (activeCard >= 0) rail.scrollTo({ left: stops[activeCard], behavior: "instant" });
  railTarget = null;
  railControls.hidden = end < 2;
  rail.classList.toggle("can-drag", end >= 2);
  updateRail();
}

function selectCard(index) {
  railTarget = Math.max(0, Math.min(cards.length - 1, index));
  rail.scrollTo({ left: stops[railTarget], behavior: reducedMotion.matches ? "instant" : "smooth" });
  updateRail();
}

for (const button of [previous, next]) {
  button.addEventListener("click", () => selectCard(activeCard + Number(button.dataset.step)));
}
rail.addEventListener("keydown", (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const keys = { ArrowLeft: activeCard - 1, ArrowRight: activeCard + 1, Home: 0, End: cards.length - 1 };
  if (!Object.hasOwn(keys, event.key)) return;
  event.preventDefault();
  selectCard(keys[event.key]);
  if (event.target !== rail) cards[activeCard].querySelector("a").focus({ preventScroll: true });
});
rail.addEventListener("focusin", (event) => {
  const card = event.target.closest("li");
  if (card && event.target.matches(":focus-visible")) selectCard(cards.indexOf(card));
});
rail.addEventListener("wheel", () => { railTarget = null; }, { passive: true });
rail.addEventListener("pointerdown", (event) => {
  railTarget = null;
  suppressClick = false;
  if (event.pointerType !== "mouse" || event.button !== 0 || !event.target.closest(".story-photo")) return;
  if (event.ctrlKey || event.shiftKey || event.metaKey || event.altKey) return;
  drag = { id: event.pointerId, x: event.clientX, left: rail.scrollLeft, index: nearestCard(), moving: false };
});
rail.addEventListener("dragstart", (event) => {
  if (drag) event.preventDefault();
});
rail.addEventListener("pointermove", (event) => {
  if (!drag || event.pointerId !== drag.id) return;
  const distance = drag.x - event.clientX;
  if (!drag.moving) {
    if (Math.abs(distance) < 7) return;
    drag.moving = true;
    rail.setPointerCapture(drag.id);
    rail.classList.add("is-dragging");
  }
  rail.scrollLeft = drag.left + distance;
});
rail.addEventListener("pointerleave", () => {
  if (drag && !drag.moving) drag = null;
});
function finishDrag(event) {
  if (!drag || event.pointerId !== drag.id) return;
  const gesture = drag;
  drag = null;
  if (!gesture.moving) return;
  let destination = nearestCard();
  const distance = gesture.x - event.clientX;
  if (event.type === "pointerup" && destination === gesture.index && Math.abs(distance) > 55) {
    destination += Math.sign(distance);
  }
  suppressClick = event.type === "pointerup";
  rail.classList.remove("is-dragging");
  if (rail.hasPointerCapture(gesture.id)) rail.releasePointerCapture(gesture.id);
  selectCard(destination);
}
rail.addEventListener("pointerup", finishDrag);
rail.addEventListener("pointercancel", finishDrag);
rail.addEventListener("lostpointercapture", finishDrag);
rail.addEventListener("click", (event) => {
  if (suppressClick && event.detail > 0) {
    event.preventDefault();
    suppressClick = false;
  }
}, true);
rail.addEventListener("scroll", updateRail, { passive: true });
new ResizeObserver(measureRail).observe(rail);
measureRail();
