import React from 'react';
import { createRoot } from 'react-dom/client';
import HeroGlobe from './HeroGlobe.jsx';

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

export function mountHeroGlobe(selector) {
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
    root.render(<HeroGlobe panelEl={mount} />);
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

function autoMount() {
  mountHeroGlobe('#experience-3d-panel');
}

if (typeof window !== 'undefined') {
  window.LakeHeroGlobe = { mount: mountHeroGlobe };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMount, { once: true });
  } else {
    autoMount();
  }
}
