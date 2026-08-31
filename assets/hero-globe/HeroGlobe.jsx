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
const CAMERA_INTRO_MS = 1200;
const POST_INTRO_PAUSE_MS = 200;
const ROUTE_DRAW_MS = 800;
const POST_ROUTE_PAUSE_MS = 250;
const MARKER_ALTITUDE = 0.022;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Shortest angular difference in degrees */
function angleDiff(a, b) {
  let d = b - a;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
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

function useDocumentVisible() {
  const [visible, setVisible] = useState(() => !document.hidden);
  useEffect(() => {
    const onChange = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return visible;
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
  label.textContent = marker.countryName;
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
 * Returns a cancel function. Calls onDone when complete.
 */
function animateCamera(globe, from, to, durationMs, onDone) {
  const start = performance.now();
  let raf;
  const tick = () => {
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
  return () => { if (raf) cancelAnimationFrame(raf); };
}

export default function HeroGlobe({ panelEl, locations }) {
  const globeRef = useRef(null);
  const { w, h } = usePanelSize(panelEl);
  const reduced = useReducedMotion();
  const documentVisible = useDocumentVisible();
  const [globeReady, setGlobeReady] = useState(false);
  const [sectionVisible, setSectionVisible] = useState(false);
  const [arcsData, setArcsData] = useState([]);
  const [markersData, setMarkersData] = useState([]);
  const arrivalRef = useRef(false);
  const timersRef = useRef([]);
  const cancelCameraRef = useRef(null);

  const allMarkers = useMemo(() => buildMarkers(locations), [locations]);
  const allArcs = useMemo(() => buildArcs(locations), [locations]);
  const markerById = useMemo(
    () => new Map(allMarkers.map((m) => [m.id, m])),
    [allMarkers],
  );

  const isMobile = w < 600;

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
    if (cancelCameraRef.current) {
      cancelCameraRef.current();
      cancelCameraRef.current = null;
    }
  }, []);

  const scheduleTimer = useCallback((fn, delay) => {
    const id = window.setTimeout(fn, delay);
    timersRef.current.push(id);
    return id;
  }, []);

  const showAll = useCallback(() => {
    setArcsData(allArcs);
    setMarkersData(allMarkers);
  }, [allArcs, allMarkers]);

  const markerElement = useCallback(
    (marker) => getCachedMarkerEl(marker, isMobile),
    [isMobile],
  );

  /**
   * Sequential route animation with camera tracking.
   *
   * State machine:
   *   INTRO → DRAW_ROUTE → REVEAL → HOLD → DRAW_ROUTE → ... → COMPLETE
   */
  const startArrival = useCallback(() => {
    clearTimers();

    const hub = allMarkers.find((m) => m.hub);
    setArcsData([]);
    setMarkersData(hub ? [hub] : []);

    const globe = globeRef.current;
    const controls = globe?.controls?.();
    if (!globe || !controls) {
      showAll();
      return;
    }

    controls.autoRotate = false;
    controls.autoRotateSpeed = 0;
    const currentPov = globe.pointOfView();

    /** Draw one route at index, then reveal destination, then next. */
    const drawRoute = (index) => {
      const arc = allArcs[index];
      if (!arc) return; // all done

      const dest = markerById.get(arc.id);
      if (!dest) {
        drawRoute(index + 1);
        return;
      }

      // --- Step 1: Mount zero-length arc at Tanzania ---
      const activeArc = { ...arc, endLat: arc.startLat, endLng: arc.startLng };
      setArcsData((cur) => [...cur, activeArc]);

      // --- Step 2: Camera gently tracks toward destination ---
      const fromPov = globe.pointOfView();
      // Compute a camera POV that keeps both Tanzania and destination visible
      const midLat = (arc.startLat + arc.endLat) / 2;
      const midLng = (arc.startLng + arc.endLng) / 2;
      // Slightly pull back altitude for longer routes
      const dist = Math.sqrt(
        Math.pow(arc.endLat - arc.startLat, 2) +
        Math.pow(angleDiff(arc.startLng, arc.endLng), 2),
      );
      const targetAlt = Math.min(2.2, Math.max(1.6, 1.4 + dist * 0.015));
      const trackPov = { lat: midLat, lng: midLng, altitude: targetAlt };

      cancelCameraRef.current = animateCamera(globe, fromPov, trackPov, ROUTE_DRAW_MS, () => {
        cancelCameraRef.current = null;
      });

      // --- Step 3: After 1 frame, tween arc endpoint to destination ---
      scheduleTimer(() => {
        activeArc.endLat = arc.endLat;
        activeArc.endLng = arc.endLng;
        setArcsData((cur) => cur.slice());
      }, 16);

      // --- Step 4: After route draw, reveal destination marker + label ---
      scheduleTimer(() => {
        setMarkersData((cur) => [...cur, dest]);

        // --- Step 5: Brief hold, then next route ---
        scheduleTimer(() => drawRoute(index + 1), POST_ROUTE_PAUSE_MS);
      }, ROUTE_DRAW_MS + 80);
    };

    // --- INTRO: Camera from Pacific to Africa ---
    cancelCameraRef.current = animateCamera(
      globe,
      currentPov,
      AFRICA_POV,
      CAMERA_INTRO_MS,
      () => {
        cancelCameraRef.current = null;
        scheduleTimer(() => drawRoute(0), POST_INTRO_PAUSE_MS);
      },
    );
  }, [allArcs, allMarkers, clearTimers, markerById, scheduleTimer, showAll]);

  // Start arrival sequence when globe + section are ready
  useEffect(() => {
    if (reduced) {
      arrivalRef.current = true;
      clearTimers();
      showAll();
      return undefined;
    }
    if (!globeReady || !sectionVisible || arrivalRef.current) return undefined;
    arrivalRef.current = true;
    startArrival();
    return undefined;
  }, [clearTimers, globeReady, reduced, sectionVisible, showAll, startArrival]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // Pause/resume when section leaves viewport
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !globeReady) return undefined;
    if (sectionVisible && documentVisible) {
      globe.resumeAnimation();
      return undefined;
    }
    globe.pauseAnimation();
    if (arrivalRef.current && !reduced) {
      clearTimers();
      showAll();
    }
    return undefined;
  }, [clearTimers, documentVisible, globeReady, reduced, sectionVisible, showAll]);

  // Cap devicePixelRatio for performance
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

  // IntersectionObserver for viewport visibility
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
      arcDashLength={1}
      arcDashGap={0}
      arcDashAnimateTime={0}
      arcsTransitionDuration={ROUTE_DRAW_MS}
      htmlElementsData={markersData}
      htmlLat="lat"
      htmlLng="lng"
      htmlAltitude={MARKER_ALTITUDE}
      htmlElement={markerElement}
      htmlTransitionDuration={0}
      enablePointerInteraction={!reduced}
    />
  );
}
