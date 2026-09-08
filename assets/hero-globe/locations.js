/**
 * Global Presence globe — locations, route configs, and presentation helpers.
 * Coordinates use country-center positions from supplied reference.
 * All routes originate from Tanzania.
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

/** Canonical local flag assets used by every globe country label. */
export const COUNTRY_FLAGS = {
  tz: 'assets/images/flags/tz.svg',
  ke: 'assets/images/flags/ke.svg',
  zm: 'assets/images/flags/zm.svg',
  rw: 'assets/images/flags/rw.svg',
  bi: 'assets/images/flags/bi.svg',
  cd: 'assets/images/flags/cd.svg',
  et: 'assets/images/flags/et.svg',
  mz: 'assets/images/flags/mz.svg',
  ug: 'assets/images/flags/ug.svg',
  ae: 'assets/images/flags/ae.svg',
};

/**
 * Canonical country-center coordinates — from supplied reference.
 *
 * Arc altitudes are LOW to prevent visual tangling/looping.
 * Short routes (Kenya, Uganda, Rwanda, Burundi): 0.06–0.10
 * Medium routes (DR Congo, Zambia, Mozambique, Ethiopia): 0.12–0.20
 * Long route (UAE): 0.28
 *
 * Labels use semantic sides rather than arbitrary screen-space coordinates so
 * the projection remains stable as the globe and viewport resize.
 */
export const COUNTRY_LOCATIONS = {
  tz: { countryName: 'TANZANIA', flagSrc: COUNTRY_FLAGS.tz, lat: -6.7924, lng: 39.2083, labelSide: 'east', labelDistance: 20, arcAltitude: 0, hub: true },
  ke: { countryName: 'KENYA', flagSrc: COUNTRY_FLAGS.ke, lat: -1.2921, lng: 36.8219, labelSide: 'east', labelDistance: 22, arcAltitude: 0.07 },
  ug: { countryName: 'UGANDA', flagSrc: COUNTRY_FLAGS.ug, lat: 0.3476, lng: 32.5825, labelSide: 'west', labelDistance: 24, arcAltitude: 0.10 },
  rw: { countryName: 'RWANDA', flagSrc: COUNTRY_FLAGS.rw, lat: -1.9441, lng: 30.0619, labelSide: 'west', labelDistance: 26, arcAltitude: 0.12 },
  bi: { countryName: 'BURUNDI', flagSrc: COUNTRY_FLAGS.bi, lat: -3.3614, lng: 29.3599, labelSide: 'west', labelDistance: 28, arcAltitude: 0.14 },
  cd: { countryName: 'DR CONGO', flagSrc: COUNTRY_FLAGS.cd, lat: -4.4419, lng: 15.2663, labelSide: 'west', labelDistance: 22, arcAltitude: 0.18 },
  zm: { countryName: 'ZAMBIA', flagSrc: COUNTRY_FLAGS.zm, lat: -15.3875, lng: 28.3228, labelSide: 'west', labelDistance: 22, arcAltitude: 0.16 },
  mz: { countryName: 'MOZAMBIQUE', flagSrc: COUNTRY_FLAGS.mz, lat: -25.9692, lng: 32.5732, labelSide: 'east', labelDistance: 22, arcAltitude: 0.20 },
  et: { countryName: 'ETHIOPIA', flagSrc: COUNTRY_FLAGS.et, lat: 9.0300, lng: 38.7400, labelSide: 'east', labelDistance: 22, arcAltitude: 0.22 },
  ae: { countryName: 'UAE', flagSrc: COUNTRY_FLAGS.ae, lat: 24.4539, lng: 54.3773, labelSide: 'east', labelDistance: 22, arcAltitude: 0.30 },
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
      flagSrc: canonical.flagSrc,
      label: canonical.countryName,
      labelSide: canonical.labelSide,
      labelDistance: canonical.labelDistance,
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
      altitude: config.arcAltitude || 0.15,
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
