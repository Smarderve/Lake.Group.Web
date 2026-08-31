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

/** Lake-blue route treatment: bright enough to read against terrain. */
export const ROUTE_BLUE_START = 'rgba(38, 169, 220, 0.72)';
export const ROUTE_BLUE_END = '#73d2f2';

/** Label color — white for strong readable map typography. */
export const LABEL_COLOR = 'rgba(255, 255, 255, 0.95)';

/**
 * Geographic label offset map.
 * Offsets shift the label away from the geographic point so names sit
 * over or near their country without overlapping neighbours.
 * [lngOffset, latOffset] in degrees.
 */
export const LABEL_OFFSETS = {
  tz: [0, -1.8],
  ke: [3.0, 1.5],
  ug: [-3.5, 1.5],
  rw: [-4.5, 0.5],
  bi: [-4.0, -1.5],
  cd: [-8.0, 3.0],
  zm: [-2.0, -3.0],
  mz: [3.0, -2.5],
  et: [3.5, 3.0],
  ae: [0, 0.8],
};

/**
 * Suggested route display order from Tanzania hub.
 * Only countries present in the CMS data will appear.
 */
export const ROUTE_ORDER = ['ke', 'ug', 'rw', 'bi', 'zm', 'cd', 'mz', 'et', 'ae'];
export const APPROVED_COUNTRY_IDS = new Set(['tz', ...ROUTE_ORDER]);

function approvedLocations(locations) {
  return locations.filter((location) => APPROVED_COUNTRY_IDS.has(location.id));
}

export function buildPoints(locations) {
  return approvedLocations(locations).map((loc) => ({
    ...loc,
    size: loc.hub ? 0.6 : 0.25,
    color: BRAND_YELLOW,
  }));
}

export function buildArcs(locations) {
  const approved = approvedLocations(locations);
  const hq = approved.find((location) => location.hub);
  if (!hq) return [];

  // Sort destinations by ROUTE_ORDER; countries not in ROUTE_ORDER go last
  const orderMap = new Map(ROUTE_ORDER.map((id, i) => [id, i]));
  const destinations = approved
    .filter((location) => !location.hub)
    .sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));

  return destinations.map((loc) => ({
    startLat: hq.lat,
    startLng: hq.lng,
    endLat: loc.lat,
    endLng: loc.lng,
    // Elevated arcs: longer routes rise higher so curves are visible from front.
    altitude: loc.id === 'ae' ? 0.48 : ['et', 'cd', 'mz', 'zm'].includes(loc.id) ? 0.36 : 0.28,
    progress: 0.001,
    id: loc.id,
  }));
}

/**
 * Build labels with geographic offsets.
 * Each label is placed near the country with a small directional shift
 * so names don't pile up around the hub.
 */
export function buildLabels(locations) {
  return approvedLocations(locations)
    .map((loc) => {
      const offset = LABEL_OFFSETS[loc.id] || [0, 0];
      return {
        id: loc.id,
        lat: loc.lat + offset[1],
        lng: loc.lng + offset[0],
        text: (loc.countryName || loc.name || '').toUpperCase(),
        color: loc.hub ? BRAND_YELLOW : LABEL_COLOR,
        // Larger labels for legibility; Tanzania is the origin hub.
        size: loc.hub ? 1.6 : 1.1,
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
