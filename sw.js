/*
 * Lake Group service worker.
 *
 * Lives at the site root so its scope covers every page. All URLs below
 * are relative, so the site keeps working if it is served from a subpath
 * (they resolve against this file's own location).
 *
 * Bump VERSION on any deploy that changes precached files; activation
 * deletes every cache from older versions.
 *
 * v58 root-cause fix: design CSS (tokens/theme/flagship) must NEVER be
 * served as an empty 503 body. That left --nav-logo-height unset and blew
 * the yellow Lake Group logo across the homepage when a fetch blipped or
 * an old SW intercepted CSS. Prefer network, keep a cache fallback, and
 * if both fail return an emergency chrome CSS snippet with logo tokens.
 */

'use strict';

const VERSION = 'v58';

const PRECACHE = `lake-precache-${VERSION}`;
const PAGES_CACHE = `lake-pages-${VERSION}`;
const IMAGES_CACHE = `lake-images-${VERSION}`;
const ASSETS_CACHE = `lake-assets-${VERSION}`;
const KNOWN_CACHES = [PRECACHE, PAGES_CACHE, IMAGES_CACHE, ASSETS_CACHE];

const IMAGE_CACHE_MAX_ENTRIES = 150;
const ASSET_CACHE_MAX_ENTRIES = 80;

// Minimal app shell: home + offline + design chrome + scripts every page needs.
// Versioned CSS URLs must match what HTML requests (?v=) so first paint hits.
const PRECACHE_URLS = [
  './index.html',
  './offline.html',
  './404.html',
  './about.html',
  './services.html',
  './africa-network.html',
  './contact.html',
  './manifest.webmanifest',
  './assets/pwa.js?v=58',
  './assets/site.js?v=58',
  './assets/tokens.css?v=58',
  './assets/theme.css?v=73',
  './assets/flagship.css?v=73',
  './assets/skeleton.css?v=3',
  './assets/skeleton.js?v=3',
  './assets/motion.js?v=58',
  './assets/flagship-motion.js?v=58',
  './assets/split-text.js',
  './assets/split-text.css',
  './assets/vendor/gsap/gsap.min.js',
  './assets/vendor/gsap/ScrollTrigger.min.js',
  './assets/i18n.js?v=58',
  './assets/i18n-content.js?v=58',
  './assets/assistant.js?v=60',
  './assets/assistant.css?v=60',
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

/** Last-resort CSS so a total design-chrome miss cannot inflate the nav logo. */
const EMERGENCY_DESIGN_CSS = [
  ':root{',
  '--navbar-height:72px;',
  '--navbar-height-scrolled:60px;',
  '--nav-logo-height:48px;',
  '--nav-logo-height-scrolled:36px;',
  '--nav-logo-letterbox-scale:1.15;',
  '--nav-h:72px;',
  '}',
  '.nav-logo img,.site-nav .nav-logo img{',
  'height:48px!important;width:auto!important;',
  'max-width:min(220px,55vw)!important;max-height:48px!important;',
  'object-fit:contain;display:block;',
  '}',
  '.site-nav.nav-scrolled .nav-logo img{',
  'height:36px!important;max-height:36px!important;',
  'max-width:min(200px,50vw)!important;',
  '}',
].join('');

/* ------------------------------------------------------------------ */
/* Install / activate                                                  */
/* ------------------------------------------------------------------ */

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE);
      // Precache individually so one 404 does not abort the whole install
      // (addAll is all-or-nothing and can leave users on a broken old SW).
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            const res = await fetch(url, { cache: 'reload' });
            if (res && res.ok) await cache.put(url, res);
          } catch (err) {
            // Best-effort; missing optional assets must not block activation.
          }
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith('lake-') && !KNOWN_CACHES.includes(name))
          .map((name) => caches.delete(name))
      );
      await trimCache(IMAGES_CACHE, IMAGE_CACHE_MAX_ENTRIES);
      await trimCache(ASSETS_CACHE, ASSET_CACHE_MAX_ENTRIES);
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data.type === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith('lake-'))
            .map((name) => caches.delete(name))
        )
      )
    );
  }
});

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

async function trimCache(cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length <= maxEntries) return;
    const excess = keys.slice(0, keys.length - maxEntries);
    await Promise.all(excess.map((request) => cache.delete(request)));
  } catch (err) {
    /* best-effort */
  }
}

function isCacheableResponse(response) {
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
        await trimCache(cacheName, maxEntries);
      }
    }
  } catch (err) {
    /* quota etc. */
  }
}

async function matchAnyCache(request, opts) {
  const hit = await caches.match(request, opts);
  return hit || null;
}

/** Exact match, then same path ignoring ?v= for offline recovery. */
async function matchAsset(request) {
  const exact = await matchAnyCache(request);
  if (exact) return exact;
  return matchAnyCache(request, { ignoreSearch: true });
}

function emergencyDesignResponse(isCss) {
  if (isCss) {
    return new Response(EMERGENCY_DESIGN_CSS, {
      status: 200,
      headers: {
        'Content-Type': 'text/css; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Lake-Emergency-Chrome': '1',
      },
    });
  }
  return new Response('/* lake emergency: empty js */', {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

/* Strategies ---------------------------------------------------------- */

async function networkFirst(request, cacheName, maxEntries) {
  try {
    const response = await fetch(request);
    await putInCache(cacheName, request, response, maxEntries);
    return response;
  } catch (err) {
    const cached =
      (await matchAsset(request)) ||
      (await matchAnyCache(request, {
        ignoreSearch: request.mode === 'navigate',
      }));
    if (cached) return cached;
    throw err;
  }
}

/**
 * Network-first for design chrome / versioned CSS+JS.
 * Never return an empty body on failure — fall back to any cached copy
 * (including ignoreSearch), then emergency logo-safe CSS.
 */
async function networkFirstAsset(request) {
  const isCss = new URL(request.url).pathname.endsWith('.css');
  try {
    const response = await fetch(request);
    if (isCacheableResponse(response)) {
      await putInCache(ASSETS_CACHE, request, response, ASSET_CACHE_MAX_ENTRIES);
      await putInCache(PRECACHE, request, response);
      return response;
    }
    const cached = await matchAsset(request);
    if (cached) return cached;
    if (isCss) return emergencyDesignResponse(true);
    return response;
  } catch (err) {
    const cached = await matchAsset(request);
    if (cached) return cached;
    return emergencyDesignResponse(isCss);
  }
}

/**
 * Stale-while-revalidate for already-cached fonts/vendor/images — fast paint,
 * background refresh so repeat visits do not re-block on the network.
 */
async function staleWhileRevalidate(request, cacheName, maxEntries) {
  const cached = await matchAsset(request);
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

async function navigationHandler(request) {
  try {
    return await networkFirst(request, PAGES_CACHE);
  } catch (err) {
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
  const cached = await matchAsset(request);
  if (cached) return cached;
  const response = await fetch(request);
  await putInCache(cacheName, request, response, maxEntries);
  return response;
}

/* Routing ------------------------------------------------------------- */

const AUTH_QUERY_PARAMS = /(^|[?&])(token|auth|key|apikey|api_key|signature|session|password)=/i;

const SWR_IMAGE_RE =
  /\/(assets\/images\/n-slider|lake-story-assets)\/|\/assets\/images\/[^?]*\/products\//;

/** Critical design / layout assets — always freshest-first with cache fallback. */
const DESIGN_CHROME_RE =
  /\/assets\/(tokens|theme|flagship|assistant|skeleton|split-text|LogoLoop|ui-icons)\.(css|js)$|\/assets\/(site|motion|flagship-motion|pwa|i18n|i18n-content|assistant|assistant-kb|news-data|news)\.js$/;

function classify(request, url) {
  if (request.mode === 'navigate' || request.destination === 'document') {
    return 'navigate';
  }

  const path = url.pathname;

  // Never cache the worker itself through SW strategies.
  if (path.endsWith('/sw.js')) return 'network-only-passthrough';

  if (DESIGN_CHROME_RE.test(path) || path.endsWith('/assets/components/LogoLoop.css')) {
    return 'network-first-design';
  }

  if (path.endsWith('/assets/hero-globe.bundle.js')) {
    return 'network-first-asset';
  }

  if (path.includes('/assets/fonts/')) return 'cache-first-asset';

  if (SWR_IMAGE_RE.test(path)) return 'swr-image';

  if (
    request.destination === 'image' ||
    path.includes('/assets/images/') ||
    path.includes('/assets/icons/') ||
    /\.(png|jpe?g|webp|gif|svg|ico|avif)$/i.test(path)
  ) {
    return 'cache-first-image';
  }

  if (path.includes('/assets/vendor/')) {
    return 'cache-first-asset';
  }

  // Remaining same-origin CSS/JS: stale-while-revalidate (fast + updates).
  if (/\.(css|js|mjs|json|webmanifest)$/i.test(path) || path.endsWith('/manifest.webmanifest')) {
    return 'swr-asset';
  }

  return 'swr-asset';
}

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch (err) {
    return;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (url.origin !== self.location.origin) return;
  if (AUTH_QUERY_PARAMS.test(url.search)) return;

  const route = classify(request, url);

  switch (route) {
    case 'navigate':
      event.respondWith(navigationHandler(request));
      break;
    case 'network-first-design':
      event.respondWith(networkFirstAsset(request));
      break;
    case 'network-first-asset':
      event.respondWith(
        networkFirst(request, ASSETS_CACHE, ASSET_CACHE_MAX_ENTRIES).catch(
          () => new Response('', { status: 503 })
        )
      );
      break;
    case 'network-only-passthrough':
      // Let the browser fetch sw.js directly (no respondWith).
      break;
    case 'cache-first-asset':
      event.respondWith(cacheFirst(request, ASSETS_CACHE, ASSET_CACHE_MAX_ENTRIES));
      break;
    case 'cache-first-image':
      event.respondWith(cacheFirst(request, IMAGES_CACHE, IMAGE_CACHE_MAX_ENTRIES));
      break;
    case 'swr-image':
      event.respondWith(staleWhileRevalidate(request, IMAGES_CACHE, IMAGE_CACHE_MAX_ENTRIES));
      break;
    case 'swr-asset':
    default:
      event.respondWith(staleWhileRevalidate(request, ASSETS_CACHE, ASSET_CACHE_MAX_ENTRIES));
      break;
  }
});
