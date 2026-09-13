import {
  db, doc, runTransaction, serverTimestamp, increment, arrayUnion,
  collection, query, where, onSnapshot
} from "./firebase-config.js";
import { ENGAGE, POINTS, SCHEDULE, todaySchedule } from "./data.js";
import { state, showToast, onProfileChange } from "./state.js";

export function initEngage() {
  const dayLabel = document.getElementById("engage-day-label");
  const pollQ = document.getElementById("engage-poll-question");
  const pollOptionsEl = document.getElementById("engage-poll-options");
  const pollResultsEl = document.getElementById("engage-poll-results");
  const reflectionQ = document.getElementById("engage-reflection-question");
  const reflectionInput = document.getElementById("engage-reflection-input");
  const reflectionSubmit = document.getElementById("engage-reflection-submit");
  const reflectionStatus = document.getElementById("engage-reflection-status");

  let unsubTally = null;
  let renderedDay = null;

  function render() {
    if (!state.profile) return;
    const dayInfo = todaySchedule();
    const day = dayInfo ? dayInfo.day : null;

    if (!day || !ENGAGE[day]) {
      dayLabel.textContent = "No live session today";
      pollQ.textContent = "Check back on an event day — 6pm most nights.";
      pollOptionsEl.innerHTML = "";
      pollOptionsEl.hidden = false;
      pollResultsEl.hidden = true;
      reflectionQ.textContent = "";
      reflectionInput.hidden = true;
      reflectionSubmit.hidden = true;
      if (unsubTally) { unsubTally(); unsubTally = null; }
      renderedDay = null;
      return;
    }

    const content = ENGAGE[day];
    const dayMeta = SCHEDULE.find((d) => d.day === day);
    dayLabel.textContent = `Day ${day} · ${dayMeta.label}`;
    pollQ.textContent = content.poll;
    reflectionQ.textContent = content.reflection;
    reflectionInput.hidden = false;
    reflectionSubmit.hidden = false;

    const alreadyPolled = state.profile.pollDays?.includes(day);
    renderPollOptions(day, content, alreadyPolled);
    if (renderedDay !== day) {
      subscribeTally(day, content);
      renderedDay = day;
    }

    const alreadyReflected = state.profile.reflectionDays?.includes(day);
    if (alreadyReflected) {
      reflectionInput.disabled = true;
      reflectionSubmit.disabled = true;
      reflectionStatus.textContent = "Thanks — you've shared today's reflection.";
    } else {
      reflectionInput.disabled = false;
      reflectionSubmit.disabled = false;
      reflectionStatus.textContent = "";
    }
  }

  function renderPollOptions(day, content, alreadyPolled) {
    if (alreadyPolled) {
      pollOptionsEl.hidden = true;
      pollResultsEl.hidden = false;
      return;
    }
    pollOptionsEl.hidden = false;
    pollResultsEl.hidden = true;
    pollOptionsEl.innerHTML = "";
    content.options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "poll-option-btn";
      btn.textContent = opt;
      btn.addEventListener("click", () => castVote(day, opt));
      pollOptionsEl.appendChild(btn);
    });
  }

  async function castVote(day, option) {
    if (!state.uid || !state.profile || state.profile.pollDays?.includes(day)) return;
    const voteRef = doc(db, "pollVotes", `d${day}_${state.uid}`);
    const profileRef = doc(db, "profiles", state.uid);
    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(voteRef);
        if (snap.exists()) return;
        tx.set(voteRef, { day, uid: state.uid, option, createdAt: serverTimestamp() });
        tx.update(profileRef, { points: increment(POINTS.poll), pollDays: arrayUnion(day) });
      });
      showToast(`+${POINTS.poll} pts — vibe logged`);
      pollOptionsEl.hidden = true;
      pollResultsEl.hidden = false;
    } catch (e) {
      showToast("Couldn't submit — try again");
    }
  }

  function subscribeTally(day, content) {
    if (unsubTally) unsubTally();
    const q = query(collection(db, "pollVotes"), where("day", "==", day));
    unsubTally = onSnapshot(q, (snap) => {
      const counts = {};
      content.options.forEach((o) => (counts[o] = 0));
      snap.forEach((docSnap) => {
        const o = docSnap.data().option;
        if (o in counts) counts[o]++;
      });
      const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
      pollResultsEl.innerHTML = "";
      content.options.forEach((o) => {
        const pct = Math.round((counts[o] / total) * 100);
        const row = document.createElement("div");
        row.className = "poll-result-row";
        row.innerHTML =
          `<div class="poll-result-label"><span>${o}</span><span>${counts[o]} · ${pct}%</span></div>` +
          `<div class="poll-result-track"><div class="poll-result-fill" style="width:${pct}%"></div></div>`;
        pollResultsEl.appendChild(row);
      });
    });
  }

  reflectionSubmit.addEventListener("click", async () => {
    const dayInfo = todaySchedule();
    if (!dayInfo || !state.uid || !state.profile) return;
    const day = dayInfo.day;
    if (state.profile.reflectionDays?.includes(day)) return;
    const text = reflectionInput.value.trim();
    if (!text) { showToast("Write a line first"); return; }

    const reflectionRef = doc(db, "reflections", `d${day}_${state.uid}`);
    const profileRef = doc(db, "profiles", state.uid);
    reflectionSubmit.disabled = true;
    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(reflectionRef);
        if (snap.exists()) return;
        tx.set(reflectionRef, {
          day, uid: state.uid, nickname: state.profile.nickname, text, createdAt: serverTimestamp()
        });
        tx.update(profileRef, { points: increment(POINTS.reflection), reflectionDays: arrayUnion(day) });
      });
      showToast(`+${POINTS.reflection} pts — thank you`);
      reflectionInput.disabled = true;
      reflectionStatus.textContent = "Thanks — you've shared today's reflection.";
    } catch (e) {
      reflectionSubmit.disabled = false;
      showToast("Couldn't submit — try again");
    }
  });

  onProfileChange(render);
  render();
}
