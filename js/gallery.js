import { db, collection, query, orderBy, limit, onSnapshot } from "./firebase-config.js";
import { SCHEDULE } from "./data.js";
import { markLoading, showToast } from "./state.js";
import { initLikeButtonStatic, likeButtonHtml } from "./likes.js";
import { postComment, subscribeComments } from "./comments.js";
import { onNavChange, openOverlay, closeOverlay } from "./nav.js";

// Unmuting one video should keep the rest unmuted too, not reset to
// silent on every scroll — this is shared across every video in the feed.
let sharedMuted = true;

// The comment drawer belonging to whichever reel item currently has it
// open, so a back-navigation can close just the drawer without touching
// the reel underneath it.
let openDrawerEl = null;

// Fetches the media as a blob and saves it via a same-origin blob: URL —
// a plain <a download> pointing straight at the Storage URL gets ignored
// by most browsers for a cross-origin link (they just navigate to it
// instead of saving), so this is what actually makes "Download" reliable.
async function downloadMedia(url, filename, btn) {
  if (btn) btn.disabled = true;
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("fetch failed");
    const blob = await resp.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
  } catch (e) {
    showToast("Couldn't download — try again");
  } finally {
    if (btn) btn.disabled = false;
  }
}

function downloadFilename(item) {
  const ext = item.type === "video" ? "mp4" : "jpg";
  return `worship-the-king-day${item.day}-${item.id}.${ext}`;
}

export function initGallery() {
  const pillsEl = document.getElementById("gallery-day-pills");
  const gridEl = document.getElementById("gallery-grid");
  const emptyEl = document.getElementById("gallery-empty");
  const overlay = document.getElementById("reel-overlay");
  const feedEl = document.getElementById("reel-feed");
  const backBtn = document.getElementById("reel-back-btn");
  if (!pillsEl || !gridEl || !overlay) return;

  let itemsByDay = {};
  let selectedDay = null;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const video = entry.target.querySelector("video.reel-media");
      if (!video) return;
      if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
        video.muted = sharedMuted;
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, { root: feedEl, threshold: [0, 0.6, 1] });

  function renderPills() {
    pillsEl.innerHTML = "";
    SCHEDULE.forEach((d) => {
      const count = (itemsByDay[d.day] || []).length;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "gallery-pill" + (d.day === selectedDay ? " is-active" : "");
      btn.innerHTML = `<i class="ph ph-${d.sessions[0].icon}"></i> Day ${d.day}`;
      btn.disabled = count === 0;
      btn.addEventListener("click", () => { selectedDay = d.day; renderPills(); renderGrid(); });
      pillsEl.appendChild(btn);
    });
  }

  // ---------- Grid (default browsing view) ----------

  function renderGrid() {
    gridEl.innerHTML = "";
    const items = itemsByDay[selectedDay] || [];
    emptyEl.hidden = items.length > 0;
    items.forEach((item, index) => {
      const tile = document.createElement("div");
      tile.className = "photo-tile gallery-grid-tile";
      const media = item.type === "video" ? document.createElement("video") : document.createElement("img");
      media.className = "reel-media";
      markLoading(tile, media);
      if (item.type === "video") {
        media.muted = true;
        media.preload = "metadata";
        media.addEventListener("loadedmetadata", () => { media.currentTime = 0.1; }, { once: true });
      } else {
        media.loading = "lazy";
        media.alt = `Day ${item.day} highlight`;
      }
      media.src = item.url;
      tile.appendChild(media);
      if (item.type === "video") {
        const playIcon = document.createElement("i");
        playIcon.className = "ph-fill ph-play-circle gallery-grid-play";
        tile.appendChild(playIcon);
      }

      const downloadBtn = document.createElement("button");
      downloadBtn.type = "button";
      downloadBtn.className = "gallery-grid-download";
      downloadBtn.setAttribute("aria-label", "Download");
      downloadBtn.innerHTML = '<i class="ph ph-download-simple"></i>';
      downloadBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        downloadMedia(item.url, downloadFilename(item), downloadBtn);
      });
      tile.appendChild(downloadBtn);

      tile.addEventListener("click", () => openReel(items, index));
      gridEl.appendChild(tile);
    });
  }

  // ---------- Full-screen reel overlay ----------

  function buildReelItem(item) {
    const el = document.createElement("div");
    el.className = "reel-item";
    el.dataset.id = item.id;

    let media;
    if (item.type === "video") {
      media = document.createElement("video");
      media.loop = true;
      media.playsInline = true;
      media.preload = "metadata";
      media.addEventListener("loadedmetadata", () => { media.currentTime = 0.1; }, { once: true });
    } else {
      media = document.createElement("img");
      media.loading = "lazy";
      media.alt = `Day ${item.day} highlight`;
    }
    media.className = "reel-media";
    markLoading(el, media);
    media.src = item.url;
    el.appendChild(media);

    const badge = document.createElement("span");
    badge.className = "reel-type-badge";
    badge.textContent = item.type === "video" ? "Video" : "Photo";
    el.appendChild(badge);

    let muteBadge = null;
    if (item.type === "video") {
      muteBadge = document.createElement("span");
      muteBadge.className = "reel-mute-badge";
      muteBadge.innerHTML = sharedMuted ? '<i class="ph ph-speaker-none"></i>' : '<i class="ph ph-speaker-high"></i>';
      el.appendChild(muteBadge);
    }

    const heartBurst = document.createElement("i");
    heartBurst.className = "ph-fill ph-heart reel-heart-burst";
    el.appendChild(heartBurst);

    function toggleMute() {
      sharedMuted = !sharedMuted;
      el.querySelectorAll("video.reel-media").forEach((v) => { v.muted = sharedMuted; });
      if (muteBadge) {
        muteBadge.innerHTML = sharedMuted ? '<i class="ph ph-speaker-none"></i>' : '<i class="ph ph-speaker-high"></i>';
        muteBadge.classList.add("is-flash");
        setTimeout(() => muteBadge.classList.remove("is-flash"), 700);
      }
    }

    function likeIfNotAlready() {
      const likeBtn = el.querySelector(".like-btn");
      if (likeBtn && !likeBtn.disabled && !likeBtn.classList.contains("is-liked")) likeBtn.click();
      heartBurst.classList.remove("is-bursting");
      void heartBurst.offsetWidth; // restart the animation on repeat double-taps
      heartBurst.classList.add("is-bursting");
    }

    // Single tap = mute toggle (video only); double tap = like, on any
    // media type — same disambiguation every short-video app uses so a
    // deliberate double-tap doesn't also fire the single-tap action.
    let tapTimer = null;
    media.addEventListener("click", () => {
      if (tapTimer) {
        clearTimeout(tapTimer);
        tapTimer = null;
        likeIfNotAlready();
      } else {
        tapTimer = setTimeout(() => {
          tapTimer = null;
          if (item.type === "video") toggleMute();
        }, 260);
      }
    });

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
    commentBtn.innerHTML = '<i class="ph ph-chat-circle reel-comment-icon"></i>';
    actions.appendChild(commentBtn);

    const downloadBtn = document.createElement("button");
    downloadBtn.type = "button";
    downloadBtn.className = "reel-download-btn";
    downloadBtn.setAttribute("aria-label", "Download");
    downloadBtn.innerHTML = '<i class="ph ph-download-simple reel-download-icon"></i>';
    downloadBtn.addEventListener("click", () => downloadMedia(item.url, downloadFilename(item), downloadBtn));
    actions.appendChild(downloadBtn);

    bottom.appendChild(actions);
    el.appendChild(bottom);

    // Comments open as a drawer over the same item — never a separate
    // view of the media that's already right there on screen.
    const drawer = document.createElement("div");
    drawer.className = "reel-comment-drawer";
    drawer.hidden = true;
    drawer.innerHTML = `
      <div class="reel-drawer-head">
        <span>Comments</span>
        <button type="button" class="reel-drawer-close" aria-label="Close comments"><i class="ph ph-x"></i></button>
      </div>
      <div class="comment-list reel-drawer-list"></div>
      <div class="comment-compose">
        <input type="text" class="text-input comment-input" maxlength="140" placeholder="Add a comment…" />
        <button type="button" class="btn btn-gold comment-submit-btn">Post</button>
      </div>
    `;
    el.appendChild(drawer);

    let commentsUnsub = null;
    commentBtn.addEventListener("click", () => {
      drawer.hidden = false;
      openDrawerEl = drawer;
      openOverlay("reel", { drawer: true });
      if (!commentsUnsub) commentsUnsub = subscribeComments("gallery", item.id, drawer.querySelector(".reel-drawer-list"));
    });
    drawer.querySelector(".reel-drawer-close").addEventListener("click", () => closeOverlay());
    const input = drawer.querySelector(".comment-input");
    const submit = drawer.querySelector(".comment-submit-btn");
    submit.addEventListener("click", async () => {
      const text = input.value.trim();
      if (!text) { showToast("Write something first"); return; }
      submit.disabled = true;
      const ok = await postComment("gallery", item.id, text);
      if (ok) input.value = "";
      submit.disabled = false;
    });

    observer.observe(el);
    return el;
  }

  function openReel(items, startIndex) {
    observer.disconnect();
    feedEl.innerHTML = "";
    items.forEach((item) => feedEl.appendChild(buildReelItem(item)));
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    const target = feedEl.children[startIndex];
    if (target) target.scrollIntoView({ block: "start" });
    openOverlay("reel");
  }

  function closeReel() {
    if (overlay.hidden) return;
    overlay.hidden = true;
    document.body.style.overflow = "";
    observer.disconnect();
    feedEl.querySelectorAll("video").forEach((v) => v.pause());
    openDrawerEl = null;
  }

  onNavChange((navState) => {
    if (navState.overlay !== "reel") {
      closeReel();
    } else if (!navState.drawer && openDrawerEl) {
      openDrawerEl.hidden = true;
      openDrawerEl = null;
    }
  });

  backBtn.addEventListener("click", () => closeOverlay());

  // Horizontal drag-to-close, like swiping back out of a full feed.
  let touchStartX = null, touchStartY = null;
  overlay.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  overlay.addEventListener("touchend", (e) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > 90 && Math.abs(dx) > Math.abs(dy) * 1.5) closeOverlay();
    touchStartX = null;
  }, { passive: true });

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

    const structuralChange = snap.docChanges().some((c) => c.type !== "modified");
    if (isFirstLoad || structuralChange) {
      renderPills();
      renderGrid();
    }
  });
}
