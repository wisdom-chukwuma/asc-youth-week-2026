/* Worship The King — service worker.
   Two jobs in one file (one SW per scope): app-shell caching for fast/
   offline loads, and Firebase Cloud Messaging background push. */

importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

// Mirrors js/firebase-config.js — a classic service worker can't import
// our ES module, so this small config is duplicated. Keep both in sync
// if the Firebase project ever changes.
firebase.initializeApp({
  apiKey: "AIzaSyAwJXyrfFUsGdpDOsjoZ4hJLtHqgHgvs8U",
  authDomain: "asc-youth-week-2026.firebaseapp.com",
  projectId: "asc-youth-week-2026",
  storageBucket: "asc-youth-week-2026.firebasestorage.app",
  messagingSenderId: "330796924622",
  appId: "1:330796924622:web:4c77832ad5fa20c3491a9f"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "Worship The King";
  const body = payload.notification?.body || "";
  self.registration.showNotification(title, {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/favicon-32.png"
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("/"));
});

// ---------- App shell caching ----------

const CACHE_NAME = "wtk-shell-v1";
const SHELL_FILES = [
  "/", "/index.html", "/manifest.json",
  "/css/styles.css",
  "/js/app.js", "/js/board.js", "/js/card.js", "/js/data.js",
  "/js/engage.js", "/js/firebase-config.js", "/js/notifications.js", "/js/state.js", "/js/wall.js",
  "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png",
  "/icons/favicon-32.png", "/icons/favicon-16.png", "/icons/favicon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Only manage our own static shell — Firebase/CDN calls pass straight through.
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== "GET") return;
  if (!SHELL_FILES.includes(url.pathname)) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((resp) => {
          if (resp.ok) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resp.clone()));
          return resp;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
