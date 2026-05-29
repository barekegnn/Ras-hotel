// Service Worker cleanup script
// Unregisters any old service workers (from next-pwa@5) and clears stale caches.
// This runs once on page load before the new SW registers.
(function () {
  if (!('serviceWorker' in navigator)) return;

  // Unregister all service workers that are NOT the current /sw.js
  navigator.serviceWorker.getRegistrations().then(function (registrations) {
    registrations.forEach(function (reg) {
      var swUrl = reg.active && reg.active.scriptURL;
      // Keep only the current sw.js; remove everything else (old workbox SWs)
      if (!swUrl || !swUrl.endsWith('/sw.js')) {
        reg.unregister();
      }
    });
  });

  // Clear all caches that belong to old next-pwa@5 (they use different cache names)
  if ('caches' in window) {
    caches.keys().then(function (keys) {
      keys.forEach(function (key) {
        // Old next-pwa@5 cache names start with "workbox-precache" or "next-data"
        if (
          key.startsWith('workbox-precache') ||
          key.startsWith('next-data') ||
          key.startsWith('pages-cache') ||
          key.startsWith('start-url')
        ) {
          caches.delete(key);
        }
      });
    });
  }
})();
