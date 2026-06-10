// RialoPredict Service Worker — PWA offline shell caching
const CACHE   = "rialopred-v1";
const SHELL   = ["/", "/index.html", "/src/main.tsx", "/src/styles/globals.css"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  // Network-first for API calls; cache-first for static assets
  const url = new URL(e.request.url);
  if (url.pathname.startsWith("/api") || url.hostname.includes("rialo.io")) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});

// Push notifications for bet resolution
self.addEventListener("push", (e) => {
  const data = e.data?.json() ?? {};
  e.waitUntil(
    self.registration.showNotification(data.title || "RialoPredict", {
      body:  data.body  || "A market you bet on has resolved!",
      icon:  "/favicon.svg",
      badge: "/favicon.svg",
      data:  { url: data.url || "/" },
      actions: [
        { action: "claim", title: "Claim Winnings" },
        { action: "dismiss", title: "Dismiss" },
      ],
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  if (e.action === "claim") {
    e.waitUntil(clients.openWindow(e.notification.data.url));
  }
});
