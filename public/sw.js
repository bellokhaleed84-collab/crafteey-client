const CACHE_NAME = "crafteey-client-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Pass-through fetch — no offline caching yet, just enough
  // to satisfy PWA installability checks.
  event.respondWith(fetch(event.request));
});