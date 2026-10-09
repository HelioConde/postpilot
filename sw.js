// GitHub Pages hosts several independent apps on the same origin.
// PostPilot must never cache draft/profile URLs or delete another app's caches.
const CACHE_NAME = 'postpilot-shell-v2';
const APP_SHELL = [
  './', './index.html', './style.css', './app.js', './i18n.js',
  './pwa.js', './beta-feedback.js', './composer-assist.js',
  './ads.js', './ads-config.js', './supabase-config.js',
  './live-update.js', './static-page.js', './manifest.webmanifest',
  './icon.svg', './sobre.html', './privacidade.html',
  './termos.html', './contato.html'
];
const APP_SCOPE = new URL(self.registration.scope);
const SHELL_PATHS = new Set(APP_SHELL.map(file => new URL(file, self.registration.scope).pathname));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith('postpilot-shell-') && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== APP_SCOPE.origin || !url.pathname.startsWith(APP_SCOPE.pathname)) return;
  const isNavigation = request.mode === 'navigate';
  const canCache = !url.search && SHELL_PATHS.has(url.pathname);
  if (!canCache && !isNavigation) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(request);
      if (canCache && response.ok && response.type === 'basic') {
        await cache.put(request, response.clone());
      }
      return response;
    } catch {
      if (canCache) {
        const cached = await cache.match(request);
        if (cached) return cached;
      }
      if (isNavigation) {
        const shellPath = SHELL_PATHS.has(url.pathname)
          ? url.pathname
          : new URL('./index.html', APP_SCOPE).pathname;
        const offlineShell = await cache.match(APP_SCOPE.origin + shellPath);
        if (offlineShell) return offlineShell;
      }
      return Response.error();
    }
  })());
});
