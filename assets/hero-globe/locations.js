/**
 * Lake Group operational footprint for the homepage globe.
 *
 * Coordinate sources:
 * - TZ HQ: Plot 49 Mikocheni Light Industrial Area (contact.html / prior
 *   hero-3d.js verified HQ), more precise than Dar city centroid.
 * - Other eight: city centres from the approved location table
 *   (contact pages list offices via HQ; no published lat/lng per country).
 */

export const TEX_BASE = 'assets/images/globe/';

export const TEX = {
  day: TEX_BASE + 'earth_day.jpg',
  bump: TEX_BASE + 'earth_topology.png',
};

/** Brand yellow — mirrors tokens.css --color-yellow-accent / --yellow */
export const BRAND_YELLOW = '#FFF200';
export const BRAND_YELLOW_SOFT = 'rgba(255, 242, 0, 0.55)';
export const BRAND_YELLOW_RING = (t) => `rgba(255, 242, 0, ${Math.max(0, 1 - t)})`;

export const LOCATIONS = [
  {
    id: 'tz',
    name: 'Tanzania HQ · Dar es Salaam',
    lat: -6.82,
    lng: 39.28,
    hub: true,
    source: 'Plot 49 Mikocheni (contact.html / prior hero-3d.js)',
  },
  {
    id: 'ke',
    name: 'Kenya · Nairobi',
    lat: -1.2921,
    lng: 36.8219,
    hub: false,
    source: 'approved city centre',
  },
  {
    id: 'zm',
    name: 'Zambia · Lusaka',
    lat: -15.3875,
    lng: 28.3228,
    hub: false,
    source: 'approved city centre',
  },
  {
    id: 'rw',
    name: 'Rwanda · Kigali',
    lat: -1.9403,
    lng: 29.8739,
    hub: false,
    source: 'approved city centre',
  },
  {
    id: 'bi',
    name: 'Burundi · Bujumbura',
    lat: -3.3822,
    lng: 29.3644,
    hub: false,
    source: 'approved city centre',
  },
  {
    id: 'cd',
    name: 'DRC · Kinshasa',
    lat: -4.4419,
    lng: 15.2663,
    hub: false,
    source: 'approved city centre',
  },
  {
    id: 'et',
    name: 'Ethiopia · Addis Ababa',
    lat: 9.0192,
    lng: 38.7525,
    hub: false,
    source: 'approved city centre',
  },
  {
    id: 'mz',
    name: 'Mozambique · Maputo',
    lat: -25.9692,
    lng: 32.5732,
    hub: false,
    source: 'approved city centre',
  },
  {
    id: 'ae',
    name: 'Dubai · UAE',
    lat: 25.277,
    lng: 55.2962,
    hub: false,
    source: 'approved city centre',
  },
];

export const HQ = LOCATIONS.find((l) => l.hub);

export function buildPoints() {
  return LOCATIONS.map((loc) => ({
    ...loc,
    size: loc.hub ? 0.55 : 0.28,
    color: BRAND_YELLOW,
  }));
}

export function buildArcs() {
  return LOCATIONS.filter((l) => !l.hub).map((loc, i) => ({
    startLat: HQ.lat,
    startLng: HQ.lng,
    endLat: loc.lat,
    endLng: loc.lng,
    color: BRAND_YELLOW,
    id: loc.id,
    dashInitialGap: (i * 0.17) % 1,
  }));
}

export function buildRings() {
  return [
    {
      lat: HQ.lat,
      lng: HQ.lng,
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
