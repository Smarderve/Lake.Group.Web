import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import {
  TEX,
  BRAND_YELLOW,
  ROUTE_YELLOW,
  buildMarkers,
  buildArcs,
  LABEL_PRIORITY,
  prefersReducedMotion,
} from './locations.js';
import {
  ACETERNITY_GLOBE_CONFIG,
  ACETERNITY_3D_CONFIG,
  latLngToVector3,
  normalizeAceternityArc,
} from './AceternityWorld.js';

const MARKER_ICON = 'assets/icons/location-marker.svg';
const AFRICA_POV = { lat: -4, lng: 33, altitude: 1.85 };
const CAMERA_INTRO_MS = 1000;
const POST_INTRO_PAUSE_MS = 300;
const ROUTE_DRAW_MS = 1200;
const POST_ROUTE_PAUSE_MS = 500;
const NETWORK_HOLD_MS = 1800;
const SHOWCASE_ROTATION_MS = 5000;
const RESET_SETTLE_MS = 600;
const MARKER_ALTITUDE = 0.022;
const ROUTE_FRAME_INTERVAL_MS = 50;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function usePanelSize(panelEl) {
  const [size, setSize] = useState(() => {
    if (!panelEl) return { w: 640, h: 480 };
    const r = panelEl.getBoundingClientRect();
    return { w: Math.max(1, Math.floor(r.width)), h: Math.max(1, Math.floor(r.height)) };
  });
  useEffect(() => {
    if (!panelEl) return undefined;
    const measure = () => {
      const r = panelEl.getBoundingClientRect();
      setSize({ w: Math.max(1, Math.floor(r.width)), h: Math.max(1, Math.floor(r.height)) });
    };
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(panelEl);
    return () => obs.disconnect();
  }, [panelEl]);
  return size;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** Cache marker DOM elements to avoid recreating on every render. */
const markerCache = new Map();
function getCachedMarkerEl(marker, isMobile) {
  const key = marker.id + (isMobile ? '_m' : '_d');
  if (markerCache.has(key)) return markerCache.get(key);

  const root = document.createElement('div');
  root.className = 'hero-globe-marker';
  root.dataset.markerId = marker.id;
  root.dataset.labelDistance = String(marker.labelDistance || 22);
  root.style.cssText = 'position:relative;width:0;height:0;pointer-events:none;';
  root.style.setProperty('--label-distance', `${marker.labelDistance || 22}px`);

  const pin = document.createElement('img');
  pin.className = 'hero-globe-marker__pin';
  pin.src = MARKER_ICON;
  pin.alt = '';
  pin.width = isMobile ? 14 : 18;
  pin.height = isMobile ? 19 : 24;
  pin.decoding = 'async';
  pin.style.cssText = 'position:absolute;left:0;top:0;transform:translate(-50%,-100%);object-fit:contain;';

  const leader = document.createElement('span');
  leader.className = `hero-globe-marker__leader hero-globe-marker__leader--${marker.labelSide || 'east'}`;
  leader.setAttribute('aria-hidden', 'true');

  const label = document.createElement('span');
  label.className = 'hero-globe-marker__label';
  label.classList.add(`hero-globe-marker__label--${marker.labelSide || 'east'}`);
  label.style.cssText = [
    'display:inline-flex',
    'align-items:center',
    'gap:5px',
  ].join(';');

  const flag = document.createElement('img');
  flag.className = 'hero-globe-marker__flag';
  flag.src = marker.flagSrc;
  flag.alt = '';
  flag.setAttribute('aria-hidden', 'true');
  flag.width = isMobile ? 16 : 19;
  flag.height = isMobile ? 11 : 13;
  flag.decoding = 'async';
  flag.loading = 'eager';
  flag.style.cssText = [
    `width:${isMobile ? 16 : 19}px`,
    `height:${isMobile ? 11 : 13}px`,
    'flex:0 0 auto',
    'object-fit:contain',
    'object-position:center',
  ].join(';');
  flag.onerror = () => { flag.hidden = true; };

  const countryName = document.createElement('span');
  countryName.textContent = marker.label;
  countryName.style.cssText = 'display:inline-block;';
  const fontSize = isMobile ? 9 : 10.5;
  label.style.cssText += ';' + [
    'position:absolute',
    'white-space:nowrap',
    'font-family:Inter,Arial,sans-serif',
    `font-size:${fontSize}px`,
    `font-weight:${marker.hub ? 700 : 600}`,
    'letter-spacing:.08em',
    `color:${marker.hub ? BRAND_YELLOW : 'rgba(255,255,255,.96)'}`,
    'line-height:1',
    'text-shadow:0 1px 4px rgba(0,0,0,.8)',
    'pointer-events:none',
  ].join(';');

  label.append(flag, countryName);
  root.append(pin, leader, label);
  leader.style.width = '0';
  markerCache.set(key, root);
  return root;
}

/**
 * Animate camera from one POV to another over durationMs.
 * Returns a cancel function.
 */
function animateCamera(globe, from, to, durationMs, onDone) {
  const start = performance.now();
  let raf;
  let cancelled = false;
  const tick = () => {
    if (cancelled) return;
    const elapsed = performance.now() - start;
    const t = Math.min(1, elapsed / durationMs);
    const e = easeInOutCubic(t);
    globe.pointOfView(
      {
        lat: from.lat + (to.lat - from.lat) * e,
        lng: from.lng + (to.lng - from.lng) * e,
        altitude: from.altitude + (to.altitude - from.altitude) * e,
      },
      0,
    );
    if (t < 1) {
      raf = requestAnimationFrame(tick);
    } else {
      onDone();
    }
  };
  raf = requestAnimationFrame(tick);
  return () => { cancelled = true; if (raf) cancelAnimationFrame(raf); }
}

export default function LakeAceternityGlobe({ panelEl, locations }) {
  const globeRef = useRef(null);
  const { w, h } = usePanelSize(panelEl);
  const reduced = useReducedMotion();
  const [globeReady, setGlobeReady] = useState(false);
  const [sectionVisible, setSectionVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(
    () => typeof document === 'undefined' || !document.hidden,
  );

  /* ── Arc data: completed arcs + one active arc being drawn ── */
  const [completedArcs, setCompletedArcs] = useState([]);
  const [activeArc, setActiveArc] = useState(null);
  const activeDashRef = useRef(0);

  /* ── Marker data: only revealed destinations ── */
  const [revealedMarkers, setRevealedMarkers] = useState([]);

  /* ── Arrival rings: one restrained pulse at each destination ── */
  const [arrivalRings, setArrivalRings] = useState([]);

  /* ── Hub (Tanzania) visibility control ── */
  const [showHub, setShowHub] = useState(false);

  /* ── Animation lifecycle refs ── */
  const sequenceCancelledRef = useRef(false);
  const rafRef = useRef(null);
  const timersRef = useRef([]);
  const cancelCameraRef = useRef(null);
  const loopActiveRef = useRef(false);
  const dashUpdateTimerRef = useRef(null);

  const allMarkers = useMemo(() => buildMarkers(locations), [locations]);
  const allArcs = useMemo(() => buildArcs(locations), [locations]);
  const markerById = useMemo(
    () => new Map(allMarkers.map((m) => [m.id, m])),
    [allMarkers],
  );

  const isMobile = w < 600;

  /* ── Combined arc data for the Globe component ── */
  const arcsData = useMemo(() => {
    const arcs = completedArcs.map((a) => ({ ...normalizeAceternityArc(a, a.order), dashLength: 1 }));
    if (activeArc) {
      arcs.push({ ...normalizeAceternityArc(activeArc, activeArc.order), dashLength: activeDashRef.current });
    }
    return arcs;
  }, [completedArcs, activeArc]);

  /* ── Combined marker data ── */
  const hubMarker = useMemo(() => allMarkers.find((m) => m.hub), [allMarkers]);
  const markersData = useMemo(() => {
    const list = (showHub && hubMarker) ? [hubMarker] : [];
    return [...list, ...revealedMarkers];
  }, [hubMarker, revealedMarkers, showHub]);

  /* ── Cleanup helpers ── */
  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
    if (cancelCameraRef.current) {
      cancelCameraRef.current();
      cancelCameraRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (dashUpdateTimerRef.current) {
      clearInterval(dashUpdateTimerRef.current);
      dashUpdateTimerRef.current = null;
    }
  }, []);

  const scheduleTimer = useCallback((fn, delay) => {
    const id = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((timer) => timer !== id);
      fn();
    }, delay);
    timersRef.current.push(id);
    return id;
  }, []);

  const markerElement = useCallback(
    (marker) => getCachedMarkerEl(marker, isMobile),
    [isMobile],
  );

  /* Resolve projected label collisions without hiding lower-priority labels.
     Marker coordinates move as the camera settles or a user drags, so the
     lightweight layout pass runs off the WebGL render loop at a modest rate.
     Dimensions are cached and only refreshed when a label's content changes. */
  useEffect(() => {
    if (!panelEl) return undefined;
    const preferredOffsets = new Map(allMarkers.map((marker) => [
      marker.id,
      marker.labelOffset || [0, 0],
    ]));
    const lastOffsets = new Map();
    const metrics = new Map();
    const priority = new Map(LABEL_PRIORITY
      .map((id, index) => [id, index]));
    const candidatesFor = (id) => {
      const preferred = preferredOffsets.get(id) || [0, 0];
      const current = lastOffsets.get(id);
      const offsets = [
        ...(current ? [current] : []), preferred,
        [preferred[0], preferred[1] - 28], [preferred[0], preferred[1] + 28],
        [preferred[0] - 34, preferred[1]], [preferred[0] + 34, preferred[1]],
        [preferred[0] - 28, preferred[1] - 24], [preferred[0] + 28, preferred[1] + 24],
        [preferred[0] - 24, preferred[1] + 28], [preferred[0] + 24, preferred[1] - 28],
      ];
      return offsets.filter((offset, index) => offsets.findIndex((item) => item[0] === offset[0] && item[1] === offset[1]) === index);
    };
    const overlaps = (a, b) => !(a.right <= b.left + 2 || a.left >= b.right - 2 || a.bottom <= b.top + 2 || a.top >= b.bottom - 2);
    const resolveCollisions = () => {
      const panelRect = panelEl.getBoundingClientRect();
      const labels = [...panelEl.querySelectorAll('.hero-globe-marker')]
        .filter((marker) => !marker.classList.contains('is-behind-globe'))
        .sort((a, b) => (priority.get(a.dataset.markerId) ?? 99) - (priority.get(b.dataset.markerId) ?? 99));
      const occupied = [];
      labels.forEach((markerEl) => {
        const label = markerEl.querySelector('.hero-globe-marker__label');
        const leader = markerEl.querySelector('.hero-globe-marker__leader');
        if (!label || !leader) return;
        const markerRect = markerEl.getBoundingClientRect();
        let size = metrics.get(markerEl.dataset.markerId);
        if (!size || size.text !== label.textContent) {
          size = { width: label.offsetWidth, height: label.offsetHeight, text: label.textContent };
          metrics.set(markerEl.dataset.markerId, size);
        }
        if (!size.width || !size.height) return;
        const east = label.classList.contains('hero-globe-marker__label--east');
        const distance = Number(markerEl.dataset.labelDistance) || 22;
        const baseX = east ? distance + 4 : -distance - 4 - size.width;
        const baseY = -size.height / 2;
        let best = null;
        candidatesFor(markerEl.dataset.markerId).forEach((offset) => {
          const rect = {
            left: markerRect.left + baseX + offset[0],
            top: markerRect.top + baseY + offset[1],
            right: markerRect.left + baseX + offset[0] + size.width,
            bottom: markerRect.top + baseY + offset[1] + size.height,
          };
          const edgePenalty = Math.max(0, panelRect.left + 8 - rect.left) + Math.max(0, rect.right - panelRect.right + 8) + Math.max(0, panelRect.top + 8 - rect.top) + Math.max(0, rect.bottom - panelRect.bottom + 8);
          const collisionPenalty = occupied.reduce((score, other) => score + (overlaps(rect, other) ? 10000 : 0), 0);
          const displacementPenalty = Math.hypot(offset[0] - (preferredOffsets.get(markerEl.dataset.markerId)?.[0] || 0), offset[1] - (preferredOffsets.get(markerEl.dataset.markerId)?.[1] || 0));
          const score = collisionPenalty + edgePenalty * 30 + displacementPenalty;
          if (!best || score < best.score) best = { rect, offset, score };
        });
        const chosen = best || { rect: { left: markerRect.left + baseX, top: markerRect.top + baseY, right: markerRect.left + baseX + size.width, bottom: markerRect.top + baseY + size.height }, offset: [0, 0] };
        lastOffsets.set(markerEl.dataset.markerId, chosen.offset);
        occupied.push(chosen.rect);
        label.style.setProperty('--label-shift-x', `${chosen.offset[0]}px`);
        label.style.setProperty('--label-shift-y', `${chosen.offset[1]}px`);
        const endX = east ? baseX + chosen.offset[0] : baseX + chosen.offset[0] + size.width;
        const endY = baseY + chosen.offset[1] + size.height / 2;
        leader.style.width = `${Math.max(8, Math.hypot(endX, endY))}px`;
        leader.style.transform = `rotate(${Math.atan2(endY, endX)}rad)`;
      });
    };
    const timer = window.setInterval(resolveCollisions, 180);
    resolveCollisions();
    return () => window.clearInterval(timer);
  }, [panelEl, markersData, allMarkers, isMobile]);

  /* ══════════════════════════════════════════════════════════════════
   *  SEQUENCE ENGINE — progressive route draw + infinite loop
   * ══════════════════════════════════════════════════════════════════ */
  const runSequence = useCallback(() => {
    if (sequenceCancelledRef.current) return;

    const globe = globeRef.current;
    if (!globe) return;

    const controls = globe.controls?.();
    if (controls) {
      controls.autoRotate = false;
      controls.autoRotateSpeed = 0;
    }

    // Reset state — hide everything
    setCompletedArcs([]);
    setActiveArc(null);
    activeDashRef.current = 0;
    setRevealedMarkers([]);
    setArrivalRings([]);
    setShowHub(true);

    const restartAfterShowcase = () => {
      if (sequenceCancelledRef.current) return;
      // Clear all routes + destination labels + hub
      setCompletedArcs([]);
      setActiveArc(null);
      activeDashRef.current = 0;
      setRevealedMarkers([]);
      setArrivalRings([]);
      setShowHub(true);
      // Short pause after clear, then rotate
      scheduleTimer(() => {
        if (sequenceCancelledRef.current) return;
        const from = globe.pointOfView();
        const showcaseTarget = {
          lat: AFRICA_POV.lat,
          lng: AFRICA_POV.lng + 360,
          altitude: AFRICA_POV.altitude,
        };
        cancelCameraRef.current = animateCamera(globe, from, showcaseTarget, SHOWCASE_ROTATION_MS, () => {
          cancelCameraRef.current = null;
          if (sequenceCancelledRef.current) return;
          globe.pointOfView(AFRICA_POV, 0);
          // After globe settles facing Africa — show Tanzania FIRST
          scheduleTimer(() => {
            if (sequenceCancelledRef.current) return;
            setShowHub(true);
            // Then start routes
            scheduleTimer(() => {
              if (sequenceCancelledRef.current) return;
              drawRoute(0);
            }, POST_INTRO_PAUSE_MS);
          }, RESET_SETTLE_MS);
        });
      }, 500);
    };

    /** Draw one route with progressive solid-line reveal. */
    const drawRoute = (index) => {
      if (sequenceCancelledRef.current) return;

      const arc = allArcs[index];
      if (!arc) {
        // All routes done — hold, then loop
        scheduleTimer(() => {
          if (sequenceCancelledRef.current) return;
          restartAfterShowcase();
        }, NETWORK_HOLD_MS);
        return;
      }

      const dest = markerById.get(arc.id);
      if (!dest) {
        drawRoute(index + 1);
        return;
      }

      // Set active arc with dash = 0 (invisible)
      const arcData = { ...arc, dashLength: 0 };
      setActiveArc(arcData);
      activeDashRef.current = 0;

      // Animate dash from 0 → 1 over ROUTE_DRAW_MS
      // With arcDashGap=0 this creates a solid line that grows
      const drawStart = performance.now();
      dashUpdateTimerRef.current = window.setInterval(() => {
        // Keep React out of the 60fps animation loop. The globe still reads
        // the ref-backed dash value, while React only refreshes the arc data
        // at a modest cadence so the route reveal remains visibly animated.
        setActiveArc((prev) => prev ? { ...prev } : null);
      }, ROUTE_FRAME_INTERVAL_MS);
      const routeAnimationFrame = () => {
        if (sequenceCancelledRef.current) return;
        const elapsed = performance.now() - drawStart;
        const t = Math.min(1, elapsed / ROUTE_DRAW_MS);
        activeDashRef.current = easeInOutCubic(t);

        if (t < 1) {
          rafRef.current = requestAnimationFrame(routeAnimationFrame);
        } else {
          rafRef.current = null;
          if (dashUpdateTimerRef.current) {
            clearInterval(dashUpdateTimerRef.current);
            dashUpdateTimerRef.current = null;
          }
          setActiveArc((prev) => prev ? { ...prev } : null);
          // Route complete — move to completed, reveal destination
          setCompletedArcs((prev) => [...prev, { ...arc, dashLength: 1 }]);
          setActiveArc(null);
          activeDashRef.current = 0;
          const ringId = `arrival-${dest.id}-${Date.now()}`;
          setArrivalRings((prev) => [...prev.slice(-2), {
            id: ringId,
            lat: dest.lat,
            lng: dest.lng,
          }]);
          scheduleTimer(() => {
            setArrivalRings((prev) => prev.filter((ring) => ring.id !== ringId));
          }, 1800);
          setRevealedMarkers((prev) => [...prev, dest]);
          // Hold, then next route
          scheduleTimer(() => {
            drawRoute(index + 1);
          }, POST_ROUTE_PAUSE_MS);
        }
      };
      rafRef.current = requestAnimationFrame(routeAnimationFrame);
    };

    // Camera intro from Pacific to Africa
    const introPov = globe.pointOfView();
    cancelCameraRef.current = animateCamera(globe, introPov, AFRICA_POV, CAMERA_INTRO_MS, () => {
      cancelCameraRef.current = null;
      // Show Tanzania first after intro
      scheduleTimer(() => {
        if (sequenceCancelledRef.current) return;
        setShowHub(true);
        // Then start routes
        scheduleTimer(() => {
          if (sequenceCancelledRef.current) return;
          drawRoute(0);
        }, POST_INTRO_PAUSE_MS);
      }, RESET_SETTLE_MS);
    });
  }, [allArcs, markerById, scheduleTimer]);

  /* ── Start/restart on visibility ── */
  useEffect(() => {
    if (reduced) {
      clearTimers();
      setCompletedArcs(allArcs.map((a) => ({ ...a, dashLength: 1 })));
      setActiveArc(null);
      setRevealedMarkers(allMarkers.filter((m) => !m.hub));
      setArrivalRings([]);
      setShowHub(true);
      return undefined;
    }
    if (!globeReady || !sectionVisible || !documentVisible) return undefined;

    sequenceCancelledRef.current = false;
    loopActiveRef.current = true;
    runSequence();

    return () => {
      sequenceCancelledRef.current = true;
      loopActiveRef.current = false;
      clearTimers();
    };
  }, [globeReady, sectionVisible, documentVisible, reduced, runSequence, clearTimers, allArcs, allMarkers]);

  /* ── Pause RAF when section leaves viewport ── */
  useEffect(() => {
    if (sectionVisible) return undefined;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    return undefined;
  }, [sectionVisible]);

  useEffect(() => {
    const onVisibilityChange = () => setDocumentVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  /* Pause GPU work while offscreen. */
  useEffect(() => {
    if (!globeReady) return undefined;
    const globe = globeRef.current;
    if (!globe) return undefined;
    if (sectionVisible && documentVisible) {
      if (typeof globe.resumeAnimation === 'function') globe.resumeAnimation();
    } else if (typeof globe.pauseAnimation === 'function') {
      globe.pauseAnimation();
    }
    return undefined;
  }, [globeReady, sectionVisible, documentVisible]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  /* ── Cap devicePixelRatio ── */
  useEffect(() => {
    const renderer = globeRef.current?.renderer?.();
    if (renderer) renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio));
  }, [globeReady, h, w]);

  const onGlobeReady = useCallback(() => {
    const globe = globeRef.current;
    if (!globe) return;
    globe.pointOfView(AFRICA_POV, 0);
    // 3d-globe's geographic projection is retained as the camera/anchor
    // contract for the embedded World scene.
    const africaAnchor = latLngToVector3(AFRICA_POV.lat, AFRICA_POV.lng, ACETERNITY_3D_CONFIG.radius);
    const scene = globe.scene?.();
    if (scene) scene.userData.aceternityAfricaAnchor = africaAnchor;
    const controls = globe.controls();
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableRotate = true;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minPolarAngle = Math.PI * 0.25;
    controls.maxPolarAngle = Math.PI * 0.75;
    globe.renderer?.().setPixelRatio(Math.min(1.5, window.devicePixelRatio));
    // Aceternity globe-demo material recipe: dark emissive body with a crisp
    // blue Fresnel atmosphere supplied by the 3d-globe implementation.
    const material = globe.globeMaterial?.();
    if (material) {
      material.color?.set(ACETERNITY_GLOBE_CONFIG.globeColor);
      material.emissive?.set(ACETERNITY_GLOBE_CONFIG.emissive);
      material.emissiveIntensity = ACETERNITY_GLOBE_CONFIG.emissiveIntensity;
      material.shininess = ACETERNITY_GLOBE_CONFIG.shininess;
    }
    setGlobeReady(true);
  }, [reduced]);

  /* ── IntersectionObserver for viewport visibility ── */
  useEffect(() => {
    if (!panelEl) {
      setSectionVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setSectionVisible(!!entry?.isIntersecting),
      { threshold: 0.05 },
    );
    observer.observe(panelEl);
    return () => observer.disconnect();
  }, [panelEl]);

  return (
    <Globe
      ref={globeRef}
      width={w}
      height={h}
      backgroundColor="rgba(0,0,0,0)"
      globeImageUrl={TEX.day}
      bumpImageUrl={TEX.bump}
      globeColor={ACETERNITY_GLOBE_CONFIG.globeColor}
      atmosphereColor={ACETERNITY_GLOBE_CONFIG.atmosphereColor}
      atmosphereAltitude={ACETERNITY_GLOBE_CONFIG.atmosphereAltitude}
      atmosphereGlowPower={ACETERNITY_3D_CONFIG.atmosphereIntensity}
      animateIn={false}
      onGlobeReady={onGlobeReady}
      arcsData={arcsData}
      arcColor={() => ROUTE_YELLOW}
      arcAltitude="altitude"
      arcStroke={0.36}
      arcDashLength="dashLength"
      arcDashGap={0}
      arcDashAnimateTime={0}
      arcsTransitionDuration={0}
      htmlElementsData={markersData}
      htmlLat="lat"
      htmlLng="lng"
      htmlAltitude={MARKER_ALTITUDE}
      htmlElement={markerElement}
      htmlTransitionDuration={300}
      htmlElementVisibilityModifier={(element, isVisible) => {
        element.classList.toggle('is-behind-globe', !isVisible);
      }}
      ringsData={arrivalRings}
      ringLat="lat"
      ringLng="lng"
      ringColor={() => ROUTE_YELLOW}
      ringAltitude={MARKER_ALTITUDE + 0.008}
      ringMaxRadius={isMobile ? 1.8 : 2.5}
      ringPropagationSpeed={ACETERNITY_3D_CONFIG.autoRotateSpeed * 6}
      ringRepeatPeriod={1600}
      ringResolution={32}
      // Pointer raycasting performs synchronous GPU ReadPixels work on every
      // frame. The globe's controls remain available, but data-point picking
      // is not used by this presentation and can stall the GPU on Chrome.
      enablePointerInteraction={false}
    />
  );
}

