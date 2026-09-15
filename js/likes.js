import { db, doc, getDoc, setDoc, deleteDoc, updateDoc, onSnapshot, increment, arrayUnion, serverTimestamp } from "./firebase-config.js";
import { state, showToast } from "./state.js";
import { POINTS, todaySchedule } from "./data.js";

function likeDocId(parentType, parentId) {
  return `${parentType}_${parentId}_${state.uid}`;
}

// Points are only ever awarded the first time a person likes a given
// item — unliking and re-liking it (or spamming the toggle) earns
// nothing further. `likedForPoints` only ever grows, even though the
// like itself can be removed, so it survives an unlike/relike cycle.
async function awardLikePoints(parentType, parentId) {
  if (!state.profile) return;
  const key = `${parentType}_${parentId}`;
  if (state.profile.likedForPoints?.includes(key)) return;
  const day = todaySchedule()?.day || 0;
  const dayCount = state.profile.likeCounts?.[day] || 0;
  if (dayCount >= POINTS.likeDailyCap) return;

  // Optimistic local guard so a fast burst of likes can't double-award
  // before the profile snapshot echoes the write back.
  state.profile.likedForPoints = [...(state.profile.likedForPoints || []), key];
  state.profile.likeCounts = { ...(state.profile.likeCounts || {}), [day]: dayCount + 1 };
  try {
    await updateDoc(doc(db, "profiles", state.uid), {
      points: increment(POINTS.like),
      likedForPoints: arrayUnion(key),
      [`likeCounts.${day}`]: increment(1)
    });
    showToast(`+${POINTS.like} pt — thanks for the love`);
  } catch (e) { /* non-critical, the like itself already succeeded */ }
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
  awardLikePoints(parentType, parentId);
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

const HEART_ICONS = '<i class="ph ph-heart like-icon like-icon-outline"></i><i class="ph-fill ph-heart like-icon like-icon-fill"></i>';

export function likeButtonHtml() {
  return `<button type="button" class="like-btn">${HEART_ICONS}<span class="like-count">0</span></button>`;
}
