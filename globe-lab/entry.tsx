import React from 'react';
import { createRoot } from 'react-dom/client';
import { World } from '../assets/hero-globe/aceternity-supplied/components/globe-demo';
import { Globe3D } from '../assets/hero-globe/aceternity-supplied/components/3d-globe-demo';

const points = [
  ['Tanzania', -6.7924, 39.2083], ['Kenya', -1.2921, 36.8219], ['Uganda', .3476, 32.5825],
  ['Rwanda', -1.9441, 30.0619], ['Burundi', -3.3614, 29.3599], ['DR Congo', -4.4419, 15.2663],
  ['Zambia', -15.3875, 28.3228], ['Mozambique', -25.9692, 32.5732], ['Ethiopia', 9.03, 38.74], ['UAE', 24.4539, 54.3773],
].map(([name, lat, lng]) => ({ name, lat, lng, src: `assets/images/flags/${String(name).toLowerCase().replace('dr congo','cd').replace('uae','ae').replace('tanzania','tz').replace('kenya','ke').replace('uganda','ug').replace('rwanda','rw').replace('burundi','bi').replace('zambia','zm').replace('mozambique','mz').replace('ethiopia','et')}.svg`, label: name }));
const arcs = points.slice(1).map((p, index) => ({ order: index + 1, startLat: points[0].lat, startLng: points[0].lng, endLat: p.lat, endLng: p.lng, arcAlt: .15 + index * .025, color: '#FFF200' }));
const worldConfig = { pointSize: 1.3, globeColor: '#071d2d', showAtmosphere: true, atmosphereColor: '#0181BB', atmosphereAltitude: .16, emissive: '#03111c', emissiveIntensity: .35, shininess: .65, polygonColor: 'rgba(255,255,255,.75)', ambientLight: '#ffffff', directionalLeftLight: '#ffffff', directionalTopLight: '#ffffff', pointLight: '#ffffff', arcTime: 2200, arcLength: .72, rings: 1, maxRings: 2, autoRotate: true, autoRotateSpeed: .35, initialPosition: { lat: 0, lng: 25 } };
const markerConfig = { radius: 2.3, textureUrl: 'https://unpkg.com/three-globe@2.31.0/example/img/earth-blue-marble.jpg', bumpMapUrl: 'https://unpkg.com/three-globe@2.31.0/example/img/earth-topology.png', globeColor: '#071d2d', showAtmosphere: true, atmosphereColor: '#0181BB', atmosphereIntensity: .55, atmosphereBlur: 3, bumpScale: 1.2, autoRotateSpeed: .18, enableZoom: true, enablePan: false, minDistance: 6, maxDistance: 12, markerSize: .07, showWireframe: false, wireframeColor: '#0181BB', ambientIntensity: .65, pointLightIntensity: 1.35, backgroundColor: null };
const candidateConfig = { ...markerConfig, showWireframe: true, wireframeColor: '#FFF200', atmosphereColor: '#0599D3', atmosphereIntensity: .7, autoRotateSpeed: .28, backgroundColor: '#03111c' };

function Candidate() { return <Globe3D markers={points as never} config={candidateConfig} className="candidate-canvas" />; }
function App() { return <main><header><p className="eyebrow">Isolated visual proof</p><h1>Aceternity globe laboratory</h1><p>Homepage production remains unchanged. These three canvases are review candidates only.</p></header><section><article><h2>A · Original @aceternity/globe-demo</h2><div className="canvas"><World globeConfig={worldConfig} data={arcs} /></div></article><article><h2>B · Original @aceternity/3d-globe-demo</h2><div className="canvas"><Globe3D markers={points as never} config={markerConfig} /></div></article><article className="candidate"><h2>C · LakeGroupAceternityGlobe candidate</h2><div className="canvas"><Candidate /></div><p className="caption">Lake routes originate in Tanzania and use the supplied Aceternity 3D marker foundation.</p></article></section></main> }
createRoot(document.getElementById('root')!).render(<App />);
