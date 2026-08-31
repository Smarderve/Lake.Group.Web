import React from 'react';
import { createRoot } from 'react-dom/client';
import HeroGlobe from './HeroGlobe.jsx';
import { APPROVED_COUNTRY_IDS, COUNTRY_REFERENCE_COORDINATES, COUNTRY_LOCATIONS } from './locations.js';

function showError(mount, message) {
  mount.classList.remove('is-loading');
  if (mount.querySelector('.experience-3d-error')) return;
  const note = document.createElement('p');
  note.className = 'experience-3d-error';
  note.textContent = message || '3D experience unavailable on this device.';
  mount.appendChild(note);
}

function ensureRoot(mount) {
  let root = mount.querySelector('#hero-globe-root');
  if (root) return root;
  root = document.createElement('div');
  root.id = 'hero-globe-root';
  root.setAttribute('aria-hidden', 'true');
  root.style.cssText =
    'position:absolute;inset:0;z-index:0;width:100%;height:100%;overflow:hidden;';
  mount.insertBefore(root, mount.firstChild);
  return root;
}

function webglAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch (_) {
    return false;
  }
}

export function publishedGlobeLocations(map) {
  return (map?.countries || []).map((country) => {
    const id = String(country.isoCode || country.id).toLowerCase();
    const coordinate = COUNTRY_REFERENCE_COORDINATES[id];
    if (!APPROVED_COUNTRY_IDS.has(id) || !coordinate) return null;
    return {
      id,
      name: String(country.name || ''),
      countryName: String(country.name || ''),
      lat: coordinate.lat,
      lng: coordinate.lng,
      hub: String(country.isoCode || '').toUpperCase() === 'TZ',
    };
  }).filter(Boolean);
}

export function mountHeroGlobe(selector, locations = []) {
  const mount =
    typeof selector === 'string'
      ? document.querySelector(selector)
      : selector || document.getElementById('experience-3d-panel');

  if (!mount) {
    console.warn('[hero-globe] #experience-3d-panel not found');
    return null;
  }

  if (mount.dataset.heroGlobeMounted === '1') {
    return mount.__heroGlobeRoot || null;
  }

  mount.classList.add('is-loading');
  mount.dataset.heroGlobeMounted = '1';

  if (!webglAvailable()) {
    showError(mount, 'WebGL is required for the globe experience.');
    return null;
  }

  const rootEl = ensureRoot(mount);

  try {
    const root = createRoot(rootEl);
    root.render(<HeroGlobe panelEl={mount} locations={locations} />);
    mount.__heroGlobeRoot = root;

    // Drop loading state once the first frame paints (textures may still stream).
    requestAnimationFrame(() => {
      mount.classList.remove('is-loading');
    });

    return root;
  } catch (err) {
    console.error('[hero-globe] mount failed', err);
    showError(mount, 'Unable to start the 3D globe.');
    return null;
  }
}

function fallbackLocations() {
  return Object.entries(COUNTRY_LOCATIONS).map(([id, loc]) => ({
    id,
    name: loc.countryName,
    countryName: loc.countryName,
    lat: loc.lat,
    lng: loc.lng,
    hub: !!loc.hub,
  }));
}

function autoMount() {
  var mount = document.getElementById('experience-3d-panel');
  if (!mount) return;

  /* Mount immediately with hardcoded locations so the Earth renders
     without waiting for the CMS content delivery promise.  If the
     CMS resolves later and provides different locations, we can
     re-render then — but the globe must never be blocked by it. */
  var locations = fallbackLocations();
  mountHeroGlobe('#experience-3d-panel', locations);

  /* CMS delivery must never restart the renderer after the base Earth is live. */
}

if (typeof window !== 'undefined') {
  window.LakeHeroGlobe = { mount: mountHeroGlobe };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMount, { once: true });
  } else {
    autoMount();
  }
}
