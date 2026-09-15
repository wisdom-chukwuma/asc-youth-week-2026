import {
  db, whenReady, doc, getDoc, setDoc, onSnapshot, runTransaction,
  serverTimestamp, increment, arrayUnion
} from "./firebase-config.js";
import { SCHEDULE, POINTS, squadFor, todaySchedule, nextSession } from "./data.js";
import { state, setProfile, onProfileChange, showToast } from "./state.js";
import { initEngage } from "./engage.js";
import { initBoard } from "./board.js";
import { initWall } from "./wall.js";
import { initSignatureBoard } from "./signature.js";
import { initGallery } from "./gallery.js";
import { initLightbox } from "./lightbox.js";
import { shareDayCard } from "./card.js";
import { initNotifications } from "./notifications.js";
import { initInstallBanner } from "./install-banner.js";
import { initNav, onNavChange, goToTab, openOverlay, closeOverlay } from "./nav.js";
import { initQuests } from "./quests.js";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => { /* offline shell + push just won't be available */ });
  });
}

const el = {};

function cacheDom() {
  el.onboarding = document.getElementById("onboarding");
  el.nicknameInput = document.getElementById("nickname-input");
  el.onboardingSubmit = document.getElementById("onboarding-submit");
  el.squadReveal = document.getElementById("squad-reveal");
  el.squadRevealBadge = document.getElementById("squad-reveal-badge");
  el.squadRevealName = document.getElementById("squad-reveal-name");
  el.squadRevealClose = document.getElementById("squad-reveal-close");

  el.meChip = document.getElementById("me-chip");
  el.meName = document.getElementById("me-name");
  el.mePoints = document.getElementById("me-points");
  el.meSquadDot = document.getElementById("me-squad-dot");

  el.countdownLabel = document.getElementById("countdown-label");
  el.countdownTitle = document.getElementById("countdown-title");
  el.countdownSub = document.getElementById("countdown-sub");
  el.countdownTime = document.getElementById("countdown-time");
  el.checkinBtn = document.getElementById("checkin-btn");
  el.checkinStatus = document.getElementById("checkin-status");
  el.shareCardBtn = document.getElementById("share-card-btn");

  el.scheduleList = document.getElementById("schedule-list");

  el.tabBtns = [...document.querySelectorAll(".tab-btn")];
  el.tabs = { home: document.getElementById("tab-home"), schedule: document.getElementById("tab-schedule"),
    engage: document.getElementById("tab-engage"), board: document.getElementById("tab-board"),
    wall: document.getElementById("tab-wall") };
}

function applyTab(name) {
  state.currentTab = name;
  Object.entries(el.tabs).forEach(([key, section]) => { section.hidden = key !== name; });
  el.tabBtns.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.tab === name));
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

function wireTabs() {
  el.tabBtns.forEach((btn) => btn.addEventListener("click", () => goToTab(btn.dataset.tab)));
  el.meChip.addEventListener("click", () => goToTab("board"));
}

function wireWallSubnav() {
  const btns = [...document.querySelectorAll(".wall-subnav-btn")];
  const sections = {
    gallery: document.getElementById("wallsub-gallery"),
    photos: document.getElementById("wallsub-photos"),
    board: document.getElementById("wallsub-board"),
    shoutouts: document.getElementById("wallsub-shoutouts")
  };
  btns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.wallsub;
      Object.entries(sections).forEach(([k, el2]) => { if (el2) el2.hidden = k !== key; });
      btns.forEach((b) => b.classList.toggle("is-active", b === btn));
    });
  });
}

function showOnboarding() { el.onboarding.hidden = false; }
function hideOnboarding() { el.onboarding.hidden = true; }

function showSquadReveal(squad) {
  el.squadRevealBadge.innerHTML = `<i class="ph ph-${squad.icon}"></i>`;
  el.squadRevealBadge.style.background = squad.color;
  el.squadRevealName.textContent = `Team ${squad.name}`;
  el.squadRevealName.style.color = squad.color;
  el.squadReveal.hidden = false;
  openOverlay("squadReveal");
}

function wireOnboarding(authReadyPromise) {
  el.onboardingSubmit.addEventListener("click", async () => {
    const nickname = el.nicknameInput.value.trim();
    if (!nickname) { el.nicknameInput.focus(); return; }
    el.onboardingSubmit.disabled = true;
    el.onboardingSubmit.textContent = "One sec…";
    try {
      // Anonymous sign-in may still be in flight if this is clicked
      // fast (or on a slow connection) — wait for the same promise
      // main() is waiting on rather than assuming state.uid is set.
      const user = await authReadyPromise;
      state.uid = user.uid;
      const squad = squadFor(state.uid);
      const profileData = {
        nickname, squad: squad.id, points: 0,
        checkinDays: [], pollDays: [], reflectionDays: [],
        photoCounts: {}, shoutoutCounts: {}, bonusAwarded: false,
        createdAt: serverTimestamp()
      };
      await setDoc(doc(db, "profiles", state.uid), profileData);
      setProfile(profileData);
      hideOnboarding();
      showSquadReveal(squad);
    } catch (e) {
      showToast("Couldn't save — check your connection and try again");
      el.onboardingSubmit.disabled = false;
      el.onboardingSubmit.textContent = "Enter Youth Week";
    }
  });
  el.squadRevealClose.addEventListener("click", () => closeOverlay());
}

function wireShareCard() {
  const label = el.shareCardBtn.querySelector(".action-tile-label");
  const originalText = label.textContent;
  el.shareCardBtn.addEventListener("click", async () => {
    const dayInfo = todaySchedule() || SCHEDULE.find((d) => new Date(d.sessions[0].start) > new Date()) || SCHEDULE[SCHEDULE.length - 1];
    el.shareCardBtn.disabled = true;
    label.textContent = "Preparing…";
    try {
      await shareDayCard(dayInfo, state.profile);
    } catch (e) {
      showToast("Couldn't create the card — try again");
    } finally {
      el.shareCardBtn.disabled = false;
      label.textContent = originalText;
    }
  });
}

function renderMeChip() {
  if (!state.profile) return;
  el.meName.textContent = state.profile.nickname;
  el.mePoints.textContent = `${state.profile.points || 0} pts`;
  const squad = squadFor(state.uid);
  el.meSquadDot.style.background = squad.color;
}

function pad2(n) { return String(n).padStart(2, "0"); }

function formatDuration(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (days > 0) return `${days}d ${pad2(hours)}:${pad2(mins)}:${pad2(secs)}`;
  return `${pad2(hours)}:${pad2(mins)}:${pad2(secs)}`;
}

function formatClock(date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function updateCountdown() {
  const session = nextSession();
  if (!session) {
    el.countdownLabel.textContent = "Youth Week 2026";
    el.countdownTitle.textContent = "That's a wrap!";
    el.countdownSub.textContent = "Thank you for anticipating with us. See you next year.";
    el.countdownTime.textContent = "";
  } else {
    const now = new Date();
    const start = new Date(session.start);
    const end = new Date(session.end);
    const isLive = now >= start && now <= end;
    el.countdownLabel.textContent = isLive ? "Happening now" : "Next up";
    el.countdownTitle.textContent = session.title;
    el.countdownSub.textContent = `${session.blurb} · Day ${session.day} · ${session.label} ${session.dateLabel}`;
    const target = isLive ? end : start;
    el.countdownTime.textContent = isLive ? `Ends in ${formatDuration(target - now)}` : formatDuration(target - now);
  }
  updateCheckinButton();
}

function updateCheckinButton() {
  if (!state.profile) {
    el.checkinBtn.disabled = true;
    el.checkinBtn.textContent = "Loading…";
    return;
  }
  const dayInfo = todaySchedule();
  if (!dayInfo) {
    el.checkinBtn.disabled = true;
    el.checkinBtn.textContent = "No event today";
    el.checkinStatus.textContent = "";
    return;
  }
  const day = dayInfo.day;
  if (state.profile.checkinDays?.includes(day)) {
    el.checkinBtn.disabled = true;
    el.checkinBtn.textContent = `Checked in for Day ${day} ✓`;
    el.checkinStatus.textContent = "";
    return;
  }
  const starts = dayInfo.sessions.map((s) => new Date(s.start).getTime());
  const ends = dayInfo.sessions.map((s) => new Date(s.end).getTime());
  const windowStart = new Date(Math.min(...starts) - 30 * 60000);
  const windowEnd = new Date(Math.max(...ends) + 30 * 60000);
  const now = new Date();

  if (now < windowStart) {
    el.checkinBtn.disabled = true;
    el.checkinBtn.textContent = `Check-in opens ${formatClock(windowStart)}`;
    el.checkinStatus.textContent = "";
  } else if (now > windowEnd) {
    el.checkinBtn.disabled = true;
    el.checkinBtn.textContent = "Check-in window closed";
    el.checkinStatus.textContent = "";
  } else {
    el.checkinBtn.disabled = false;
    el.checkinBtn.textContent = "I'm here — check in";
    el.checkinStatus.textContent = `+${POINTS.checkin} pts for today`;
  }
}

async function handleCheckin() {
  const dayInfo = todaySchedule();
  if (!dayInfo || !state.uid || !state.profile) return;
  if (state.profile.checkinDays?.includes(dayInfo.day)) return;

  const day = dayInfo.day;
  const checkinRef = doc(db, "checkins", `d${day}_${state.uid}`);
  const profileRef = doc(db, "profiles", state.uid);
  const squadRef = doc(db, "squadTotals", state.profile.squad);

  el.checkinBtn.disabled = true;
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(checkinRef);
      if (snap.exists()) return;
      tx.set(checkinRef, {
        day, uid: state.uid, nickname: state.profile.nickname,
        squad: state.profile.squad, createdAt: serverTimestamp()
      });
      tx.update(profileRef, { points: increment(POINTS.checkin), checkinDays: arrayUnion(day) });
      tx.set(squadRef, { squad: state.profile.squad, points: increment(POINTS.checkin) }, { merge: true });
    });
    showToast(`+${POINTS.checkin} pts — checked in for Day ${day}!`);
    maybeAwardWeekBonus();
  } catch (e) {
    showToast("Couldn't check in — try again");
  } finally {
    updateCheckinButton();
  }
}

async function maybeAwardWeekBonus() {
  const profileRef = doc(db, "profiles", state.uid);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(profileRef);
      const data = snap.data();
      if (!data || data.bonusAwarded) return;
      if ((data.checkinDays || []).length < SCHEDULE.length) return;
      tx.update(profileRef, { points: increment(POINTS.fullWeekBonus), bonusAwarded: true });
    });
  } catch (e) { /* non-critical, silent */ }
}

function renderSchedule() {
  const today = todaySchedule();
  const todayKey = today ? today.date : null;
  const now = new Date();
  el.scheduleList.innerHTML = "";

  SCHEDULE.forEach((d) => {
    const isToday = d.date === todayKey;
    const isPast = new Date(d.sessions[d.sessions.length - 1].end) < now && !isToday;
    const checkedIn = state.profile?.checkinDays?.includes(d.day);

    const card = document.createElement("div");
    card.className = "glass day-card" + (isToday ? " is-today" : "") + (isPast ? " is-past" : "");

    const sessionsHtml = d.sessions.map((s) => {
      const start = new Date(s.start);
      const end = new Date(s.end);
      return `<div class="session-row">
        <span class="session-icon"><i class="ph ph-${s.icon}"></i></span>
        <div class="session-info">
          <p class="session-title">${s.title}</p>
          <p class="session-blurb">${s.blurb}</p>
        </div>
        <span class="session-time">${formatClock(start)}–${formatClock(end)}</span>
      </div>`;
    }).join("");

    card.innerHTML = `
      <div class="day-card-head">
        <span class="day-card-num">DAY 0${d.day} · ${d.label.toUpperCase()}</span>
        <span class="day-card-date">${d.dateLabel}</span>
      </div>
      ${sessionsHtml}
      ${checkedIn ? '<div class="day-card-check">✓ Checked in</div>' : ""}
    `;
    el.scheduleList.appendChild(card);
  });
}

async function resolveProfile() {
  const profileRef = doc(db, "profiles", state.uid);
  const snap = await getDoc(profileRef);
  if (snap.exists()) {
    setProfile(snap.data());
    hideOnboarding();
  } else {
    showOnboarding();
  }
  onSnapshot(profileRef, (s) => { if (s.exists()) setProfile(s.data()); });
}

async function main() {
  cacheDom();
  initNav();
  onNavChange((navState) => {
    if (navState.tab) applyTab(navState.tab);
    el.squadReveal.hidden = navState.overlay !== "squadReveal";
  });
  wireTabs();
  wireWallSubnav();
  wireShareCard();
  el.checkinBtn.addEventListener("click", handleCheckin);

  onProfileChange(() => { renderMeChip(); renderSchedule(); updateCheckinButton(); });
  renderSchedule();
  setInterval(updateCountdown, 1000);
  updateCountdown();

  // Kick off anonymous sign-in immediately so it isn't delayed by the
  // rest of setup, but don't touch Firestore anywhere until it resolves —
  // a listener started before auth completes gets a terminal
  // permission-denied that never recovers, even after sign-in finishes.
  const authReady = whenReady();
  wireOnboarding(authReady);

  const user = await authReady;
  state.uid = user.uid;
  await resolveProfile();

  initQuests();
  initEngage();
  initBoard();
  initLightbox();
  initWall();
  initGallery();
  initSignatureBoard();
  initNotifications();
  initInstallBanner();
}

main();
