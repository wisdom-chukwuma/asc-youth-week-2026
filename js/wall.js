import {
  db, storage, doc, updateDoc, addDoc, collection, query, where, orderBy, limit,
  onSnapshot, ref, uploadBytes, getDownloadURL, serverTimestamp, increment
} from "./firebase-config.js";
import { POINTS, todaySchedule } from "./data.js";
import { state, showToast, applyDocChanges } from "./state.js";

async function compressImage(file, maxDim = 1600, quality = 0.8) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  let { width, height } = bitmap;
  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, width, height);
  return await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

async function postComment(parentType, parentId, text, statusEl) {
  if (!state.uid || !state.profile) return false;
  const day = todaySchedule()?.day || 0;
  const dayCount = state.profile.commentCounts?.[day] || 0;
  if (dayCount >= POINTS.commentDailyCap) {
    if (statusEl) statusEl.textContent = `You've hit today's comment limit (${POINTS.commentDailyCap}) — thank you!`;
    return false;
  }
  try {
    await addDoc(collection(db, "comments"), {
      uid: state.uid, nickname: state.profile.nickname, parentType, parentId, text,
      createdAt: serverTimestamp()
    });
    await updateDoc(doc(db, "profiles", state.uid), {
      points: increment(POINTS.comment),
      [`commentCounts.${day}`]: increment(1)
    });
    showToast(`+${POINTS.comment} pts — comment posted`);
    return true;
  } catch (e) {
    if (statusEl) statusEl.textContent = "Couldn't post — try again.";
    return false;
  }
}

function renderCommentList(container, comments) {
  container.innerHTML = "";
  if (!comments.length) {
    const empty = document.createElement("p");
    empty.className = "hint comment-empty";
    empty.textContent = "No comments yet — be the first.";
    container.appendChild(empty);
    return;
  }
  comments.forEach((c) => {
    const p = document.createElement("p");
    p.className = "comment-item";
    p.innerHTML = `<strong>${escapeHtml(c.nickname)}</strong> ${escapeHtml(c.text)}`;
    container.appendChild(p);
  });
}

function subscribeComments(parentType, parentId, listEl) {
  const q = query(
    collection(db, "comments"),
    where("parentType", "==", parentType),
    where("parentId", "==", parentId),
    orderBy("createdAt", "asc"),
    limit(100)
  );
  return onSnapshot(q, (snap) => {
    renderCommentList(listEl, snap.docs.map((d) => d.data()));
  });
}

export function initWall() {
  const fileInput = document.getElementById("photo-upload-input");
  const uploadStatus = document.getElementById("photo-upload-status");
  const uploadLabel = document.getElementById("photo-upload-label");
  const photoGrid = document.getElementById("photo-grid");
  const shoutoutInput = document.getElementById("shoutout-input");
  const shoutoutSubmit = document.getElementById("shoutout-submit");
  const shoutoutStatus = document.getElementById("shoutout-status");
  const shoutoutList = document.getElementById("shoutout-list");

  const lightbox = document.getElementById("photo-lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxMeta = document.getElementById("lightbox-meta");
  const lightboxComments = document.getElementById("lightbox-comments");
  const lightboxInput = document.getElementById("lightbox-comment-input");
  const lightboxSubmit = document.getElementById("lightbox-comment-submit");
  const lightboxClose = document.getElementById("lightbox-close");
  let lightboxUnsub = null;
  let lightboxPhotoId = null;

  function closeLightbox() {
    if (lightboxUnsub) { lightboxUnsub(); lightboxUnsub = null; }
    lightbox.hidden = true;
    lightboxPhotoId = null;
  }
  function openLightbox(photoDoc) {
    const p = photoDoc.data();
    lightboxPhotoId = photoDoc.id;
    lightboxImg.src = p.url;
    lightboxImg.alt = p.nickname ? `Photo from ${p.nickname}` : "Youth Week photo";
    lightboxMeta.textContent = p.nickname ? `Posted by ${p.nickname}` : "Youth Week 2026";
    lightboxInput.value = "";
    if (lightboxUnsub) lightboxUnsub();
    lightboxUnsub = subscribeComments("photo", photoDoc.id, lightboxComments);
    lightbox.hidden = false;
  }
  lightboxClose.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (e) => { if (e.target === lightbox) closeLightbox(); });
  lightboxSubmit.addEventListener("click", async () => {
    const text = lightboxInput.value.trim();
    if (!text || !lightboxPhotoId) { if (!text) showToast("Write something first"); return; }
    lightboxSubmit.disabled = true;
    const ok = await postComment("photo", lightboxPhotoId, text);
    if (ok) lightboxInput.value = "";
    lightboxSubmit.disabled = false;
  });

  const photosQuery = query(collection(db, "photos"), orderBy("createdAt", "desc"), limit(60));
  onSnapshot(photosQuery, (snap) => {
    applyDocChanges(photoGrid, snap.docChanges(), (docSnap) => {
      const p = docSnap.data();
      const tile = document.createElement("div");
      tile.className = "photo-tile";
      tile.dataset.id = docSnap.id;
      const img = document.createElement("img");
      img.src = p.url;
      img.loading = "lazy";
      img.alt = p.nickname ? `Photo from ${p.nickname}` : "Youth Week photo";
      tile.appendChild(img);
      tile.addEventListener("click", () => openLightbox(docSnap));
      return tile;
    });
  });

  const shoutQuery = query(collection(db, "shoutouts"), orderBy("createdAt", "desc"), limit(60));
  onSnapshot(shoutQuery, (snap) => {
    applyDocChanges(shoutoutList, snap.docChanges(), (docSnap) => {
      const s = docSnap.data();
      const item = document.createElement("div");
      item.className = "shoutout-item";
      item.dataset.id = docSnap.id;

      const msg = document.createElement("p");
      msg.className = "shoutout-msg";
      msg.textContent = s.message;

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "shoutout-comment-toggle";
      toggle.textContent = "\u{1F4AC} Reply";

      const panel = document.createElement("div");
      panel.className = "shoutout-comment-panel";
      panel.hidden = true;
      const list = document.createElement("div");
      list.className = "comment-list comment-list-inline";
      const compose = document.createElement("div");
      compose.className = "comment-compose";
      const input = document.createElement("input");
      input.className = "text-input comment-input";
      input.maxLength = 140;
      input.placeholder = "Reply…";
      const submit = document.createElement("button");
      submit.type = "button";
      submit.className = "btn btn-gold comment-submit-btn";
      submit.textContent = "Post";
      compose.appendChild(input);
      compose.appendChild(submit);
      panel.appendChild(list);
      panel.appendChild(compose);

      let unsub = null;
      toggle.addEventListener("click", () => {
        panel.hidden = !panel.hidden;
        if (!panel.hidden && !unsub) {
          unsub = subscribeComments("shoutout", docSnap.id, list);
        }
      });
      submit.addEventListener("click", async () => {
        const text = input.value.trim();
        if (!text) { showToast("Write something first"); return; }
        submit.disabled = true;
        const ok = await postComment("shoutout", docSnap.id, text);
        if (ok) input.value = "";
        submit.disabled = false;
      });

      item.appendChild(msg);
      item.appendChild(toggle);
      item.appendChild(panel);
      return item;
    });
  });

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file || !state.uid || !state.profile) { fileInput.value = ""; return; }

    const dayInfo = todaySchedule();
    if (!dayInfo) {
      uploadStatus.textContent = "Photos open during event days.";
      fileInput.value = "";
      return;
    }
    const day = dayInfo.day;
    const dayCount = state.profile.photoCounts?.[day] || 0;
    if (dayCount >= POINTS.photoDailyCap) {
      uploadStatus.textContent = `You've shared ${POINTS.photoDailyCap} photos today — thank you!`;
      fileInput.value = "";
      return;
    }

    uploadStatus.textContent = "Uploading…";
    uploadLabel.style.pointerEvents = "none";
    try {
      const compressed = await compressImage(file);
      const path = `photos/${state.uid}/${Date.now()}.jpg`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, compressed, { contentType: "image/jpeg" });
      const url = await getDownloadURL(storageRef);
      await addDoc(collection(db, "photos"), {
        uid: state.uid, nickname: state.profile.nickname, squad: state.profile.squad,
        day, url, createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, "profiles", state.uid), {
        points: increment(POINTS.photo),
        [`photoCounts.${day}`]: increment(1)
      });
      showToast(`+${POINTS.photo} pts — photo posted!`);
      uploadStatus.textContent = "";
    } catch (e) {
      uploadStatus.textContent = "Upload failed — check your connection and try again.";
    } finally {
      uploadLabel.style.pointerEvents = "";
      fileInput.value = "";
    }
  });

  shoutoutSubmit.addEventListener("click", async () => {
    if (!state.uid || !state.profile) return;
    const text = shoutoutInput.value.trim();
    if (!text) { showToast("Write something first"); return; }

    const day = todaySchedule()?.day || 0;
    const dayCount = state.profile.shoutoutCounts?.[day] || 0;
    if (dayCount >= POINTS.shoutoutDailyCap) {
      shoutoutStatus.textContent = `You've posted ${POINTS.shoutoutDailyCap} shoutouts today — thank you!`;
      return;
    }

    shoutoutSubmit.disabled = true;
    try {
      await addDoc(collection(db, "shoutouts"), {
        uid: state.uid, day, message: text, createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, "profiles", state.uid), {
        points: increment(POINTS.shoutout),
        [`shoutoutCounts.${day}`]: increment(1)
      });
      showToast(`+${POINTS.shoutout} pts — posted!`);
      shoutoutInput.value = "";
      shoutoutStatus.textContent = "";
    } catch (e) {
      shoutoutStatus.textContent = "Could not post — try again.";
    } finally {
      shoutoutSubmit.disabled = false;
    }
  });
}
