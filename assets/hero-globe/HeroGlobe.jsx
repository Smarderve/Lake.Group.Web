import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import {
  TEX,
  BRAND_YELLOW,
  ROUTE_YELLOW,
  buildMarkers,
  buildArcs,
  prefersReducedMotion,
} from './locations.js';

const MARKER_ICON = 'assets/icons/location-marker.apng';
const INITIAL_POV = { lat: 28, lng: -142, altitude: 2.12 };
const AFRICA_POV = { lat: -4, lng: 33, altitude: 1.85 };
const CAMERA_INTRO_MS = 1000;
const POST_INTRO_PAUSE_MS = 300;
const ROUTE_DRAW_MS = 900;
const POST_ROUTE_PAUSE_MS = 400;
const NETWORK_HOLD_MS = 1500;
const SHOWCASE_ROTATION_MS = 4600;
const RESET_SETTLE_MS = 450;
const MARKER_ALTITUDE = 0.022;

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
  root.style.cssText = 'position:relative;width:0;height:0;pointer-events:none;';

  const pin = document.createElement('img');
  pin.className = 'hero-globe-marker__pin';
  pin.src = MARKER_ICON;
  pin.alt = '';
  pin.width = isMobile ? 15 : 18;
  pin.height = isMobile ? 15 : 18;
  pin.decoding = 'async';
  pin.style.cssText = 'position:absolute;left:0;top:0;transform:translate(-50%,-100%);object-fit:contain;';

  const label = document.createElement('span');
  label.className = 'hero-globe-marker__label';
  label.textContent = marker.label;
  const [ox, oy] = marker.labelOffset || [12, -14];
  const fontSize = isMobile ? 9 : 10.5;
  label.style.cssText = [
    'position:absolute',
    `transform:translate(${ox}px,${oy}px)`,
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

  root.append(pin, label);
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
  return () => { cancelled = true; if (raf) cancelAnimationFrame(raf); };
}

export default function HeroGlobe({ panelEl, locations }) {
  const globeRef = useRef(null);
  const { w, h } = usePanelSize(panelEl);
  const reduced = useReducedMotion();
  const [globeReady, setGlobeReady] = useState(false);
  const [sectionVisible, setSectionVisible] = useState(false);

  /* ── Arc data: completed arcs + one active arc being drawn ── */
  const [completedArcs, setCompletedArcs] = useState([]);
  const [activeArc, setActiveArc] = useState(null);
  const activeDashRef = useRef(0);

  /* ── Marker data: only revealed destinations ── */
  const [revealedMarkers, setRevealedMarkers] = useState([]);

  /* ── Animation lifecycle refs ── */
  const sequenceCancelledRef = useRef(false);
  const rafRef = useRef(null);
  const timersRef = useRef([]);
  const cancelCameraRef = useRef(null);
  const loopActiveRef = useRef(false);

  const allMarkers = useMemo(() => buildMarkers(locations), [locations]);
  const allArcs = useMemo(() => buildArcs(locations), [locations]);
  const markerById = useMemo(
    () => new Map(allMarkers.map((m) => [m.id, m])),
    [allMarkers],
  );

  const isMobile = w < 600;

  /* ── Combined arc data for the Globe component ── */
  const arcsData = useMemo(() => {
    const arcs = completedArcs.map((a) => ({ ...a, dashLength: 1 }));
    if (activeArc) {
      arcs.push({ ...activeArc, dashLength: activeDashRef.current });
    }
    return arcs;
  }, [completedArcs, activeArc]);

  /* ── Combined marker data ── */
  const hubMarker = useMemo(() => allMarkers.find((m) => m.hub), [allMarkers]);
  const markersData = useMemo(() => {
    const list = hubMarker ? [hubMarker] : [];
    return [...list, ...revealedMarkers];
  }, [hubMarker, revealedMarkers]);

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

    // Reset state
    setCompletedArcs([]);
    setActiveArc(null);
    activeDashRef.current = 0;
    setRevealedMarkers([]);

    const restartAfterShowcase = () => {
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
        // Equivalent longitudes preserve the visual orientation without a snap.
        globe.pointOfView(AFRICA_POV, 0);
        scheduleTimer(runSequence, RESET_SETTLE_MS);
      });
    };

    /** Draw one route with progressive dash reveal. */
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
      const drawStart = performance.now();
      const animateDash = () => {
        if (sequenceCancelledRef.current) return;
        const elapsed = performance.now() - drawStart;
        const t = Math.min(1, elapsed / ROUTE_DRAW_MS);
        activeDashRef.current = easeInOutCubic(t);

        // Force re-render by updating activeArc reference
        setActiveArc((prev) => prev ? { ...prev } : null);

        if (t < 1) {
          rafRef.current = requestAnimationFrame(animateDash);
        } else {
          rafRef.current = null;
          // Route complete — move to completed, reveal destination
          setCompletedArcs((prev) => [...prev, { ...arc, dashLength: 1 }]);
          setActiveArc(null);
          activeDashRef.current = 0;
          setRevealedMarkers((prev) => [...prev, dest]);
          // Hold, then next route
          scheduleTimer(() => {
            drawRoute(index + 1);
          }, POST_ROUTE_PAUSE_MS);
        }
      };
      rafRef.current = requestAnimationFrame(animateDash);
    };

    // Camera intro from Pacific to Africa
    const introPov = globe.pointOfView();
    cancelCameraRef.current = animateCamera(globe, introPov, AFRICA_POV, CAMERA_INTRO_MS, () => {
      cancelCameraRef.current = null;
      scheduleTimer(() => drawRoute(0), POST_INTRO_PAUSE_MS);
    });
  }, [allArcs, markerById, scheduleTimer]);

  /* ── Start/restart on visibility ── */
  useEffect(() => {
    if (reduced) {
      clearTimers();
      setCompletedArcs(allArcs.map((a) => ({ ...a, dashLength: 1 })));
      setActiveArc(null);
      setRevealedMarkers(allMarkers.filter((m) => !m.hub));
      return undefined;
    }
    if (!globeReady || !sectionVisible) return undefined;

    sequenceCancelledRef.current = false;
    loopActiveRef.current = true;
    runSequence();

    return () => {
      sequenceCancelledRef.current = true;
      loopActiveRef.current = false;
      clearTimers();
    };
  }, [globeReady, sectionVisible, reduced, runSequence, clearTimers, allArcs, allMarkers]);

  /* ── Pause RAF when section leaves viewport ── */
  useEffect(() => {
    if (sectionVisible) return undefined;
    // Cancel any running RAF
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    return undefined;
  }, [sectionVisible]);

  /* react-globe.gl owns a continuous renderer loop. Keep the already-painted
     base Earth available, but pause GPU work while this section is offscreen. */
  useEffect(() => {
    if (!globeReady) return undefined;
    const globe = globeRef.current;
    if (!globe) return undefined;
    if (sectionVisible) globe.resumeAnimation?.();
    else globe.pauseAnimation?.();
    return undefined;
  }, [globeReady, sectionVisible]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  /* ── Cap devicePixelRatio ── */
  useEffect(() => {
    const renderer = globeRef.current?.renderer?.();
    if (renderer) renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio));
  }, [globeReady, h, w]);

  const onGlobeReady = useCallback(() => {
    const globe = globeRef.current;
    if (!globe) return;
    globe.pointOfView(reduced ? AFRICA_POV : INITIAL_POV, 0);
    const controls = globe.controls();
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.minPolarAngle = Math.PI * 0.25;
    controls.maxPolarAngle = Math.PI * 0.75;
    globe.renderer?.().setPixelRatio(Math.min(1.5, window.devicePixelRatio));
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
      atmosphereColor="#4db8e8"
      atmosphereAltitude={0.14}
      animateIn={false}
      onGlobeReady={onGlobeReady}
      arcsData={arcsData}
      arcColor={() => ROUTE_YELLOW}
      arcAltitude="altitude"
      arcStroke={0.85}
      arcDashLength="dashLength"
      arcDashGap={0.05}
      arcDashAnimateTime={0}
      arcsTransitionDuration={0}
      htmlElementsData={markersData}
      htmlLat="lat"
      htmlLng="lng"
      htmlAltitude={MARKER_ALTITUDE}
      htmlElement={markerElement}
      htmlTransitionDuration={300}
      enablePointerInteraction={!reduced}
    />
  );
}
