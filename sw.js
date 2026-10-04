/*
 * sw.js — service worker for the InnerTuning — Prana Calendar PWA.
 *
 * GOAL: when the app is updated, installed copies (home-screen PWAs)
 * pick up the new version automatically — no reinstall.
 *
 * HOW UPDATES REACH USERS (three layers, any one is enough):
 *  1. NETWORK-FIRST fetching. Every same-origin GET (HTML, JS, CSS, JSON,
 *     images) goes to the network first, bypassing the browser's HTTP
 *     cache, and the response is saved to the cache. The cache is only a
 *     fallback when the user is offline. So whenever a user is online they
 *     get the newest files — even if CACHE_VERSION was never bumped.
 *  2. VERSIONED CACHE. CACHE_VERSION below names the cache. Bumping it
 *     (do this on every release) changes this file's bytes, which makes
 *     the browser install a new worker; the new worker deletes all older
 *     caches on activation so no stale files linger.
 *  3. IMMEDIATE TAKEOVER. skipWaiting() + clients.claim() make the new
 *     worker take control right away, and the page (see the registration
 *     snippet in index.html) reloads once when control changes. The page
 *     also re-checks for a new sw.js on every launch/resume, which matters
 *     for home-screen PWAs that are resumed rather than freshly loaded.
 *
 * >>> RELEASE CHECKLIST: bump CACHE_VERSION below on every update. <<<
 */

const CACHE_VERSION = 'innertuning-2026-10-04-1';
const CACHE_NAME = 'pc-cache-' + CACHE_VERSION;

// Cached up front so the app shell opens offline. Failures here are
// tolerated (a missing file must never block an update from installing).
const PRECACHE_URLS = [
  './',
  'index.html',
  'manifest.json',
  'css/style.css',
  'js/emailjs-config.js',
  'js/julian.js',
  'js/moonphases.js',
  'js/panchanga.js',
  'js/nitya-data.js',
  'js/nakshatra-data.js',
  'js/sunrise.js',
  'js/timezone.js',
  'js/geocode.js',
  'js/nostril-schedule.js',
  'js/day-lord.js',
  'js/chakra.js',
  'js/chakra-quiz-data.js',
  'js/mantra-catalog.js',
  'js/translations.js',
  'js/share-card.js',
  'js/app.js',
  'images/prana-calendar-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.allSettled(
        PRECACHE_URLS.map((url) => cache.add(new Request(url, { cache: 'reload' })))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => k.startsWith('pc-cache-') && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Only same-origin; third-party scripts/APIs (Constant Contact, EmailJS,
  // geocoding) are left entirely to the browser.
  if (url.origin !== self.location.origin) return;
  // Never intercept the admin page/API or the dev server's live-reload.
  if (url.pathname.startsWith('/api/') || url.pathname.includes('admin') || url.pathname.includes('livereload')) return;
  // Audio/video use Range requests; the cache can't serve those correctly.
  if (req.headers.has('range')) return;

  event.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('index.html') : undefined))
      )
  );
});
