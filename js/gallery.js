import { db, collection, query, orderBy, limit, onSnapshot } from "./firebase-config.js";
import { SCHEDULE } from "./data.js";
import { openLightbox } from "./lightbox.js";
import { markLoading } from "./state.js";
import { initLikeButtonStatic, likeButtonHtml } from "./likes.js";

const COMMENT_ICON = '<svg viewBox="0 0 24 24" class="reel-comment-icon"><path d="M4 5h16v10H9l-4 4v-4H4z"/></svg>';

export function initGallery() {
  const pillsEl = document.getElementById("gallery-day-pills");
  const feedEl = document.getElementById("gallery-reel");
  const emptyEl = document.getElementById("gallery-empty");
  if (!pillsEl || !feedEl) return;

  let itemsByDay = {};
  let selectedDay = null;

  // Only the reel item centered in the viewport should autoplay its
  // video — otherwise every clip in the feed plays at once.
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const video = entry.target.querySelector("video.reel-media");
      if (!video) return;
      if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, { threshold: [0, 0.6, 1] });

  function renderPills() {
    pillsEl.innerHTML = "";
    SCHEDULE.forEach((d) => {
      const count = (itemsByDay[d.day] || []).length;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "gallery-pill" + (d.day === selectedDay ? " is-active" : "");
      btn.textContent = `Day ${d.day}`;
      btn.disabled = count === 0;
      btn.addEventListener("click", () => { selectedDay = d.day; renderPills(); renderFeed(); });
      pillsEl.appendChild(btn);
    });
  }

  function buildReelItem(item) {
    const el = document.createElement("div");
    el.className = "reel-item";
    el.dataset.id = item.id;

    let media;
    if (item.type === "video") {
      media = document.createElement("video");
      media.className = "reel-media";
      markLoading(el, media);
      media.muted = true;
      media.loop = true;
      media.playsInline = true;
      media.preload = "metadata";
      media.src = item.url;
    } else {
      media = document.createElement("img");
      media.className = "reel-media";
      markLoading(el, media);
      media.loading = "lazy";
      media.alt = `Day ${item.day} highlight`;
      media.src = item.url;
    }
    el.appendChild(media);

    const openFull = () => openLightbox({
      type: item.type === "video" ? "video" : "image",
      url: item.url,
      metaText: `Day ${item.day} · Official Gallery`,
      parentType: "gallery",
      parentId: item.id
    });
    media.addEventListener("click", openFull);

    const badge = document.createElement("span");
    badge.className = "reel-type-badge";
    badge.textContent = item.type === "video" ? "Video" : "Photo";
    el.appendChild(badge);

    const bottom = document.createElement("div");
    bottom.className = "reel-bottom";

    const dayLabel = document.createElement("span");
    dayLabel.className = "reel-day-label";
    dayLabel.textContent = `Day ${item.day}`;
    bottom.appendChild(dayLabel);

    const actions = document.createElement("div");
    actions.className = "reel-actions";
    actions.innerHTML = likeButtonHtml();
    const likeBtn = actions.querySelector(".like-btn");
    initLikeButtonStatic(likeBtn, "gallery", item.id, "gallery");

    const commentBtn = document.createElement("button");
    commentBtn.type = "button";
    commentBtn.className = "reel-comment-btn";
    commentBtn.innerHTML = `${COMMENT_ICON}<span>Comment</span>`;
    commentBtn.addEventListener("click", openFull);
    actions.appendChild(commentBtn);

    bottom.appendChild(actions);
    el.appendChild(bottom);

    observer.observe(el);
    return el;
  }

  function renderFeed() {
    observer.disconnect();
    feedEl.innerHTML = "";
    const items = itemsByDay[selectedDay] || [];
    emptyEl.hidden = items.length > 0;
    items.forEach((item) => feedEl.appendChild(buildReelItem(item)));
  }

  const q = query(collection(db, "gallery"), orderBy("createdAt", "desc"), limit(300));
  onSnapshot(q, (snap) => {
    const isFirstLoad = selectedDay === null;

    itemsByDay = {};
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const day = data.day;
      if (!itemsByDay[day]) itemsByDay[day] = [];
      itemsByDay[day].push({ id: docSnap.id, ...data });
    });
    if (selectedDay === null || !(selectedDay in itemsByDay)) {
      const daysWithContent = Object.keys(itemsByDay).map(Number).sort((a, b) => b - a);
      selectedDay = daysWithContent[0] ?? SCHEDULE[0].day;
    }

    // A likeCount bump on an existing item delivers here as "modified" -
    // rebuilding the feed for that would reset everyone's scroll
    // position and restart whatever video they're watching. Only a
    // genuinely new/removed item (or the very first load) needs a
    // rebuild; the like button's own display manages itself.
    const structuralChange = snap.docChanges().some((c) => c.type !== "modified");
    if (isFirstLoad || structuralChange) {
      renderPills();
      renderFeed();
    }
  });
}
