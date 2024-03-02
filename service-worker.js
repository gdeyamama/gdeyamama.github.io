const cacheName = "gdeyamama-v4";

const files = [
  "/icons/120x120.png",
  "/icons/128x128.png",
  "/icons/144x144.png",
  "/icons/152x152.png",
  "/icons/16x16.png",
  "/icons/180x180.png",
  "/icons/192x192.png",
  "/icons/32x32.png",
  "/icons/384x384.png",
  "/icons/512x512.png",
  "/icons/72x72.png",
  "/icons/96x96.png",
  
  "/img/logo512.png",

  "/libs/leaflet/leaflet.js",
  "/libs/leaflet/leaflet-offline.js",
  "/libs/leaflet/leaflet.css",
  
  "/index.html",
  "/upload-gpx.html",
  "/view.html",
  "/list.html",
  
  "/manifest.json",

  "/styles.css",
  
  "/utils.js",
  "/calculations.js",
  "/chart.js",
  "/firebase.js",
  "/gpxParser.js",
  "/header.js",
  "/mapDrawer.js",
  "/register-sw.js",
  "/scripts.js",
  "/service-worker.js",
  "/install.js"
];

self.addEventListener("install", (e) => {
  console.log("[Service Worker] Install");
  e.waitUntil(
    (async () => {
      const cache = await caches.open(cacheName);
      console.log("[Service Worker] Caching all: app shell and content");
      await cache.addAll(files);
    })(),
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    (async () => {
      const r = await caches.match(e.request);
      console.log(`[Service Worker] Fetching resource: ${e.request.url}`);
      if (r) {
        return r;
      }
      const response = await fetch(e.request);
      const cache = await caches.open(cacheName);
      console.log(`[Service Worker] Caching new resource: ${e.request.url}`);
      cache.put(e.request, response.clone());
      return response;
    })(),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key === cacheName) {
            return;
          }
          return caches.delete(key);
        }),
      );
    }),
  );
});
