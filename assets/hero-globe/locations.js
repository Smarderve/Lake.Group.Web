/** Homepage globe presentation helpers for published operations data. */

export const TEX_BASE = 'assets/images/globe/';

export const TEX = {
  day: TEX_BASE + 'earth_day.jpg',
  bump: TEX_BASE + 'earth_topology.png',
};

/** Brand yellow — mirrors tokens.css --color-yellow-accent / --yellow */
export const BRAND_YELLOW = '#FFF200';
export const BRAND_YELLOW_SOFT = 'rgba(255, 242, 0, 0.55)';
export const BRAND_YELLOW_RING = (t) => `rgba(255, 242, 0, ${Math.max(0, 1 - t)})`;

export function buildPoints(locations) {
  return locations.map((loc) => ({
    ...loc,
    size: loc.hub ? 0.55 : 0.28,
    color: BRAND_YELLOW,
  }));
}

export function buildArcs(locations) {
  const hq = locations.find((location) => location.hub);
  if (!hq) return [];
  return locations.filter((location) => !location.hub).map((loc) => ({
    startLat: hq.lat,
    startLng: hq.lng,
    endLat: loc.lat,
    endLng: loc.lng,
    color: BRAND_YELLOW,
    id: loc.id,
  }));
}

export function buildRings(locations) {
  const hq = locations.find((location) => location.hub);
  if (!hq) return [];
  return [
    {
      lat: hq.lat,
      lng: hq.lng,
      maxR: 3.2,
      propagationSpeed: 2.2,
      repeatPeriod: 1400,
    },
  ];
}

export function readBrandYellow() {
  try {
    const styles = getComputedStyle(document.documentElement);
    const fromAccent = styles.getPropertyValue('--color-yellow-accent').trim();
    const fromYellow = styles.getPropertyValue('--yellow').trim();
    const raw = fromAccent || fromYellow;
    if (raw && /^#|^rgb/.test(raw)) return raw;
  } catch (_) {
    /* ignore */
  }
  return BRAND_YELLOW;
}

export function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (_) {
    return false;
  }
}
