import { subscribeComments, postComment } from "./comments.js";
import { initLikeButton } from "./likes.js";
import { showToast } from "./state.js";
import { onNavChange, openOverlay, closeOverlay } from "./nav.js";

const PARENT_COLLECTION = { photo: "photos", gallery: "gallery" };

let commentsUnsub = null;
let likeUnsub = null;
let currentParentId = null;
let currentParentType = null;

function closeLightbox() {
  const lightbox = document.getElementById("photo-lightbox");
  if (lightbox.hidden) return;
  const video = document.getElementById("lightbox-video");
  if (commentsUnsub) { commentsUnsub(); commentsUnsub = null; }
  if (likeUnsub) { likeUnsub(); likeUnsub = null; }
  video.pause();
  video.removeAttribute("src");
  video.load();
  lightbox.hidden = true;
  currentParentId = null;
  currentParentType = null;
}

export function initLightbox() {
  const lightbox = document.getElementById("photo-lightbox");
  const input = document.getElementById("lightbox-comment-input");
  const submit = document.getElementById("lightbox-comment-submit");
  const closeBtn = document.getElementById("lightbox-close");

  onNavChange((navState) => { if (navState.overlay !== "lightbox") closeLightbox(); });

  closeBtn.addEventListener("click", () => closeOverlay());
  lightbox.addEventListener("click", (e) => { if (e.target === lightbox) closeOverlay(); });
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
  const likeBtn = document.getElementById("lightbox-like-btn");

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

  if (commentsUnsub) commentsUnsub();
  commentsUnsub = subscribeComments(item.parentType, item.parentId, comments);

  if (likeUnsub) likeUnsub();
  const parentCollection = PARENT_COLLECTION[item.parentType];
  likeUnsub = parentCollection ? initLikeButton(likeBtn, item.parentType, item.parentId, parentCollection) : null;

  lightbox.hidden = false;
  openOverlay("lightbox");
}
