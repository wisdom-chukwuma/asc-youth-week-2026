import { db, doc, updateDoc, addDoc, collection, query, where, orderBy, limit, onSnapshot, serverTimestamp, increment } from "./firebase-config.js";
import { POINTS, todaySchedule } from "./data.js";
import { state, showToast } from "./state.js";

export function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

export async function postComment(parentType, parentId, text, statusEl) {
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

export function renderCommentList(container, comments) {
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

export function subscribeComments(parentType, parentId, listEl) {
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
