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

/** Label color — off-white for clean, restrained map typography. */
export const LABEL_COLOR = 'rgba(255, 255, 255, 0.82)';

/**
 * Geographic label offset map.
 * Offsets shift the label away from the geographic point so names sit
 * over or near their country without overlapping neighbours.
 * [lngOffset, latOffset] in degrees.
 */
export const LABEL_OFFSETS = {
  tz: [0, -1.2],
  ke: [2.0, 1.0],
  ug: [-2.0, 0.8],
  rw: [-3.0, 0.2],
  bi: [-2.5, -1.0],
  cd: [-6.0, 2.5],
  zm: [-1.5, -2.5],
  mz: [2.5, -2.0],
  et: [2.5, 2.5],
  ae: [0, 0.5],
};

/**
 * Suggested route display order from Tanzania hub.
 * Only countries present in the CMS data will appear.
 */
export const ROUTE_ORDER = ['ke', 'ug', 'rw', 'bi', 'zm', 'cd', 'mz', 'et', 'ae'];

export function buildPoints(locations) {
  return locations.map((loc) => ({
    ...loc,
    size: loc.hub ? 0.5 : 0.22,
    color: BRAND_YELLOW,
  }));
}

export function buildArcs(locations) {
  const hq = locations.find((location) => location.hub);
  if (!hq) return [];

  // Sort destinations by ROUTE_ORDER; countries not in ROUTE_ORDER go last
  const orderMap = new Map(ROUTE_ORDER.map((id, i) => [id, i]));
  const destinations = locations
    .filter((location) => !location.hub)
    .sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));

  return destinations.map((loc) => ({
    startLat: hq.lat,
    startLng: hq.lng,
    endLat: loc.lat,
    endLng: loc.lng,
    color: BRAND_YELLOW,
    id: loc.id,
  }));
}

/**
 * Build labels with geographic offsets.
 * Each label is placed near the country with a small directional shift
 * so names don't pile up around the hub.
 */
export function buildLabels(locations) {
  const hq = locations.find((loc) => loc.hub);
  return locations
    .filter((loc) => !loc.hub)
    .map((loc) => {
      const offset = LABEL_OFFSETS[loc.id] || [0, 0];
      return {
        id: loc.id,
        lat: loc.lat + offset[1],
        lng: loc.lng + offset[0],
        text: (loc.countryName || loc.name || '').toUpperCase(),
        color: LABEL_COLOR,
        size: 0.35,
      };
    });
}

export function buildRings(locations) {
  const hq = locations.find((location) => location.hub);
  if (!hq) return [];
  return [
    {
      lat: hq.lat,
      lng: hq.lng,
      maxR: 3.0,
      propagationSpeed: 2.0,
      repeatPeriod: 1600,
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
