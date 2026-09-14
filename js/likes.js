import { db, doc, getDoc, setDoc, deleteDoc, updateDoc, onSnapshot, increment, serverTimestamp } from "./firebase-config.js";
import { state, showToast } from "./state.js";

function likeDocId(parentType, parentId) {
  return `${parentType}_${parentId}_${state.uid}`;
}

async function toggleLike(parentType, parentId, parentCollection) {
  const likeRef = doc(db, "likes", likeDocId(parentType, parentId));
  const parentRef = doc(db, parentCollection, parentId);
  const existing = await getDoc(likeRef);
  if (existing.exists()) {
    await deleteDoc(likeRef);
    await updateDoc(parentRef, { likeCount: increment(-1) });
    return false;
  }
  await setDoc(likeRef, { parentType, parentId, uid: state.uid, createdAt: serverTimestamp() });
  await updateDoc(parentRef, { likeCount: increment(1) });
  return true;
}

// Wires a heart button element. parentCollection is the Firestore
// collection the like count lives on ("photos" | "gallery" | "shoutouts").
// Liked/unliked state is shown purely via the .is-liked class (see CSS)
// rather than swapping icon content, so no icon element lookup needed.
// Returns an unsubscribe function — call it if the button gets rebound
// to a different item (e.g. the shared lightbox), so listeners don't pile up.
export function initLikeButton(btnEl, parentType, parentId, parentCollection) {
  const countEl = btnEl.querySelector(".like-count");
  let liked = false;
  let busy = false;

  btnEl.disabled = true;
  getDoc(doc(db, "likes", likeDocId(parentType, parentId))).then((snap) => {
    liked = snap.exists();
    btnEl.classList.toggle("is-liked", liked);
    btnEl.disabled = false;
  });

  const unsub = onSnapshot(doc(db, parentCollection, parentId), (snap) => {
    countEl.textContent = snap.data()?.likeCount || 0;
  });

  const clickHandler = async () => {
    if (busy || !state.uid) return;
    busy = true;
    const optimistic = !liked;
    btnEl.classList.toggle("is-liked", optimistic);
    try {
      liked = await toggleLike(parentType, parentId, parentCollection);
    } catch (e) {
      btnEl.classList.toggle("is-liked", liked);
      showToast("Couldn't update — try again");
    } finally {
      busy = false;
    }
  };

  // The lightbox reuses one button element across items - drop the
  // previous item's handler before attaching this one.
  if (btnEl._likeClickHandler) btnEl.removeEventListener("click", btnEl._likeClickHandler);
  btnEl._likeClickHandler = clickHandler;
  btnEl.addEventListener("click", clickHandler);

  return unsub;
}

// Same idea as initLikeButton, but no onSnapshot listener — fetches once
// and updates the count optimistically on click instead. Use this for
// items rendered in a list (shoutouts) where a live listener per row
// would pile up fast; reserve the live version for the lightbox, where
// only one item is ever open at a time.
export async function initLikeButtonStatic(btnEl, parentType, parentId, parentCollection) {
  const countEl = btnEl.querySelector(".like-count");
  let liked = false;
  let busy = false;

  // Disable until the initial state is known — otherwise a fast tap in
  // the first ~1-2s (before these two reads resolve) looks clickable
  // but silently does nothing, since liked/count aren't loaded yet.
  btnEl.disabled = true;
  const [likeSnap, parentSnap] = await Promise.all([
    getDoc(doc(db, "likes", likeDocId(parentType, parentId))),
    getDoc(doc(db, parentCollection, parentId))
  ]);
  liked = likeSnap.exists();
  btnEl.classList.toggle("is-liked", liked);
  countEl.textContent = parentSnap.data()?.likeCount || 0;
  btnEl.disabled = false;

  btnEl.addEventListener("click", async () => {
    if (busy || !state.uid) return;
    busy = true;
    const optimistic = !liked;
    btnEl.classList.toggle("is-liked", optimistic);
    countEl.textContent = Math.max(0, Number(countEl.textContent) + (optimistic ? 1 : -1));
    try {
      liked = await toggleLike(parentType, parentId, parentCollection);
    } catch (e) {
      btnEl.classList.toggle("is-liked", liked);
      countEl.textContent = Math.max(0, Number(countEl.textContent) + (optimistic ? -1 : 1));
      showToast("Couldn't update — try again");
    } finally {
      busy = false;
    }
  });
}

const HEART_SVG = '<svg viewBox="0 0 24 24" class="like-icon"><path d="M12 20.5s-6.9-4.35-9.5-8.5C.9 9 1.9 4.9 5.6 4c2.2-.5 4 .6 5 2.1C11.6 4.6 13.4 3.5 15.6 4c3.7.9 4.7 5 2.1 8-2.6 4.15-9.5 8.5-9.5 8.5z"/></svg>';

export function likeButtonHtml() {
  return `<button type="button" class="like-btn">${HEART_SVG}<span class="like-count">0</span></button>`;
}
