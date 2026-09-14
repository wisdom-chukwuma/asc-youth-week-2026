import {
  db, storage, doc, updateDoc, addDoc, collection, query, orderBy, limit,
  onSnapshot, ref, uploadBytes, getDownloadURL, serverTimestamp, increment
} from "./firebase-config.js";
import { POINTS } from "./data.js";
import { state, showToast, applyDocChanges } from "./state.js";

export function initSignatureBoard() {
  const canvas = document.getElementById("signature-canvas");
  const ctx = canvas.getContext("2d");
  const clearBtn = document.getElementById("signature-clear");
  const saveBtn = document.getElementById("signature-save");
  const status = document.getElementById("signature-status");
  const grid = document.getElementById("signature-grid");

  ctx.strokeStyle = "#f4b942";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  let drawing = false;
  let hasDrawn = false;
  let last = null;

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  canvas.addEventListener("pointerdown", (e) => {
    drawing = true;
    hasDrawn = true;
    last = getPos(e);
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drawing) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    last = pos;
  });
  ["pointerup", "pointerleave", "pointercancel"].forEach((evt) =>
    canvas.addEventListener(evt, () => { drawing = false; })
  );

  clearBtn.addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawn = false;
    status.textContent = "";
  });

  saveBtn.addEventListener("click", async () => {
    if (!state.uid || !state.profile) return;
    if (state.profile.signed) {
      status.textContent = "You've already signed the board — thank you!";
      return;
    }
    if (!hasDrawn) {
      showToast("Draw your signature first");
      return;
    }
    saveBtn.disabled = true;
    status.textContent = "Saving…";
    try {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      const path = `signatures/${state.uid}/${Date.now()}.png`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, blob, { contentType: "image/png" });
      const url = await getDownloadURL(storageRef);
      await addDoc(collection(db, "signatures"), {
        uid: state.uid, nickname: state.profile.nickname, squad: state.profile.squad,
        url, createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, "profiles", state.uid), {
        points: increment(POINTS.signature),
        signed: true
      });
      showToast(`+${POINTS.signature} pts — you signed the board!`);
      status.textContent = "Thank you for signing — find yours below.";
      saveBtn.textContent = "Signed ✓";
    } catch (e) {
      status.textContent = "Couldn't save — check your connection and try again.";
      saveBtn.disabled = false;
    }
  });

  const q = query(collection(db, "signatures"), orderBy("createdAt", "desc"), limit(60));
  onSnapshot(q, (snap) => {
    applyDocChanges(grid, snap.docChanges(), (docSnap) => {
      const s = docSnap.data();
      const tile = document.createElement("div");
      tile.className = "photo-tile";
      tile.dataset.id = docSnap.id;
      const img = document.createElement("img");
      img.src = s.url;
      img.loading = "lazy";
      img.alt = s.nickname ? `${s.nickname}'s signature` : "Signature";
      tile.appendChild(img);
      return tile;
    });
  });
}
