import { db, collection, query, orderBy, limit, onSnapshot } from "./firebase-config.js";
import { SCHEDULE } from "./data.js";
import { openLightbox } from "./lightbox.js";

export function initGallery() {
  const pillsEl = document.getElementById("gallery-day-pills");
  const gridEl = document.getElementById("gallery-grid");
  const emptyEl = document.getElementById("gallery-empty");
  if (!pillsEl || !gridEl) return;

  let itemsByDay = {};
  let selectedDay = null;

  function renderPills() {
    pillsEl.innerHTML = "";
    SCHEDULE.forEach((d) => {
      const count = (itemsByDay[d.day] || []).length;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "gallery-pill" + (d.day === selectedDay ? " is-active" : "");
      btn.textContent = `Day ${d.day}`;
      btn.disabled = count === 0;
      btn.addEventListener("click", () => { selectedDay = d.day; renderPills(); renderGrid(); });
      pillsEl.appendChild(btn);
    });
  }

  function renderGrid() {
    gridEl.innerHTML = "";
    const items = itemsByDay[selectedDay] || [];
    emptyEl.hidden = items.length > 0;
    items.forEach((item) => {
      const tile = document.createElement("div");
      tile.className = "photo-tile gallery-tile";
      if (item.type === "video") {
        const video = document.createElement("video");
        video.src = item.url;
        video.muted = true;
        video.preload = "metadata";
        video.playsInline = true;
        tile.appendChild(video);
        const playIcon = document.createElement("span");
        playIcon.className = "gallery-play-icon";
        playIcon.textContent = "▶";
        tile.appendChild(playIcon);
      } else {
        const img = document.createElement("img");
        img.src = item.url;
        img.loading = "lazy";
        img.alt = `Day ${item.day} highlight`;
        tile.appendChild(img);
      }
      tile.addEventListener("click", () => openLightbox({
        type: item.type === "video" ? "video" : "image",
        url: item.url,
        metaText: `Day ${item.day} · Official Gallery`,
        parentType: "gallery",
        parentId: item.id
      }));
      gridEl.appendChild(tile);
    });
  }

  const q = query(collection(db, "gallery"), orderBy("createdAt", "desc"), limit(300));
  onSnapshot(q, (snap) => {
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
    renderPills();
    renderGrid();
  });
}
