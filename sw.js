// Uygulama dosyalarını önbelleğe alır; önce ağdan dener ki güncellemeler hemen gelsin, salonda internet yoksa önbellekten açılır.
const CACHE = 'gymlog-v8';
const ASSETS = [
  './',
  'index.html',
  'css/style.css',
  'js/app.js',
  'js/anim.js',
  'js/bodymap.js',
  'js/charts.js',
  'js/demo.js',
  'js/exercises.js',
  'js/format.js',
  'js/hero.js',
  'js/herogear.js',
  'js/hype.js',
  'js/i18n.js',
  'js/importer.js',
  'js/juice.js',
  'js/store.js',
  'js/timer.js',
  'js/ui.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true })),
  );
});
