/*
 * Lake Group service worker.
 *
 * Lives at the site root so its scope covers every page. All URLs below
 * are relative, so the site keeps working if it is served from a subpath
 * (they resolve against this file's own location).
 *
 * Bump VERSION on any deploy that changes HTML, images, or precached files;
 * activation deletes every cache from older versions so offline matches online.
 *
 * v59: respect ?v= cache-busting (do not serve old images via ignoreSearch
 * while online), expand offline precache for Energies pages + hero photos,
 * and force navigation/network fetches to revalidate so soft reloads update.
 */

'use strict';

const VERSION = 'v59';

const PRECACHE = `lake-precache-${VERSION}`;
const PAGES_CACHE = `lake-pages-${VERSION}`;
const IMAGES_CACHE = `lake-images-${VERSION}`;
const ASSETS_CACHE = `lake-assets-${VERSION}`;
const KNOWN_CACHES = [PRECACHE, PAGES_CACHE, IMAGES_CACHE, ASSETS_CACHE];

const IMAGE_CACHE_MAX_ENTRIES = 180;
const ASSET_CACHE_MAX_ENTRIES = 100;

// Minimal app shell + frequently visited Energies pages + hero photos.
// Versioned CSS/JS URLs must match what HTML requests (?v=) so first paint hits.
const PRECACHE_URLS = [
  './index.html',
  './offline.html',
  './404.html',
  './about.html',
  './services.html',
  './africa-network.html',
  './contact.html',
  './gallery.html',
  './station-locator.html',
  './lake-oil.html',
  './lake-gas.html',
  './lake-lubes.html',
  './lake-aviation.html',
  './lake-steel.html',
  './lake-trans.html',
  './manifest.webmanifest',
  './assets/pwa.js?v=59',
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
  './assets/images/banner/LakeOil.jpg?v=81',
  './assets/images/banner/LakeOil1.jpg?v=81',
  './assets/images/lakeoil/current/station-lake-energies.jpg',
  './assets/images/lakeoil/current/depot-terminal.jpg',
  './assets/images/lakegas/ops/cylinders-yard.jpg?v=82',
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
            if (res && res.ok) await cache.put(url, res.clone());
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
      // Tell open tabs a fresh SW took over so they can reload to the new shell.
      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      clientsList.forEach((client) => {
        client.postMessage({ type: 'SW_ACTIVATED', version: VERSION });
      });
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

/**
 * Exact URL match first.
 * ignoreSearch is ONLY for offline recovery — never while we can still
 * fetch, or ?v= cache-busting is silently ignored and users keep old photos.
 */
async function matchAsset(request, { allowIgnoreSearch = false } = {}) {
  const exact = await matchAnyCache(request);
  if (exact) return exact;
  if (!allowIgnoreSearch) return null;
  return matchAnyCache(request, { ignoreSearch: true });
}

function hasVersionQuery(request) {
  try {
    return new URL(request.url).searchParams.has('v');
  } catch (err) {
    return false;
  }
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

function networkFetch(request) {
  // Bypass HTTP cache so soft navigations pick up deploys without hard refresh.
  return fetch(request, { cache: 'no-cache' });
}

/* Strategies ---------------------------------------------------------- */

async function networkFirst(request, cacheName, maxEntries) {
  try {
    const response = await networkFetch(request);
    await putInCache(cacheName, request, response, maxEntries);
    return response;
  } catch (err) {
    const cached =
      (await matchAsset(request, { allowIgnoreSearch: true })) ||
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
    const response = await networkFetch(request);
    if (isCacheableResponse(response)) {
      await putInCache(ASSETS_CACHE, request, response, ASSET_CACHE_MAX_ENTRIES);
      await putInCache(PRECACHE, request, response);
      return response;
    }
    const cached = await matchAsset(request, { allowIgnoreSearch: true });
    if (cached) return cached;
    if (isCss) return emergencyDesignResponse(true);
    return response;
  } catch (err) {
    const cached = await matchAsset(request, { allowIgnoreSearch: true });
    if (cached) return cached;
    return emergencyDesignResponse(isCss);
  }
}

/**
 * Stale-while-revalidate — but never treat a different ?v= as a hit while online.
 */
async function staleWhileRevalidate(request, cacheName, maxEntries) {
  const allowLoose = !hasVersionQuery(request);
  const cached = await matchAsset(request, { allowIgnoreSearch: allowLoose });
  const networkPromise = networkFetch(request)
    .then(async (response) => {
      await putInCache(cacheName, request, response, maxEntries);
      return response;
    })
    .catch(() => null);
  if (cached) {
    // Kick off refresh; return stale only when queryless / unversioned.
    networkPromise.catch(() => {});
    return cached;
  }
  const response = await networkPromise;
  if (response) return response;
  const offline = await matchAsset(request, { allowIgnoreSearch: true });
  if (offline) return offline;
  throw new Error('stale-while-revalidate: network failed and nothing cached');
}

async function navigationHandler(request) {
  try {
    return await networkFirst(request, PAGES_CACHE);
  } catch (err) {
    const url = new URL(request.url);
    // Prefer the exact page from any cache, then home, then offline shell.
    const pageHit =
      (await matchAsset(request, { allowIgnoreSearch: true })) ||
      (await caches.match(new URL(url.pathname.replace(/^\//, './'), self.location.href).href));
    if (pageHit) return pageHit;

    if (url.pathname.endsWith('/') || url.pathname === '' || /\/index\.html?$/i.test(url.pathname)) {
      const index = await caches.match(new URL('./index.html', self.location.href).href);
      if (index) return index;
    }
    const offline = await caches.match(new URL(OFFLINE_URL, self.location.href).href);
    if (offline) return offline;
    return new Response('You are offline.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

/**
 * Cache-first with exact URL matching. Versioned (?v=) URLs always hit the
 * network on miss so deploys replace photos instead of serving yesterday's.
 */
async function cacheFirst(request, cacheName, maxEntries) {
  const exact = await matchAsset(request, { allowIgnoreSearch: false });
  if (exact) return exact;
  try {
    const response = await networkFetch(request);
    await putInCache(cacheName, request, response, maxEntries);
    return response;
  } catch (err) {
    const loose = await matchAsset(request, { allowIgnoreSearch: true });
    if (loose) return loose;
    throw err;
  }
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
