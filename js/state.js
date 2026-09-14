// Shared app state + a tiny pub-sub so tab modules can react to
// profile changes without importing each other.
export const state = {
  uid: null,
  profile: null,
  currentTab: "home"
};

const listeners = new Set();

export function onProfileChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setProfile(profile) {
  state.profile = profile;
  listeners.forEach((fn) => fn(profile));
}

// Apply a Firestore QuerySnapshot's docChanges() to a DOM container
// incrementally instead of wiping+rebuilding it on every update — a full
// rebuild would destroy any open lightbox/expanded-comment state living
// inside the list. `renderItem(doc)` returns a new element carrying
// `data-id` set to doc.id; call sites only need to handle "added" and
// "removed" since these are append-only feeds (no "modified").
export function applyDocChanges(container, changes, renderItem) {
  changes.forEach((change) => {
    if (change.type === "added") {
      if (container.querySelector(`[data-id="${change.doc.id}"]`)) return;
      const node = renderItem(change.doc);
      const ref = container.children[change.newIndex] || null;
      container.insertBefore(node, ref);
    } else if (change.type === "removed") {
      const node = container.querySelector(`[data-id="${change.doc.id}"]`);
      if (node) node.remove();
    }
  });
}

export function showToast(message, ms = 2600) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { el.hidden = true; }, ms);
}
