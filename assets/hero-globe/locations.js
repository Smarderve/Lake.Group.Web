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

/**
 * Canonical country-center coordinates — from supplied reference.
 *
 * Arc altitudes are LOW to prevent visual tangling/looping.
 * Short routes (Kenya, Uganda, Rwanda, Burundi): 0.06–0.10
 * Medium routes (DR Congo, Zambia, Mozambique, Ethiopia): 0.12–0.20
 * Long route (UAE): 0.28
 *
 * labelOffset is screen-space pixel offset for readability only.
 */
export const COUNTRY_LOCATIONS = {
  tz: { countryName: 'TANZANIA', flag: '🇹🇿', lat: -5.8000, lng: 34.8888, labelOffset: [12, 18], mobileLabelOffset: [16, 18], arcAltitude: 0, hub: true },
  ke: { countryName: 'KENYA', flag: '🇰🇪', lat: -0.0236, lng: 37.9062, labelOffset: [14, -16], mobileLabelOffset: [18, -24], arcAltitude: 0.035, routeLane: [-0.35, 0.45] },
  ug: { countryName: 'UGANDA', flag: '🇺🇬', lat: 1.3733, lng: 32.2903, labelOffset: [-58, -20], mobileLabelOffset: [-64, -34], arcAltitude: 0.09, routeLane: [1.1, -1.6] },
  rw: { countryName: 'RWANDA', flag: '🇷🇼', lat: -1.9403, lng: 29.8739, labelOffset: [-56, 4], mobileLabelOffset: [-82, 0], arcAltitude: 0.10, routeLane: [-0.8, -2.1] },
  bi: { countryName: 'BURUNDI', flag: '🇧🇮', lat: -3.3731, lng: 29.9189, labelOffset: [-64, 22], mobileLabelOffset: [-86, 28], arcAltitude: 0.11, routeLane: [-1.8, -2.25] },
  cd: { countryName: 'DR CONGO', flag: '🇨🇩', lat: -2.8628, lng: 23.6560, labelOffset: [-68, 4], mobileLabelOffset: [-86, 8], arcAltitude: 0.18, routeLane: [0.7, -4.0] },
  zm: { countryName: 'ZAMBIA', flag: '🇿🇲', lat: -13.1339, lng: 27.8493, labelOffset: [-56, 22], mobileLabelOffset: [-64, 30], arcAltitude: 0.16, routeLane: [-2.4, -2.1] },
  mz: { countryName: 'MOZAMBIQUE', flag: '🇲🇿', lat: -18.6657, lng: 35.5296, labelOffset: [14, 18], mobileLabelOffset: [18, 28], arcAltitude: 0.20, routeLane: [-2.1, 2.4] },
  et: { countryName: 'ETHIOPIA', flag: '🇪🇹', lat: 9.1450, lng: 40.4897, labelOffset: [14, -16], mobileLabelOffset: [18, -24], arcAltitude: 0.27, routeLane: [1.8, 4.5] },
  ae: { countryName: 'UAE', flag: '🇦🇪', lat: 23.4241, lng: 53.8478, labelOffset: [14, -16], mobileLabelOffset: [18, -24], arcAltitude: 0.32, routeLane: [3.2, 5.5] },
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
      label: `${canonical.flag} ${canonical.countryName}`,
      labelOffset: canonical.labelOffset,
      mobileLabelOffset: canonical.mobileLabelOffset,
      hub: !!canonical.hub,
    };
  });
}

function sphericalMidpoint(start, end) {
  const toVector = ({ lat, lng }) => {
    const phi = lat * Math.PI / 180;
    const theta = lng * Math.PI / 180;
    return [Math.cos(phi) * Math.cos(theta), Math.sin(phi), Math.cos(phi) * Math.sin(theta)];
  };
  const [ax, ay, az] = toVector(start);
  const [bx, by, bz] = toVector(end);
  const length = Math.hypot(ax + bx, ay + by, az + bz);
  const x = (ax + bx) / length;
  const y = (ay + by) / length;
  const z = (az + bz) / length;
  return {
    lat: Math.atan2(y, Math.hypot(x, z)) * 180 / Math.PI,
    lng: Math.atan2(z, x) * 180 / Math.PI,
  };
}

export function buildArcs(locations, isMobile = false) {
  const approved = approvedLocations(locations);
  const hq = approved.find((loc) => loc.hub);
  if (!hq) return [];

  const orderMap = new Map(ROUTE_ORDER.map((id, i) => [id, i]));
  const destinations = approved
    .filter((loc) => !loc.hub)
    .sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));

  return destinations.map((loc) => {
    const config = COUNTRY_LOCATIONS[loc.id] || {};
    const midpoint = sphericalMidpoint(hq, loc);
    const [laneLat = 0, laneLng = 0] = config.routeLane || [];
    const laneScale = isMobile ? 1.25 : 1;
    return {
      id: loc.id,
      points: [
        { lat: hq.lat, lng: hq.lng, alt: 0.001 },
        {
          lat: midpoint.lat + laneLat * laneScale,
          lng: midpoint.lng + laneLng * laneScale,
          alt: config.arcAltitude || 0.15,
        },
        { lat: loc.lat, lng: loc.lng, alt: 0.001 },
      ],
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
