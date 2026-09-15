import { state, onProfileChange } from "./state.js";
import { POINTS, todaySchedule } from "./data.js";
import { goToTab } from "./nav.js";

function goToWallSub(key) {
  return () => {
    goToTab("wall");
    document.querySelector(`.wall-subnav-btn[data-wallsub="${key}"]`)?.click();
  };
}

function buildQuests(profile, day) {
  const photoCount = profile.photoCounts?.[day] || 0;
  const shoutoutCount = profile.shoutoutCounts?.[day] || 0;
  const commentCount = profile.commentCounts?.[day] || 0;
  const likeCount = profile.likeCounts?.[day] || 0;

  return [
    {
      icon: "check-circle", label: "Check in for today", points: POINTS.checkin,
      done: !!profile.checkinDays?.includes(day), onClick: () => goToTab("home")
    },
    {
      icon: "question", label: "Answer the daily quiz", points: POINTS.quiz,
      done: !!profile.quizDays?.includes(day), onClick: () => goToTab("engage")
    },
    {
      icon: "list-checks", label: "Vote in today's poll", points: POINTS.poll,
      done: !!profile.pollDays?.includes(day), onClick: () => goToTab("engage")
    },
    {
      icon: "notebook", label: "Share a reflection", points: POINTS.reflection,
      done: !!profile.reflectionDays?.includes(day), onClick: () => goToTab("engage")
    },
    {
      icon: "camera", label: "Post a photo", points: POINTS.photo,
      done: photoCount >= POINTS.photoDailyCap, count: photoCount, cap: POINTS.photoDailyCap,
      onClick: goToWallSub("photos")
    },
    {
      icon: "megaphone", label: "Drop a shoutout", points: POINTS.shoutout,
      done: shoutoutCount >= POINTS.shoutoutDailyCap, count: shoutoutCount, cap: POINTS.shoutoutDailyCap,
      onClick: goToWallSub("shoutouts")
    },
    {
      icon: "chat-circle", label: "Comment in the Gallery", points: POINTS.comment,
      done: commentCount >= POINTS.commentDailyCap, count: commentCount, cap: POINTS.commentDailyCap,
      onClick: goToWallSub("gallery")
    },
    {
      icon: "heart", label: "Like posts in the Gallery", points: POINTS.like,
      done: likeCount >= POINTS.likeDailyCap, count: likeCount, cap: POINTS.likeDailyCap,
      onClick: goToWallSub("gallery")
    },
    {
      icon: "pen-nib", label: "Sign the board", points: POINTS.signature,
      done: !!profile.signed, onClick: goToWallSub("board")
    }
  ];
}

function renderQuestRow(q) {
  const row = document.createElement("button");
  row.type = "button";
  row.className = "quest-row" + (q.done ? " is-done" : "");
  row.disabled = q.done;

  const meta = q.done
    ? '<i class="ph-fill ph-check-circle quest-check"></i>'
    : q.cap
      ? `<span class="quest-points">+${q.points}</span><span class="quest-progress">${q.count}/${q.cap}</span>`
      : `<span class="quest-points">+${q.points}</span>`;

  row.innerHTML = `
    <span class="quest-icon"><i class="ph ph-${q.icon}"></i></span>
    <span class="quest-label">${q.label}</span>
    <span class="quest-meta">${meta}</span>
  `;
  if (!q.done && q.onClick) row.addEventListener("click", q.onClick);
  return row;
}

export function initQuests() {
  const list = document.getElementById("quest-list");
  if (!list) return;

  function render() {
    if (!state.profile) return;
    const day = todaySchedule()?.day;
    list.innerHTML = "";
    if (!day) {
      const done = document.createElement("p");
      done.className = "hint";
      done.textContent = "No event today — check back tomorrow.";
      list.appendChild(done);
      return;
    }
    buildQuests(state.profile, day).forEach((q) => list.appendChild(renderQuestRow(q)));
  }

  onProfileChange(render);
  render();
}
