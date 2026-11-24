"use strict";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const header = document.querySelector(".masthead");
const seal = document.querySelector(".contact-seal");
const stories = document.querySelector(".stories");
const branches = document.querySelector(".branches");
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
  const shops = branches.getBoundingClientRect();
  const overBranches = shops.top <= sealCenter && shops.bottom >= sealCenter;
  const nearLogo = brandRelief.getBoundingClientRect().top <= sealCenter;
  const readingOnPhone = compact.matches && opening.getBoundingClientRect().bottom < 90;
  seal.classList.toggle("tucked", overStories || overBranches || nearLogo || readingOnPhone);
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
let measuredWidth = 0;
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
  if (railControls.hidden || rail.clientWidth !== measuredWidth) return;
  if (railTarget !== null && Math.abs(stops[railTarget] - rail.scrollLeft) < 2) railTarget = null;
  const current = railTarget ?? nearestCard();
  if (current === activeCard && cards[current].hasAttribute("aria-current")) return;
  if (activeCard >= 0) cards[activeCard].removeAttribute("aria-current");
  activeCard = current;
  cards[current].setAttribute("aria-current", "true");
  const label = String(activeCard + 1).padStart(2, "0") + " / " + String(cards.length).padStart(2, "0");
  if (count.textContent !== label) count.textContent = label;
  previous.disabled = activeCard === 0;
  next.disabled = activeCard === cards.length - 1;
}

function measureRail() {
  measuredWidth = rail.clientWidth;
  const end = rail.scrollWidth - measuredWidth;
  railTarget = null;
  railControls.hidden = end < 2;
  rail.tabIndex = railControls.hidden ? -1 : 0;
  rail.classList.toggle("can-drag", end >= 2);
  if (railControls.hidden) {
    cards[activeCard]?.removeAttribute("aria-current");
    return;
  }
  const leftEdges = cards.map(card => card.getBoundingClientRect().left);
  // Match native swipe stops to the buttons, even when several whole cards fit.
  stops = cards.map((card, index) => {
    const target = end * index / Math.max(1, cards.length - 1);
    const margin = leftEdges[index] - leftEdges[0] - target;
    card.style.scrollMarginInlineStart = Math.max(0, margin) + "px";
    return target;
  });
  const focusedCard = rail.querySelector(".story-card:focus-visible")?.closest("li");
  railTarget = focusedCard ? cards.indexOf(focusedCard) : Math.max(0, activeCard);
  rail.scrollTo({ left: stops[railTarget], behavior: "instant" });
  updateRail();
}

function selectCard(index) {
  if (railControls.hidden) return;
  railTarget = Math.max(0, Math.min(cards.length - 1, index));
  rail.scrollTo({ left: stops[railTarget], behavior: reducedMotion.matches ? "instant" : "smooth" });
  updateRail();
}

for (const button of [previous, next]) {
  button.addEventListener("click", () => selectCard(activeCard + Number(button.dataset.step)));
}
rail.addEventListener("keydown", (event) => {
  if (railControls.hidden || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
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
  if (railControls.hidden || event.pointerType !== "mouse" || event.button !== 0 || !event.target.closest(".story-photo")) return;
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
