// Centralized back-navigation. Every full-screen view (a non-home tab, the
// reel overlay, its comment drawer, the lightbox, the squad-reveal modal)
// pushes one history entry when it opens. The device/browser back button
// then closes exactly one of those instead of leaving the site — because
// without this, the very first back press has nowhere to go but out.
let navState = { tab: "home" };
const listeners = new Set();

function notify() {
  listeners.forEach((fn) => fn(navState));
}

export function initNav() {
  history.replaceState(navState, "");
  window.addEventListener("popstate", (e) => {
    navState = e.state || { tab: "home" };
    notify();
  });
}

// Called with the current nav state immediately, then again on every change.
export function onNavChange(fn) {
  listeners.add(fn);
}

export function currentNavState() {
  return navState;
}

export function goToTab(tab) {
  if (navState.tab === tab && !navState.overlay) return;
  navState = { tab };
  history.pushState(navState, "");
  notify();
}

// key: "squadReveal" | "reel" | "lightbox". extra can add flags like { drawer: true }.
export function openOverlay(key, extra = {}) {
  navState = { tab: navState.tab, overlay: key, ...extra };
  history.pushState(navState, "");
  notify();
}

// Always goes back exactly one level — used by every in-app back/close
// control so hardware back and on-screen back behave identically.
export function closeOverlay() {
  history.back();
}
