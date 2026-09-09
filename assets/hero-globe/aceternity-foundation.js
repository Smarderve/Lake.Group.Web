/*
 * Aceternity component adaptation layer.
 * The complete supplied sources are kept in ./aceternity-supplied/components/ui.
 * This static-site adapter carries their two visual ideas into the single
 * react-globe.gl renderer: Globe demo arc sequencing/material tuning and the
 * 3d Globe demo's terrain, atmosphere and lat/lng projection configuration.
 */
export const ACETERNITY_GLOBE_CONFIG = Object.freeze({
  pointSize: 1,
  globeColor: '#071524',
  emissive: '#04111d',
  emissiveIntensity: 0.22,
  shininess: 0.86,
  polygonColor: 'rgba(255,255,255,0.34)',
  atmosphereColor: '#4da6ff',
  atmosphereAltitude: 0.14,
  arcLength: 0.9,
  arcTime: 1200,
});

export const ACETERNITY_3D_CONFIG = Object.freeze({
  radius: 2,
  bumpScale: 5,
  atmosphereIntensity: 0.5,
  atmosphereBlur: 2,
  autoRotateSpeed: 0.3,
});

// Adapted from the supplied 3d-globe component's projection utility.
export function latLngToVector3(lat, lng, radius = ACETERNITY_3D_CONFIG.radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return {
    x: -(radius * Math.sin(phi) * Math.cos(theta)),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta),
  };
}

// The 3d-globe shader uses a Fresnel edge; keep its tunable relationship here.
export function fresnelOpacity(viewDot, blur = ACETERNITY_3D_CONFIG.atmosphereBlur) {
  return Math.pow(1 - Math.abs(viewDot), Math.max(0.5, 5 - blur));
}

// Globe demo's route data shape, normalized for Lake's exact country routes.
export function normalizeAceternityArc(arc, order = 1) {
  return {
    order,
    startLat: arc.startLat,
    startLng: arc.startLng,
    endLat: arc.endLat,
    endLng: arc.endLng,
    arcAlt: arc.altitude,
    color: arc.color,
  };
}
