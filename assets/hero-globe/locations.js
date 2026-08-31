/**
 * Global Presence globe — locations, route configs, and presentation helpers.
 * Every coordinate uses a real city anchor for geographic accuracy.
 * City names are INTERNAL ONLY — the UI shows only country names.
 * All routes originate from Tanzania (Dar es Salaam).
 */

export const TEX_BASE = 'assets/images/globe/';

export const TEX = {
  day: TEX_BASE + 'earth_day.jpg',
  bump: TEX_BASE + 'earth_topology.png',
};

/** Brand yellow — mirrors tokens.css --color-yellow-accent / --yellow */
export const BRAND_YELLOW = '#FFF200';
export const ROUTE_YELLOW = BRAND_YELLOW;

/**
 * Sequential destination order from the Tanzania hub.
 * Animation proceeds in this exact order, one destination at a time.
 */
export const ROUTE_ORDER = ['ke', 'ug', 'rw', 'bi', 'cd', 'zm', 'mz', 'et', 'ae'];
export const APPROVED_COUNTRY_IDS = new Set(['tz', ...ROUTE_ORDER]);

/**
 * Canonical city anchors — real geographic coordinates.
 * Arc altitudes scale with distance. Arc curves separate overlapping routes.
 * labelOffset is screen-space pixel offset for readability.
 */
export const COUNTRY_LOCATIONS = {
  tz: { cityAnchor: 'Dar es Salaam', countryName: 'TANZANIA', lat: -6.7924, lng: 39.2083, labelOffset: [12, 18], arcAltitude: 0, arcCurve: 0, hub: true },
  ke: { cityAnchor: 'Nairobi', countryName: 'KENYA', lat: -1.2921, lng: 36.8219, labelOffset: [14, -16], arcAltitude: 0.12, arcCurve: -0.3 },
  ug: { cityAnchor: 'Kampala', countryName: 'UGANDA', lat: 0.3476, lng: 32.5825, labelOffset: [-58, -20], arcAltitude: 0.16, arcCurve: -0.4 },
  rw: { cityAnchor: 'Kigali', countryName: 'RWANDA', lat: -1.9441, lng: 30.0619, labelOffset: [-56, 4], arcAltitude: 0.18, arcCurve: -0.5 },
  bi: { cityAnchor: 'Bujumbura', countryName: 'BURUNDI', lat: -3.3614, lng: 29.3599, labelOffset: [-64, 22], arcAltitude: 0.20, arcCurve: -0.5 },
  cd: { cityAnchor: 'Kinshasa', countryName: 'DR CONGO', lat: -4.4419, lng: 15.2663, labelOffset: [-68, 4], arcAltitude: 0.32, arcCurve: -0.6 },
  zm: { cityAnchor: 'Lusaka', countryName: 'ZAMBIA', lat: -15.3875, lng: 28.3228, labelOffset: [-56, 22], arcAltitude: 0.28, arcCurve: -0.4 },
  mz: { cityAnchor: 'Maputo', countryName: 'MOZAMBIQUE', lat: -25.9692, lng: 32.5732, labelOffset: [14, 18], arcAltitude: 0.35, arcCurve: 0.5 },
  et: { cityAnchor: 'Addis Ababa', countryName: 'ETHIOPIA', lat: 8.9806, lng: 38.7578, labelOffset: [14, -16], arcAltitude: 0.38, arcCurve: -0.3 },
  ae: { cityAnchor: 'Abu Dhabi', countryName: 'UAE', lat: 24.4539, lng: 54.3773, labelOffset: [14, -16], arcAltitude: 0.55, arcCurve: -0.2 },
};

export const COUNTRY_REFERENCE_COORDINATES = Object.fromEntries(
  Object.entries(COUNTRY_LOCATIONS).map(([id, loc]) => [
    id,
    { lat: loc.lat, lng: loc.lng },
  ]),
);

function approvedLocations(locations) {
  return locations.filter((loc) => APPROVED_COUNTRY_IDS.has(loc.id));
}

export function buildMarkers(locations) {
  return approvedLocations(locations).map((loc) => {
    const canonical = COUNTRY_LOCATIONS[loc.id];
    return {
      ...loc,
      countryName: canonical.countryName,
      labelOffset: canonical.labelOffset,
      hub: !!canonical.hub,
    };
  });
}

export function buildArcs(locations) {
  const approved = approvedLocations(locations);
  const hq = approved.find((loc) => loc.hub);
  if (!hq) return [];

  const orderMap = new Map(ROUTE_ORDER.map((id, i) => [id, i]));
  const destinations = approved
    .filter((loc) => !loc.hub)
    .sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));

  return destinations.map((loc) => {
    const config = COUNTRY_LOCATIONS[loc.id] || {};
    return {
      startLat: hq.lat,
      startLng: hq.lng,
      endLat: loc.lat,
      endLng: loc.lng,
      altitude: config.arcAltitude || 0.3,
      arcCurve: config.arcCurve || 0,
      id: loc.id,
    };
  });
}

export function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (_) {
    return false;
  }
}
