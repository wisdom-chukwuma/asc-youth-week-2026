// Custom "Add to Home Screen" prompt — Chrome/Android will eventually
// show its own mini-infobar, but that's slow and easy to miss. iOS
// Safari never fires beforeinstallprompt at all, so it needs its own
// instructional copy instead of a working button.
const DISMISS_KEY = "wtk-install-dismissed";

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function initInstallBanner() {
  const banner = document.getElementById("install-banner");
  if (!banner || isStandalone()) return;

  let dismissed = false;
  try { dismissed = localStorage.getItem(DISMISS_KEY) === "1"; } catch (e) { /* private mode — just don't persist */ }
  if (dismissed) return;

  const sub = document.getElementById("install-banner-sub");
  const actionBtn = document.getElementById("install-banner-action");
  const dismissBtn = document.getElementById("install-banner-dismiss");
  const modals = ["onboarding", "squad-reveal"].map((id) => document.getElementById(id)).filter(Boolean);
  let deferredPrompt = null;
  let wantsToShow = false;

  // Never surface the install pitch over onboarding/squad-reveal — wait
  // until both are dismissed, however long that takes.
  const aModalIsOpen = () => modals.some((m) => !m.hidden);
  const reveal = () => { if (wantsToShow && !aModalIsOpen()) banner.hidden = false; };
  const show = () => { wantsToShow = true; reveal(); };
  const hide = () => { wantsToShow = false; banner.hidden = true; };

  modals.forEach((m) => {
    new MutationObserver(() => reveal()).observe(m, { attributes: true, attributeFilter: ["hidden"] });
  });

  dismissBtn.addEventListener("click", () => {
    hide();
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch (e) { /* fine, just re-shows next visit */ }
  });

  if (isIos()) {
    sub.textContent = "Tap the Share icon, then “Add to Home Screen.”";
    setTimeout(show, 4000);
    return;
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    actionBtn.hidden = false;
    show();
  });

  actionBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    actionBtn.disabled = true;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    hide();
  });

  window.addEventListener("appinstalled", hide);
}
