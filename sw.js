/*
 * Lake Group service worker.
 *
 * Lives at the site root so its scope covers every page. All URLs below
 * are relative, so the site keeps working if it is served from a subpath
 * (they resolve against this file's own location).
 *
 * Bump VERSION on any deploy that changes precached files; activation
 * deletes every cache from older versions.
 */

'use strict';

const VERSION = 'v56';

const PRECACHE = `lake-precache-${VERSION}`;
const PAGES_CACHE = `lake-pages-${VERSION}`;
const IMAGES_CACHE = `lake-images-${VERSION}`;
const ASSETS_CACHE = `lake-assets-${VERSION}`;
const KNOWN_CACHES = [PRECACHE, PAGES_CACHE, IMAGES_CACHE, ASSETS_CACHE];

const IMAGE_CACHE_MAX_ENTRIES = 150;

// Minimal app shell: enough to render the home page and the offline page
// with correct branding/fonts, plus the scripts every page depends on.
const PRECACHE_URLS = [
  './index.html',
  './offline.html',
  './404.html',
  // Pages linked from offline.html/404.html so their shells work offline.
  './about.html',
  './services.html',
  './africa-network.html',
  './contact.html',
  './manifest.webmanifest',
  './assets/pwa.js',
  './assets/site.js',
  './assets/skeleton.css',
  './assets/skeleton.js',
  // Design chrome is intentionally NOT precached: interiors depend on
  // flagship.css + tokens.css for the blue nav. Precaching them made
  // Checkpoint 001/002 deploys look "home-only new" for returning visitors.
  // They are fetched network-first below (and HTML links use ?v= busting).
  './assets/motion.js',
  './assets/flagship-motion.js',
  './assets/split-text.js',
  './assets/split-text.css',
  './assets/vendor/gsap/gsap.min.js',
  './assets/vendor/gsap/ScrollTrigger.min.js',
  './assets/i18n.js',
  './assets/i18n-content.js',
  // Offline knowledge assistant (present on every page).
  './assets/assistant.js',
  './assets/assistant.css',
  './assets/assistant-kb.js',
  './assets/vendor/flexsearch/flexsearch.bundle.min.js',
  './assets/images/logos/LAKE_GROUP_LOGO.png',
  './assets/icons/pwa/icon-192.png',
  './assets/icons/pwa/icon-512.png',
  './assets/fonts/fonts.css',
  './assets/fonts/files/bebas-neue-latin-400-normal.woff2',
  './assets/fonts/files/inter-latin-300-normal.woff2',
  './assets/fonts/files/inter-latin-400-normal.woff2',
  './assets/fonts/files/inter-latin-500-normal.woff2',
  './assets/fonts/files/inter-latin-600-normal.woff2',
  './assets/fonts/files/inter-latin-700-normal.woff2',
  './assets/fonts/files/inter-latin-800-normal.woff2',
  './assets/fonts/files/playfair-display-latin-400-normal.woff2',
  './assets/fonts/files/playfair-display-latin-400-italic.woff2',
  './assets/fonts/files/playfair-display-latin-500-normal.woff2',
  './assets/fonts/files/playfair-display-latin-600-normal.woff2',
  './assets/fonts/files/material-symbols-outlined-latin-400-normal.woff2',
];

const OFFLINE_URL = './offline.html';

/* ------------------------------------------------------------------ */
/* Install / activate                                                  */
/* ------------------------------------------------------------------ */

self.addEventListener('install', (event) => {
  // Activate immediately so a design-token deploy is not stuck behind a
  // "Refresh" toast while interiors keep serving stale flagship.css.
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Drop caches from previous versions.
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith('lake-') && !KNOWN_CACHES.includes(name))
          .map((name) => caches.delete(name))
      );
      await trimCache(IMAGES_CACHE, IMAGE_CACHE_MAX_ENTRIES);
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Keep a cache at or below maxEntries by deleting the oldest entries.
 * Cache keys are returned in insertion order, so this is LRU-ish:
 * long-cached entries go first.
 */
async function trimCache(cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length <= maxEntries) return;
    const excess = keys.slice(0, keys.length - maxEntries);
    await Promise.all(excess.map((request) => cache.delete(request)));
  } catch (err) {
    // Trimming is best-effort; never let it break request handling.
  }
}

function isCacheableResponse(response) {
  // Cache complete successful responses only (not errors, not 206 partials;
  // opaque responses never appear here because we only handle same-origin).
  return response && response.ok && response.status === 200;
}

async function putInCache(cacheName, request, response, maxEntries) {
  if (!isCacheableResponse(response)) return;
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
    if (maxEntries) {
      const keys = await cache.keys();
      if (keys.length > maxEntries + 10) {
        // Trim in batches (+10 slack) rather than on every single put.
        await trimCache(cacheName, maxEntries);
      }
    }
  } catch (err) {
    // Quota errors etc. are non-fatal.
  }
}

async function matchAnyCache(request, opts) {
  const hit = await caches.match(request, opts);
  return hit || null;
}

/* Strategies ---------------------------------------------------------- */

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    await putInCache(cacheName, request, response);
    return response;
  } catch (err) {
    const cached = await matchAnyCache(request, { ignoreSearch: request.mode === 'navigate' });
    if (cached) return cached;
    throw err;
  }
}

/** Always hit the network; never serve a cached copy of design chrome. */
async function networkOnly(request) {
  return fetch(request);
}

async function navigationHandler(request) {
  try {
    return await networkFirst(request, PAGES_CACHE);
  } catch (err) {
    // Directory-style URLs ("/" or ".../") are cached under index.html.
    const url = new URL(request.url);
    if (url.pathname.endsWith('/')) {
      const index = await caches.match(new URL('index.html', url).href);
      if (index) return index;
    }
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    return new Response('You are offline.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

async function cacheFirst(request, cacheName, maxEntries) {
  const cached = await matchAnyCache(request);
  if (cached) return cached;
  const response = await fetch(request);
  await putInCache(cacheName, request, response, maxEntries);
  return response;
}

async function staleWhileRevalidate(request, cacheName, maxEntries) {
  const cached = await matchAnyCache(request);
  const networkPromise = fetch(request)
    .then(async (response) => {
      await putInCache(cacheName, request, response, maxEntries);
      return response;
    })
    .catch(() => null);
  if (cached) return cached;
  const response = await networkPromise;
  if (response) return response;
  throw new Error('stale-while-revalidate: network failed and nothing cached');
}

/* Routing ------------------------------------------------------------- */

const AUTH_QUERY_PARAMS = /(^|[?&])(token|auth|key|apikey|api_key|signature|session|password)=/i;

// Gallery/showcase photo directories: fine to serve slightly stale while
// refreshing in the background.
const SWR_IMAGE_RE = /\/(assets\/images\/n-slider|lake-story-assets)\/|\/assets\/images\/[^?]*\/products\//;

function classify(request, url) {
  // HTML navigations: always freshest-first with offline fallback.
  if (request.mode === 'navigate' || request.destination === 'document') {
    return 'navigate';
  }

  const path = url.pathname;

  // Design chrome: network only (no stale cache fallback).
  // Interiors load nav/hero from flagship.css (+ tokens). Home also has large
  // inline nav rules, so a stale CSS cache made only interiors look "old".
  // hero-globe.bundle.js uses network-first (below) so first paint stays fresh
  // but the island still works offline after a successful visit.
  if (
    path.endsWith('/assets/news-data.js') ||
    path.endsWith('/assets/tokens.css') ||
    path.endsWith('/assets/theme.css') ||
    path.endsWith('/assets/flagship.css') ||
    path.endsWith('/assets/assistant.css') ||
    path.endsWith('/assets/motion.js') ||
    path.endsWith('/assets/flagship-motion.js') ||
    path.endsWith('/assets/site.js') ||
    path.endsWith('/sw.js')
  ) {
    return 'network-only-asset';
  }

  // Globe island: prefer network, fall back to cache for offline.
  if (path.endsWith('/assets/hero-globe.bundle.js')) {
    return 'network-first-asset';
  }

  // Fonts: immutable, cache forever.
  if (path.includes('/assets/fonts/')) return 'cache-first-asset';

  // Gallery / story / product photos: stale-while-revalidate.
  if (SWR_IMAGE_RE.test(path)) return 'swr-image';

  // All other images and icons: cache first.
  if (
    request.destination === 'image' ||
    path.includes('/assets/images/') ||
    path.includes('/assets/icons/') ||
    /\.(png|jpe?g|webp|gif|svg|ico|avif)$/i.test(path)
  ) {
    return 'cache-first-image';
  }

  // Vendor libraries: cache first (immutable, versioned by path).
  if (path.includes('/assets/vendor/')) {
    return 'cache-first-asset';
  }

  // Remaining same-origin static assets (site JS, i18n, data, manifest):
  // serve fast from cache, refresh in the background.
  return 'swr-asset';
}

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Never touch non-GET requests (forms, APIs, etc.).
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch (err) {
    return;
  }

  // Only handle http(s); leave extensions/blob/data requests alone.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Same-origin only. Every font/image on this site is self-hosted, so
  // cross-origin requests (analytics, embeds, ...) pass through untouched.
  if (url.origin !== self.location.origin) return;

  // Never cache anything that looks authenticated.
  if (AUTH_QUERY_PARAMS.test(url.search)) return;

  const route = classify(request, url);

  switch (route) {
    case 'navigate':
      event.respondWith(navigationHandler(request));
      break;
    case 'network-first-asset':
      event.respondWith(
        networkFirst(request, ASSETS_CACHE).catch(
          () => new Response('', { status: 503 })
        )
      );
      break;
    case 'network-only-asset':
      event.respondWith(
        networkOnly(request).catch(() => new Response('', { status: 503 }))
      );
      break;
    case 'cache-first-asset':
      event.respondWith(cacheFirst(request, ASSETS_CACHE));
      break;
    case 'cache-first-image':
      event.respondWith(cacheFirst(request, IMAGES_CACHE, IMAGE_CACHE_MAX_ENTRIES));
      break;
    case 'swr-image':
      event.respondWith(staleWhileRevalidate(request, IMAGES_CACHE, IMAGE_CACHE_MAX_ENTRIES));
      break;
    case 'swr-asset':
    default:
      event.respondWith(staleWhileRevalidate(request, ASSETS_CACHE));
      break;
  }
});
