import { db, doc, updateDoc, getMessagingIfSupported, getMessagingToken } from "./firebase-config.js";
import { state, showToast } from "./state.js";

// From Firebase Console > Project settings > Cloud Messaging > Web
// configuration > Web Push certificates. See SETUP.md.
const VAPID_KEY = "PASTE_VAPID_KEY_HERE";

export function initNotifications() {
  const btn = document.getElementById("notif-btn");
  if (!btn) return;

  if (!("Notification" in window) || !("serviceWorker" in navigator) || VAPID_KEY.startsWith("PASTE_")) {
    btn.hidden = true;
    return;
  }

  updateLabel();

  btn.addEventListener("click", async () => {
    if (Notification.permission === "denied") {
      showToast("Notifications are blocked — enable them in your browser's site settings");
      return;
    }
    const messaging = await getMessagingIfSupported();
    if (!messaging) {
      showToast("Notifications aren't supported on this browser");
      btn.hidden = true;
      return;
    }
    btn.disabled = true;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { updateLabel(); return; }
      const registration = await navigator.serviceWorker.ready;
      const token = await getMessagingToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      });
      if (token && state.uid) {
        await updateDoc(doc(db, "profiles", state.uid), { fcmToken: token });
        showToast("Reminders on — see you there! \u{1F514}");
      }
    } catch (e) {
      showToast("Couldn't enable notifications — try again");
    } finally {
      updateLabel();
    }
  });

  function updateLabel() {
    if (Notification.permission === "granted") {
      btn.textContent = "\u{1F514} Reminders on";
      btn.disabled = true;
    } else {
      btn.textContent = "\u{1F514} Get notified before each session";
      btn.disabled = false;
    }
  }
}
