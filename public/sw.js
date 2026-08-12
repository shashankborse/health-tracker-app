// Minimal service worker — exists only for PWA installability and to
// receive Web Push events (SPEC.md's 7:30am weight-log reminder). No
// caching/offline strategy: the app's own offlineQueue.ts already
// handles offline-resilient writes at the fetch-call level, and iOS
// Safari's install requirement is the only reason this file needs to
// exist at all.

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || "Health Tracker";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/weight" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/weight";
  event.waitUntil(self.clients.openWindow(url));
});
