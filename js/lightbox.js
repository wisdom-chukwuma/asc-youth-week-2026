import { subscribeComments, postComment } from "./comments.js";
import { showToast } from "./state.js";

let unsub = null;
let currentParentId = null;
let currentParentType = null;

export function initLightbox() {
  const lightbox = document.getElementById("photo-lightbox");
  const img = document.getElementById("lightbox-img");
  const video = document.getElementById("lightbox-video");
  const meta = document.getElementById("lightbox-meta");
  const comments = document.getElementById("lightbox-comments");
  const input = document.getElementById("lightbox-comment-input");
  const submit = document.getElementById("lightbox-comment-submit");
  const closeBtn = document.getElementById("lightbox-close");

  function close() {
    if (unsub) { unsub(); unsub = null; }
    video.pause();
    video.removeAttribute("src");
    video.load();
    lightbox.hidden = true;
    currentParentId = null;
    currentParentType = null;
  }

  closeBtn.addEventListener("click", close);
  lightbox.addEventListener("click", (e) => { if (e.target === lightbox) close(); });
  submit.addEventListener("click", async () => {
    const text = input.value.trim();
    if (!text || !currentParentId) { if (!text) showToast("Write something first"); return; }
    submit.disabled = true;
    const ok = await postComment(currentParentType, currentParentId, text);
    if (ok) input.value = "";
    submit.disabled = false;
  });
}

// item: { type: "image"|"video", url, metaText, parentType, parentId }
export function openLightbox(item) {
  const lightbox = document.getElementById("photo-lightbox");
  const img = document.getElementById("lightbox-img");
  const video = document.getElementById("lightbox-video");
  const meta = document.getElementById("lightbox-meta");
  const comments = document.getElementById("lightbox-comments");
  const input = document.getElementById("lightbox-comment-input");

  currentParentId = item.parentId;
  currentParentType = item.parentType;
  meta.textContent = item.metaText || "";
  input.value = "";

  if (item.type === "video") {
    img.hidden = true;
    video.hidden = false;
    video.src = item.url;
    video.controls = true;
    video.autoplay = true;
    video.muted = false;
    video.playsInline = true;
  } else {
    video.hidden = true;
    video.pause();
    img.hidden = false;
    img.src = item.url;
    img.alt = item.metaText || "";
  }

  if (unsub) unsub();
  unsub = subscribeComments(item.parentType, item.parentId, comments);
  lightbox.hidden = false;
}
