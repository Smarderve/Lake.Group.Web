/**
 * Lake Group hero 3D  Interactive Global Operations Experience.
 *
 * A real-imagery Earth (NASA Blue Marble via the standard three.js example
 * planet texture set, public-domain NASA source) carrying Lake Group's
 * VERIFIED operational footprint (every site/figure below is sourced from
 * scripts/_verified_lake_facts.md  no fictional cities or facilities).
 *
 * The experience is a continuous autonomous loop (~39s cycle, fade-through
 * -black at the seam) on every device  no scroll scrubbing. Progress 0..1
 * inside each cycle drives four chapters:
 *   1 (0    → 0.30) Planet  Earth at a distance, Africa rotates into view.
 *   2 (0.30 → 0.65) Footprint  the 8 verified countries of operation
 *                   ignite in sequence from the Dar es Salaam HQ, route
 *                   arcs draw outward; the Dubai connection lands last.
 *   3 (0.65 → 0.90) Operations  camera settles over East Africa and
 *                   verified facility callouts appear on leader lines.
 *   4 (0.90 → 1)    Identity  gentle pull-back; the DOM finale overlay
 *                   (logo + tagline) fades in, holds through the loop
 *                   pause, then the cycle fades and restarts.
 * The rAF loop fully stops when the section leaves the viewport or the tab
 * is hidden (IntersectionObserver + visibilitychange) and resumes with the
 * accumulated delta dropped, so the loop phase never jumps.
 */
import * as THREE from './vendor/three.module.min.js';

const BG = '#0b1220';
const LAKE_YELLOW = '#FFD700';

const GLOBE_R = 3.4;
const GLOBE_CENTER_LON = THREE.MathUtils.degToRad(30);

// Equirectangular textures have Greenwich at u=0.5; three.js spheres put
// u=0.25 at the +z front. Rotating the textured shells by -120° lines the
// imagery up with the latLonTo() marker math (front = lon 30°E).
const TEX_ROT_Y = -THREE.MathUtils.degToRad(120);
const TEX_BASE = 'assets/images/planet/';

// Chapter boundaries on the per-cycle 0..1 progress.
const CH1_END = 0.30;
const CH2_END = 0.65;
const CH3_END = 0.90;

// Autonomous loop pacing (seconds): 34s journey + 5s finale hold = 39s.
const LOOP_DURATION = 34;
const LOOP_PAUSE = 5;

/**
 * Verified operational footprint  scripts/_verified_lake_facts.md.
 * Index 0 is the group HQ (Plot 49 Mikocheni, Dar es Salaam, Tanzania).
 * Cities are the verified in-country bases: Nairobi + Kenya network,
 * Kigali (Lake Petroleum Rwanda), Bujumbura (Burundi Petroleum),
 * Lubumbashi (DRC Petroleum), Ndola (Lake Petroleum Zambia),
 * Addis Ababa (Wadi Elsundus/WAS office; Gelan depot), Beira (Lake Oil
 * LDA + AFICD Mozambique), Dubai (MERM + SAFF).
 */
// `anchor` is the sprite's center property ([cx, cy] in sprite-size units):
// it fans each label out around its marker in screen space so the dense
// East-Africa cluster never self-overlaps at any camera distance.
const SITES = [
  { key: 'tz', lat: -6.82, lon: 39.28, city: 'Dar es Salaam · HQ', hub: true, anchor: [-0.06, 0.5] },
  { key: 'ke', lat: -1.29, lon: 36.82, city: 'Nairobi', anchor: [0.08, -0.45] },
  { key: 'rw', lat: -1.95, lon: 30.06, city: 'Kigali', anchor: [0.95, -0.55] },
  { key: 'bu', lat: -3.36, lon: 29.36, city: 'Bujumbura', anchor: [1.06, 0.75] },
  { key: 'cd', lat: -11.66, lon: 27.48, city: 'Lubumbashi', anchor: [1.06, 1.35] },
  { key: 'zm', lat: -12.97, lon: 28.64, city: 'Ndola', anchor: [0.35, 1.65] },
  { key: 'et', lat: 9.02, lon: 38.75, city: 'Addis Ababa', anchor: [0.5, -0.55] },
  { key: 'mz', lat: -19.84, lon: 34.84, city: 'Beira', anchor: [0.5, 1.55] },
  { key: 'ae', lat: 25.20, lon: 55.27, city: 'MERM · SAFF', anchor: [0.5, -0.55] },
];

// Country display names per site key. English proper nouns are shared by
// the site's three languages except the few localized below; the current
// language is read from window.LakeI18n at init.
const SITE_NAMES = {
  en: { tz: 'Tanzania', ke: 'Kenya', rw: 'Rwanda', bu: 'Burundi', cd: 'DR Congo', zm: 'Zambia', et: 'Ethiopia', mz: 'Mozambique', ae: 'Dubai · UAE' },
  fr: { tz: 'Tanzanie', ke: 'Kenya', rw: 'Rwanda', bu: 'Burundi', cd: 'RD Congo', zm: 'Zambie', et: 'Éthiopie', mz: 'Mozambique', ae: 'Dubaï · EAU' },
  sw: { tz: 'Tanzania', ke: 'Kenya', rw: 'Rwanda', bu: 'Burundi', cd: 'DR Congo', zm: 'Zambia', et: 'Ethiopia', mz: 'Msumbiji', ae: 'Dubai · UAE' },
};

/**
 * Chapter-3 facility callouts. Each one is verified in
 * scripts/_verified_lake_facts.md:
 * - Tanga LPG terminal: 3,000 MT storage, private single mooring buoy.
 * - Dar es Salaam port: vessel bunkering; Kigamboni depot 38M litres.
 * - Lake Steel, Kibaha (Visiga): HS-CR rolling mill ~100,000 MT/year;
 *   Lake Trans main workshop is also in Kibaha.
 * - GCCP, Dar es Salaam: ready-mix concrete, own quarry at Lugoba.
 * off = label offset from the anchor in (east, north, up) surface units.
 */
const FACILITIES = [
  { title: 'TANGA LPG TERMINAL', sub: '3,000 MT storage · marine mooring buoy', lat: -5.07, lon: 39.10, off: [0.55, 0.55, 0.34] },
  { title: 'DAR ES SALAAM PORT', sub: 'Vessel bunkering · 38M-litre depot', lat: -6.85, lon: 39.30, off: [0.45, -1.05, 0.34] },
  { title: 'LAKE STEEL · KIBAHA', sub: 'HS-CR steel mill · 100,000 MT/yr', lat: -6.77, lon: 38.92, off: [-0.72, 0.42, 0.30] },
  { title: 'GCCP · DAR ES SALAAM', sub: 'Ready-mix concrete · Lugoba quarry', lat: -6.72, lon: 39.15, off: [-0.75, -0.65, 0.32] },
];

/**
 * Camera track: (azimuth, elevation, distance·R, fov) keyframes over the
 * per-cycle progress, smoothstepped per segment so the rig settles calmly
 * at every chapter. Azimuth 0.16 / elevation -0.12 is East Africa
 * (lon ≈ 39°, lat ≈ -7°) once the globe has finished its rotate-in.
 */
const CAM_KEYS = [
  { p: 0.00, az: -0.52, el: 0.26, dist: 4.45, fov: 44 },
  { p: CH1_END, az: -0.08, el: 0.13, dist: 3.45, fov: 42 },
  { p: CH2_END, az: 0.10, el: -0.02, dist: 3.05, fov: 42 },
  { p: 0.78, az: 0.16, el: -0.12, dist: 2.45, fov: 40 },
  { p: CH3_END, az: 0.16, el: -0.12, dist: 2.45, fov: 40 },
  { p: 1.00, az: 0.04, el: 0.05, dist: 3.30, fov: 44 },
];

function latLonTo(lat, lon, r, out) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon) - GLOBE_CENTER_LON;
  return out.set(
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.cos(theta)
  );
}

function phase(p, start, end) {
  if (p <= start) return 0;
  if (p >= end) return 1;
  return (p - start) / (end - start);
}

function smooth(f) {
  return f * f * (3 - 2 * f);
}

/** Fade to/from black around the loop reset. */
function getLoopFade(simTime) {
  const total = LOOP_DURATION + LOOP_PAUSE;
  const cycleT = simTime % total;
  const fadeOut = 1 - phase(cycleT, total - 0.9, total);
  const fadeIn = phase(cycleT, 0, 0.8);
  return Math.min(fadeOut, fadeIn);
}

function sampleCamera(gp, out) {
  let i = 0;
  while (i < CAM_KEYS.length - 2 && gp > CAM_KEYS[i + 1].p) i++;
  const a = CAM_KEYS[i];
  const b = CAM_KEYS[i + 1];
  const e = smooth(phase(gp, a.p, b.p));
  out.az = THREE.MathUtils.lerp(a.az, b.az, e);
  out.el = THREE.MathUtils.lerp(a.el, b.el, e);
  out.dist = THREE.MathUtils.lerp(a.dist, b.dist, e) * GLOBE_R;
  out.fov = THREE.MathUtils.lerp(a.fov, b.fov, e);
}

// ---------------------------------------------------------------------------

function initHero3D(mount) {
  const panel = mount;
  // Treat a device as 'low' only when very narrow or extremely low concurrency.
  // This preserves higher visual fidelity on modern high-DPR phones.
  const isLow = window.innerWidth < 420 || (navigator.hardwareConcurrency || 4) < 2;

  const renderer = new THREE.WebGLRenderer({
    antialias: !isLow,
    alpha: true,
    powerPreference: 'high-performance',
    stencil: false,
  });
  // Adaptive pixel ratio: favor clarity on mid devices, cap for performance
  const effectivePixelRatio = (() => {
    if (isLow) return 1;
    return Math.min(1.5, Math.max(1, window.devicePixelRatio || 1));
  })();
  renderer.setPixelRatio(effectivePixelRatio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const BASE_EXPOSURE = 0.96; // brighter globe without blowing out specular highlights
  renderer.toneMappingExposure = BASE_EXPOSURE;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.style.cssText = 'display:block;position:absolute;top:0;left:0;width:100%;height:100%;z-index:0;background:transparent;';
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 300);
  camera.position.set(0, 0, GLOBE_R * 4.45);

  // Softer sun + ambient to reduce contrast and dark limbs.
  const lightDir = new THREE.Vector3(-0.42, 0.30, 0.86).normalize();
  const sun = new THREE.DirectionalLight('#fff4df', 0.82);
  sun.position.copy(lightDir).multiplyScalar(10);
  scene.add(sun);
  // Softer ambient so the dark limb is less severe but the scene stays natural.
  scene.add(new THREE.AmbientLight('#d4ecff', 0.58));
  const fill = new THREE.DirectionalLight('#6b84a6', 0.16);
  fill.position.set(5, -2, -10);
  scene.add(fill);
  const rim = new THREE.DirectionalLight('#8aa6c1', 0.10);
  rim.position.set(-6, 2, 2);
  scene.add(rim);

  const disposables = [];

  // ---------------------------------------------------------------------
  // Globe group: textured earth shell, clouds, markers, arcs, labels and
  // callouts all parent here so the rotate-in carries everything.
  const globe = new THREE.Group();
  scene.add(globe);

  // NASA Blue Marble satellite imagery (three.js example planet set 
  // public-domain NASA source). Maps stream in async; until the color map
  // arrives the sphere renders as a deep-blue placeholder.
  const texLoader = new THREE.TextureLoader();
  const earthMat = new THREE.MeshPhongMaterial({
    color: '#ddeaf5',
    emissive: '#04121f',
    emissiveIntensity: 0.1,
    specular: '#081826',
    shininess: 2,
    reflectivity: 0.12,
    envMapIntensity: 0.25,
  });
  texLoader.load(TEX_BASE + 'earth_color_2048.jpg', (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    earthMat.map = t;
    earthMat.color.set('#ffffff');
    earthMat.needsUpdate = true;
    disposables.push(t);
  });
  // Ocean/land mask so only water catches the sun glint.
  texLoader.load(TEX_BASE + 'earth_specular_1024.jpg', (t) => {
    earthMat.specularMap = t;
    earthMat.specular = new THREE.Color('#0a1826');
    earthMat.shininess = 2;
    earthMat.reflectivity = 0.12;
    earthMat.envMapIntensity = 0.25;
    earthMat.needsUpdate = true;
    disposables.push(t);
  });
  if (!isLow) {
    texLoader.load(TEX_BASE + 'earth_normal_1024.jpg', (t) => {
      earthMat.normalMap = t;
      earthMat.normalScale = new THREE.Vector2(1.2, 1.2);
      earthMat.needsUpdate = true;
      disposables.push(t);
    });
  }
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(GLOBE_R, isLow ? 48 : 72, isLow ? 32 : 48),
    earthMat
  );
  earth.rotation.y = TEX_ROT_Y;
  globe.add(earth);

  // ---------------------------------------------------------------------
  // Canvas label sprites (billboards). Generated once at init. Darker
  // plates than the previous build so they hold contrast over imagery.
  const lang = (window.LakeI18n && window.LakeI18n.current) || 'en';
  const names = SITE_NAMES[lang] || SITE_NAMES.en;

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function makeLabelSprite(title, sub, opts) {
    // Adaptive supersampling for canvas labels so small screens keep crisp text
    const devicePR = Math.max(1, Math.round(window.devicePixelRatio || 1));
    const S = devicePR > 1 ? Math.min(4, devicePR + 2) : 2;
    const titleFont = `700 ${14 * S}px Inter, 'Segoe UI', sans-serif`;
    const subFont = `500 ${11 * S}px Inter, 'Segoe UI', sans-serif`;
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    ctx.font = titleFont;
    const wTitle = ctx.measureText(title).width;
    ctx.font = subFont;
    const wSub = sub ? ctx.measureText(sub).width : 0;
    const padX = 12 * S;
    const padY = 7 * S;
    const lineGap = sub ? 4 * S : 0;
    const w = Math.ceil(Math.max(wTitle, wSub) + padX * 2);
    const h = Math.ceil(padY * 2 + 13 * S + (sub ? 10 * S + lineGap : 0));
    c.width = w;
    c.height = h;
    // Soft dark halo behind the plate keeps text legible over bright land.
    ctx.shadowColor = 'rgba(1, 4, 12, 0.9)';
    ctx.shadowBlur = 7 * S;
    ctx.fillStyle = opts.hub ? 'rgba(6, 11, 24, 0.94)' : 'rgba(3, 8, 19, 0.88)';
    roundRect(ctx, S, S, w - 2 * S, h - 2 * S, 5 * S);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = S;
    ctx.strokeStyle = opts.hub ? 'rgba(255, 215, 0, 0.75)' : 'rgba(150, 180, 230, 0.48)';
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = titleFont;
    ctx.fillStyle = opts.hub ? '#ffd700' : '#eaf1fc';
    ctx.fillText(title, w / 2, padY);
    if (sub) {
      ctx.font = subFont;
      ctx.fillStyle = 'rgba(214, 226, 245, 0.68)';
      ctx.fillText(sub, w / 2, padY + 13 * S + lineGap);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipMapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    tex.needsUpdate = true;
    const mat = new THREE.SpriteMaterial({
      map: tex, transparent: true, opacity: 0, depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    const height = opts.height || 0.34;
    sprite.scale.set((w / h) * height, height, 1);
    disposables.push(tex, mat);
    return sprite;
  }

  // ---------------------------------------------------------------------
  // Country markers: instanced core + additive halo, one label sprite
  // each. Instance 0 = Dar es Salaam HQ (distinct gold ring + label).
  const markerPos = SITES.map((s) => latLonTo(s.lat, s.lon, GLOBE_R + 0.02, new THREE.Vector3()));
  const markerCore = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.055, 10, 10),
    new THREE.MeshBasicMaterial({ color: '#ffffff' }),
    markerPos.length
  );
  const markerHalo = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.115, 10, 10),
    new THREE.MeshBasicMaterial({
      color: '#ffdf6b', transparent: true, opacity: 0.38,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
    markerPos.length
  );
  globe.add(markerCore);
  globe.add(markerHalo);

  // HQ ring: a thin gold torus seated on the surface at Dar es Salaam.
  const hubRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.012, 8, 36),
    new THREE.MeshBasicMaterial({
      color: LAKE_YELLOW, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
  );
  hubRing.position.copy(markerPos[0]).setLength(GLOBE_R + 0.03);
  hubRing.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    markerPos[0].clone().normalize()
  );
  globe.add(hubRing);

  const siteLabels = SITES.map((s, i) => {
    const sprite = makeLabelSprite(
      names[s.key] || s.key,
      s.city,
      { hub: s.hub, height: s.hub ? 0.30 : 0.24 }
    );
    sprite.position.copy(markerPos[i]).setLength(GLOBE_R + 0.09);
    sprite.center.set(s.anchor[0], s.anchor[1]);
    globe.add(sprite);
    return sprite;
  });

  // ---------------------------------------------------------------------
  // Route arcs Dar es Salaam -> each destination, drawn in sequentially
  // via index drawRange on static tube geometry (built once, in place).
  function buildTubeBuffers(curve, tubularSegments, radius, radialSegments) {
    const frames = curve.computeFrenetFrames(tubularSegments, false);
    const positions = new Float32Array((tubularSegments + 1) * (radialSegments + 1) * 3);
    const normals = new Float32Array((tubularSegments + 1) * (radialSegments + 1) * 3);
    const uvs = new Float32Array((tubularSegments + 1) * (radialSegments + 1) * 2);
    const indices = [];
    const pVec = new THREE.Vector3();
    const nVec = new THREE.Vector3();

    let ringCursor = 0;
    for (let i = 0; i <= tubularSegments; i++) {
      const t = i / tubularSegments;
      curve.getPointAt(t, pVec);
      const N = frames.normals[i];
      const B = frames.binormals[i];
      for (let j = 0; j <= radialSegments; j++) {
        const v = (j / radialSegments) * Math.PI * 2;
        const sin = Math.sin(v);
        const cos = -Math.cos(v);
        nVec.x = cos * N.x + sin * B.x;
        nVec.y = cos * N.y + sin * B.y;
        nVec.z = cos * N.z + sin * B.z;
        nVec.normalize();
        const idx = (ringCursor + j) * 3;
        normals[idx] = nVec.x;
        normals[idx + 1] = nVec.y;
        normals[idx + 2] = nVec.z;
        positions[idx] = pVec.x + radius * nVec.x;
        positions[idx + 1] = pVec.y + radius * nVec.y;
        positions[idx + 2] = pVec.z + radius * nVec.z;
      }
      ringCursor += radialSegments + 1;
    }
    for (let i = 0; i <= tubularSegments; i++) {
      for (let j = 0; j <= radialSegments; j++) {
        const uvIdx = (i * (radialSegments + 1) + j) * 2;
        uvs[uvIdx] = i / tubularSegments;
        uvs[uvIdx + 1] = j / radialSegments;
      }
    }
    for (let i = 1; i <= tubularSegments; i++) {
      for (let j = 1; j <= radialSegments; j++) {
        const a = (radialSegments + 1) * (i - 1) + (j - 1);
        const b = (radialSegments + 1) * i + (j - 1);
        const c2 = (radialSegments + 1) * i + j;
        const d = (radialSegments + 1) * (i - 1) + j;
        indices.push(a, b, d);
        indices.push(b, c2, d);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    return geometry;
  }

  const arcMat = new THREE.MeshBasicMaterial({
    color: '#ffd76a', transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const ARC_SEGS = 44;
  const ARC_RADIAL = 5;
  const IDX_PER_RING = ARC_RADIAL * 6;
  const hubV = markerPos[0];
  // Ignition schedule: Tanzania first, then each arc + destination in
  // sequence; Dubai (last entry) lands last with its own arc.
  const HUB_ON_START = 0.31;
  const HUB_ON_END = 0.345;
  const arcs = markerPos.slice(1).map((endV, j) => {
    const mid = hubV.clone().add(endV).multiplyScalar(0.5);
    mid.setLength(GLOBE_R * (1 + hubV.angleTo(endV) * 0.32));
    const curve = new THREE.QuadraticBezierCurve3(hubV.clone(), mid, endV.clone());
    const geo = buildTubeBuffers(curve, ARC_SEGS, 0.016, ARC_RADIAL);
    geo.setDrawRange(0, 0);
    const mesh = new THREE.Mesh(geo, arcMat);
    mesh.visible = false;
    globe.add(mesh);
    const start = 0.355 + j * 0.031;
    return { geo, mesh, start, end: start + 0.05 };
  });

  // ---------------------------------------------------------------------
  // Chapter-3 facility callouts: anchor dot + two-segment leader line +
  // label sprite, fanned out via per-facility offsets.
  const eastScratch = new THREE.Vector3();
  const northScratch = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  const callouts = FACILITIES.map((f, i) => {
    const anchor = latLonTo(f.lat, f.lon, GLOBE_R + 0.01, new THREE.Vector3());
    const n = anchor.clone().normalize();
    eastScratch.crossVectors(UP, n).normalize();
    northScratch.crossVectors(n, eastScratch).normalize();
    const tip = anchor.clone()
      .addScaledVector(n, f.off[2])
      .addScaledVector(eastScratch, f.off[0])
      .addScaledVector(northScratch, f.off[1]);
    const kink = anchor.clone().addScaledVector(n, f.off[2] * 0.55);

    const lineGeo = new THREE.BufferGeometry().setFromPoints([anchor, kink, tip]);
    const lineMat = new THREE.LineBasicMaterial({
      color: '#ffd76a', transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const line = new THREE.Line(lineGeo, lineMat);
    globe.add(line);

    const dotMat = new THREE.MeshBasicMaterial({
      color: LAKE_YELLOW, transparent: true, opacity: 0,
    });
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), dotMat);
    dot.position.copy(anchor);
    globe.add(dot);

    const sprite = makeLabelSprite(f.title, f.sub, { height: 0.25 });
    sprite.position.copy(tip);
    sprite.center.set(0.5, -0.15);
    globe.add(sprite);

    const fadeStart = 0.68 + i * 0.033;
    return { line, lineMat, dot, dotMat, sprite, fadeStart };
  });

  // ---------------------------------------------------------------------
  // State + per-frame scratch.
  let width = 0;
  let height = 0;
  let running = true;
  let raf = 0;
  const clock = new THREE.Clock();
  let simTime = 0;
  const camDir = new THREE.Vector3();
  const camRight = new THREE.Vector3();
  const camUp = new THREE.Vector3();
  const camSample = { az: 0, el: 0, dist: GLOBE_R * 4.45, fov: 44 };
  const dummy = new THREE.Object3D();
  const litColor = new THREE.Color(LAKE_YELLOW);
  const dimColor = new THREE.Color('#41567d');
  const hoverColor = new THREE.Color('#ffffff');
  const colorScratch = new THREE.Color();

  let frameCount = 0;
  let hoveredMarker = -1;
  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2(2, 2); // parked offscreen until a move

  // Subtle mouse parallax so the "Interactive Experience" label is honest.
  let parallaxX = 0;
  let parallaxY = 0;
  let parallaxTX = 0;
  let parallaxTY = 0;
  let userRotY = 0;
  let userRotX = 0;
  let userVelY = 0;
  let userVelX = 0;
  let spinOffset = 0;
  let zoomScale = 1;
  let isDragging = false;
  let activePointerId = null;
  let lastPointerX = 0;
  let lastPointerY = 0;

  function updatePointerParallax(e) {
    const rect = mount.getBoundingClientRect();
    parallaxTX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    parallaxTY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    pointerNDC.x = parallaxTX;
    pointerNDC.y = -parallaxTY;
  }

  function onPointerDown(e) {
    isDragging = true;
    activePointerId = e.pointerId;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    mount.setPointerCapture?.(e.pointerId);
    mount.style.cursor = 'grabbing';
  }

  function onPointerMove(e) {
    updatePointerParallax(e);
    if (!isDragging || activePointerId !== e.pointerId) return;
    const dx = e.clientX - lastPointerX;
    const dy = e.clientY - lastPointerY;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    // Reduced sensitivity for gentler drag feel
    userVelY = dx * 0.0035;
    userVelX = dy * 0.0035;
    userRotY += userVelY;
    userRotX += userVelX;
    userRotY = THREE.MathUtils.clamp(userRotY, -0.75, 0.75);
    userRotX = THREE.MathUtils.clamp(userRotX, -0.45, 0.45);
  }

  function onPointerLeave() {
    parallaxTX = 0;
    parallaxTY = 0;
    pointerNDC.set(2, 2);
    hoveredMarker = -1;
    if (!isDragging) return;
    isDragging = false;
    activePointerId = null;
    mount.style.cursor = 'grab';
  }

  function onPointerUp(e) {
    if (activePointerId !== null && e.pointerId !== activePointerId) return;
    isDragging = false;
    activePointerId = null;
    mount.style.cursor = 'grab';
  }

  function onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.92 : 1.08;
    zoomScale = THREE.MathUtils.clamp(zoomScale * delta, 0.88, 1.14);
    mount.style.cursor = 'zoom-in';
  }

  mount.addEventListener('pointerdown', onPointerDown);
  mount.addEventListener('pointermove', onPointerMove);
  mount.addEventListener('pointerleave', onPointerLeave);
  mount.addEventListener('pointerup', onPointerUp);
  mount.addEventListener('pointercancel', onPointerUp);
  mount.addEventListener('wheel', onWheel, { passive: false });
  mount.style.cursor = 'grab';
  mount.style.touchAction = 'none';

  // Highlight the matching step in the copy column as loop chapters pass.
  const stepItems = document.querySelectorAll('.experience-steps li');
  let activeStep = -1;
  function syncSteps(step) {
    if (!stepItems.length || step === activeStep) return;
    activeStep = step;
    stepItems.forEach((li, i) => li.classList.toggle('is-active', i === step));
  }

  // Rolling frame-time average; sustained sub-30fps drops pixel ratio to 1
  // and hides the cloud layer  the levers available after init.
  let demoted = isLow;
  let frameTimeEMA = 16.7;
  let lastFrameAt = 0;
  let badFrameStreak = 0;
  const DEMOTE_MS_THRESHOLD = 33.3;
  const DEMOTE_STREAK_NEEDED = 90;
  function maybeDemoteQuality(dtMs) {
    if (demoted) return;
    frameTimeEMA = frameTimeEMA * 0.9 + dtMs * 0.1;
    if (frameTimeEMA > DEMOTE_MS_THRESHOLD) {
      badFrameStreak++;
      if (badFrameStreak > DEMOTE_STREAK_NEEDED) {
        demoted = true;
        renderer.setPixelRatio(1);
        console.info('Lake 3D: demoted render quality (sustained low framerate)');
      }
    } else {
      badFrameStreak = 0;
    }
  }

  function resize() {
    width = mount.clientWidth || mount.offsetWidth;
    height = mount.clientHeight || mount.offsetHeight;
    if (!width || !height) {
      width = mount.offsetWidth || 560;
      height = window.innerWidth < 960 ? 360 : 480;
    }
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function animate() {
    raf = requestAnimationFrame(animate);
    if (!running) return;

    const now = performance.now();
    if (lastFrameAt) maybeDemoteQuality(now - lastFrameAt);
    lastFrameAt = now;

    const rawDt = Math.min(clock.getDelta(), 0.1);
    simTime += rawDt;
    const t = simTime;
    frameCount++;

    // Autonomous loop progress: 0..1 over LOOP_DURATION, then a hold at 1
    // through the finale pause, with the exposure fade at the seam.
    const cycleT = t % (LOOP_DURATION + LOOP_PAUSE);
    const gp = Math.min(1, cycleT / LOOP_DURATION);
    renderer.toneMappingExposure = BASE_EXPOSURE * (0.1 + 0.9 * getLoopFade(t));

    if (gp < CH1_END) {
      spinOffset -= rawDt * 0.016; // subtle chapter-1 drift only
      if (spinOffset < -Math.PI * 2) spinOffset += Math.PI * 2;
    } else {
      spinOffset *= 0.2;
      if (Math.abs(spinOffset) < 0.000001) spinOffset = 0;
    }

    // QA/diagnostics hooks (read by scripts/_globe_qa2.js).
    window.__lake3dFrames = frameCount;
    window.__lake3dProgress = gp;

    // Globe rotation: Africa swings into prominence through chapter 1,
    // then a barely-perceptible ambient drift keeps the planet alive.
    const settle = smooth(phase(gp, 0, CH1_END));
    if (!isDragging) {
      userVelY *= 0.92;
      userVelX *= 0.92;
      if (Math.abs(userVelY) < 0.0004) userVelY = 0;
      if (Math.abs(userVelX) < 0.0004) userVelX = 0;
      userRotY += userVelY;
      userRotX += userVelX;
    }
    userRotY = THREE.MathUtils.clamp(userRotY, -0.75, 0.75);
    userRotX = THREE.MathUtils.clamp(userRotX, -0.45, 0.45);
    const baseRotY = THREE.MathUtils.lerp(1.35, 0, settle) + Math.sin(t * 0.08) * 0.012 * (1 - settle);
    // Larger screens get a slightly more pronounced float; small screens stay subtle
    const floatAmp = width > 960 ? 0.05 : 0.018;
    globe.position.y = Math.sin(t * 0.72) * floatAmp;
    globe.position.z = Math.sin(t * 0.46) * (floatAmp * 0.32);
    globe.rotation.y = baseRotY + userRotY + spinOffset;
    globe.rotation.x = userRotX * 0.14 + Math.sin(t * 0.55) * 0.003;

    // Hover: raycast the 9 instanced markers at most every 3rd frame.
    if (frameCount % 3 === 0 && pointerNDC.x <= 1) {
      raycaster.setFromCamera(pointerNDC, camera);
      const hit = raycaster.intersectObject(markerCore, false);
      hoveredMarker = hit.length ? hit[0].instanceId : -1;
    }

    // Chapter-3 focus factor (declutters country labels near close-up).
    const ch3 = phase(gp, CH2_END, 0.74) * (1 - phase(gp, CH3_END, 0.97));

    // Markers + labels ignition.
    const hubOn = phase(gp, HUB_ON_START, HUB_ON_END);
    for (let i = 0; i < markerPos.length; i++) {
      const on = i === 0
        ? hubOn
        : phase(gp, arcs[i - 1].end - 0.015, arcs[i - 1].end + 0.02);
      const pulse = 1 + Math.sin(t * 2.4 + i * 1.7) * 0.13 * on;
      const hov = i === hoveredMarker ? 1.35 : 1;
      const hubBoost = i === 0 ? 1.35 : 1;
      dummy.position.copy(markerPos[i]);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(Math.max(0.001, (0.4 + 0.7 * on) * pulse * hov * hubBoost));
      dummy.updateMatrix();
      markerCore.setMatrixAt(i, dummy.matrix);
      colorScratch.copy(dimColor).lerp(litColor, on);
      if (i === hoveredMarker) colorScratch.lerp(hoverColor, 0.55);
      markerCore.setColorAt(i, colorScratch);
      dummy.scale.setScalar(Math.max(0.001, on * pulse * hov * hubBoost * (0.8 + Math.sin(t * 2 + i) * 0.15)));
      dummy.updateMatrix();
      markerHalo.setMatrixAt(i, dummy.matrix);

      // Labels ride their markers; dim (except hovered) during chapter 3.
      const labelBase = on * (0.55 + 0.45 * smooth(phase(gp, HUB_ON_START, 0.4)));
      let op = labelBase * (1 - 0.92 * ch3);
      if (i === hoveredMarker) op = Math.max(op, on * 1.0);
      if (i === 0) op = Math.max(op, on * (1 - 0.45 * ch3)); // HQ stays readable
      siteLabels[i].material.opacity = op * 0.95;
    }
    markerCore.instanceMatrix.needsUpdate = true;
    markerCore.instanceColor.needsUpdate = true;
    markerHalo.instanceMatrix.needsUpdate = true;
    hubRing.material.opacity = hubOn * (0.55 + Math.sin(t * 2.2) * 0.15);
    hubRing.scale.setScalar(1 + Math.sin(t * 2.2) * 0.06);

    // Route arcs draw outward from the HQ.
    for (const a of arcs) {
      const f = smooth(phase(gp, a.start, a.end));
      a.mesh.visible = f > 0.001;
      a.geo.setDrawRange(0, Math.floor(f * ARC_SEGS) * IDX_PER_RING);
    }

    // Facility callouts (chapter 3 only).
    for (const c of callouts) {
      const f = smooth(phase(gp, c.fadeStart, c.fadeStart + 0.045))
        * (1 - phase(gp, CH3_END + 0.01, 0.96));
      c.lineMat.opacity = f * 0.7;
      c.dotMat.opacity = f;
      c.sprite.material.opacity = f * 0.97;
    }

    // Camera: keyframed orbit sampled from progress, plus mouse parallax.
    sampleCamera(gp, camSample);
    camDir.set(
      Math.sin(camSample.az) * Math.cos(camSample.el),
      Math.sin(camSample.el),
      Math.cos(camSample.az) * Math.cos(camSample.el)
    );
    parallaxX += (parallaxTX - parallaxX) * 0.05;
    parallaxY += (parallaxTY - parallaxY) * 0.05;
    camRight.crossVectors(UP, camDir).normalize().negate();
    camUp.crossVectors(camDir, camRight).normalize().negate();
    const pStrength = 0.05 * camSample.dist;
    camera.position.copy(camDir).multiplyScalar(camSample.dist * zoomScale)
      .addScaledVector(camRight, parallaxX * pStrength)
      .addScaledVector(camUp, -parallaxY * pStrength * 0.7);
    camera.lookAt(0, 0, 0);
    camera.fov = camSample.fov;
    camera.updateProjectionMatrix();

    // DOM finale overlay over the living globe (chapter 4 of each cycle).
    if (panel) {
      panel.classList.toggle('show-finale', gp > 0.88);
      panel.classList.toggle('show-finale-full', gp > 0.94);
    }

    syncSteps(gp < CH1_END ? 0 : gp < CH2_END ? 1 : 2);

    renderer.render(scene, camera);
  }

  const ro = new ResizeObserver(resize);
  ro.observe(mount);
  resize();

  // Pause the rAF loop whenever the panel is off-screen or the tab is
  // hidden; resume with the delta dropped so the loop phase doesn't jump.
  let inViewport = true;
  function setRunning(next) {
    if (next === running) return;
    running = next;
    if (running) {
      clock.getDelta();
      lastFrameAt = 0;
      if (!raf) animate();
    } else if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }
  const io = new IntersectionObserver(
    (entries) => {
      inViewport = entries[0].isIntersecting;
      setRunning(inViewport && document.visibilityState === 'visible');
    },
    { threshold: 0.01 }
  );
  io.observe(mount);

  requestAnimationFrame(() => {
    resize();
    mount.classList.add('is-ready');
    animate();
  });

  const onVisibility = () => {
    setRunning(inViewport && document.visibilityState === 'visible');
  };
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    running = false;
    cancelAnimationFrame(raf);
    document.removeEventListener('visibilitychange', onVisibility);
    mount.removeEventListener('pointerdown', onPointerDown);
    mount.removeEventListener('pointermove', onPointerMove);
    mount.removeEventListener('pointerleave', onPointerLeave);
    mount.removeEventListener('pointerup', onPointerUp);
    mount.removeEventListener('pointercancel', onPointerUp);
    ro.disconnect();
    io.disconnect();
    renderer.domElement.remove();
    // Dispose every geometry/material/texture in the graph.
    const seen = new Set();
    scene.traverse((obj) => {
      if (obj.geometry && !seen.has(obj.geometry)) {
        seen.add(obj.geometry);
        obj.geometry.dispose();
      }
      const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
      for (const m of mats) {
        if (!seen.has(m)) {
          seen.add(m);
          if (m.map) m.map.dispose();
          m.dispose();
        }
      }
    });
    for (const d of disposables) d.dispose();
    renderer.dispose();
  };
}

function showError(mount, msg) {
  mount.classList.add('is-error');
  const note = document.createElement('p');
  note.className = 'experience-3d-error';
  note.textContent = '3D experience could not load. Please refresh the page.';
  mount.appendChild(note);
  console.error('Lake 3D:', msg);
}

function boot() {
  const mount = document.getElementById('experience-3d-panel');
  if (!mount) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Static fallback: show the branded logo/tagline overlay instead of
    // leaving an empty black box.
    mount.classList.add('show-finale', 'show-finale-full');
    return;
  }

  mount.classList.add('is-loading');
  try {
    initHero3D(mount);
  } catch (err) {
    showError(mount, err);
  } finally {
    mount.classList.remove('is-loading');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
