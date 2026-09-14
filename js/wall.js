import {
  db, storage, doc, updateDoc, addDoc, collection, query, orderBy, limit,
  onSnapshot, ref, uploadBytes, getDownloadURL, serverTimestamp, increment
} from "./firebase-config.js";
import { POINTS, todaySchedule } from "./data.js";
import { state, showToast, applyDocChanges, markLoading } from "./state.js";
import { postComment, subscribeComments } from "./comments.js";
import { openLightbox } from "./lightbox.js";
import { initLikeButtonStatic, likeButtonHtml } from "./likes.js";

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

export function initWall() {
  const fileInput = document.getElementById("photo-upload-input");
  const uploadStatus = document.getElementById("photo-upload-status");
  const uploadLabel = document.getElementById("photo-upload-label");
  const photoGrid = document.getElementById("photo-grid");
  const shoutoutInput = document.getElementById("shoutout-input");
  const shoutoutSubmit = document.getElementById("shoutout-submit");
  const shoutoutStatus = document.getElementById("shoutout-status");
  const shoutoutList = document.getElementById("shoutout-list");

  const photosQuery = query(collection(db, "photos"), orderBy("createdAt", "desc"), limit(60));
  onSnapshot(photosQuery, (snap) => {
    applyDocChanges(photoGrid, snap.docChanges(), (docSnap) => {
      const p = docSnap.data();
      const tile = document.createElement("div");
      tile.className = "photo-tile";
      tile.dataset.id = docSnap.id;
      const img = document.createElement("img");
      markLoading(tile, img);
      img.loading = "lazy";
      img.alt = p.nickname ? `Photo from ${p.nickname}` : "Youth Week photo";
      img.src = p.url;
      tile.appendChild(img);
      tile.addEventListener("click", () => openLightbox({
        type: "image", url: p.url,
        metaText: p.nickname ? `Posted by ${p.nickname}` : "Youth Week 2026",
        parentType: "photo", parentId: docSnap.id
      }));
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

      const actions = document.createElement("div");
      actions.className = "shoutout-actions";
      actions.innerHTML = likeButtonHtml();
      const likeBtn = actions.querySelector(".like-btn");

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "shoutout-comment-toggle";
      toggle.textContent = "\u{1F4AC} Reply";
      actions.appendChild(toggle);

      initLikeButtonStatic(likeBtn, "shoutout", docSnap.id, "shoutouts");

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
      item.appendChild(actions);
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
