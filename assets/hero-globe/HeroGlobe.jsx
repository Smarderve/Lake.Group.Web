import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import {
  TEX,
  BRAND_YELLOW,
  BRAND_YELLOW_SOFT,
  LABEL_COLOR,
  buildPoints,
  buildArcs,
  buildRings,
  buildLabels,
  prefersReducedMotion,
} from './locations.js';

/* Camera / timing constants */

const AFRICA_POV = { lat: -4, lng: 33, altitude: 1.85 };
const SETTLE_DURATION_MS = 2000;
const POST_SETTLE_PAUSE_MS = 500;
const ARC_DRAW_DURATION_MS = 2000;
const ARC_STAGGER_MS = 450;

/* Label / marker styling */

const LABEL_SIZE = 0.55;
const LABEL_ALTITUDE = 0.02;
const LABEL_DOT_RADIUS = 0.15;
const LABEL_RESOLUTION = 10;

const MARKER_WHITE = '#ffffff';
const MARKER_WHITE_RING = (t) => `rgba(255, 255, 255, ${Math.max(0, 1 - t)})`;

/* Easing helper */

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/* Hooks */

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
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(panelEl);
    return () => ro.disconnect();
  }, [panelEl]);

  return size;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(prefersReducedMotion);

  useEffect(() => {
    let mq;
    try {
      mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    } catch (_) {
      return undefined;
    }
    const onChange = () => setReduced(!!mq.matches);
    onChange();
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else if (mq.removeListener) mq.removeListener(onChange);
    };
  }, []);

  return reduced;
}

/* Component */

export default function HeroGlobe({ panelEl, locations }) {
  const globeRef = useRef(null);
  const { w, h } = usePanelSize(panelEl);
  const reduced = useReducedMotion();

  const allPoints = useMemo(() => buildPoints(locations).map((p) => ({ ...p, color: MARKER_WHITE })), [locations]);
  const allRings = useMemo(() => (reduced ? [] : buildRings(locations)), [locations, reduced]);
  const allArcs = useMemo(() => buildArcs(locations), [locations]);
  const allLabels = useMemo(() => buildLabels(locations), [locations]);

  const [pointsData, setPointsData] = useState([]);
  const [ringsData, setRingsData] = useState([]);
  const [arcsData, setArcsData] = useState([]);
  const [labelsData, setLabelsData] = useState([]);

  const [globeReady, setGlobeReady] = useState(false);
  const [sectionVisible, setSectionVisible] = useState(false);
  const sectionVisibleRef = useRef(false);
  const arrivalRef = useRef(false);
  const rafIds = useRef([]);
  const timersRef = useRef([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
    rafIds.current.forEach((id) => cancelAnimationFrame(id));
    rafIds.current = [];
  }, []);

  const scheduleTimer = useCallback((fn, ms) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  const showAll = useCallback(() => {
    setPointsData(allPoints);
    setRingsData(allRings);
    setArcsData(allArcs);
    setLabelsData(allLabels);
  }, [allPoints, allRings, allArcs, allLabels]);

  const startArrival = useCallback(() => {
    clearTimers();
    setPointsData([]);
    setRingsData([]);
    setArcsData([]);
    setLabelsData([]);

    const g = globeRef.current;
    if (!g) { showAll(); return; }
    const controls = g.controls && g.controls();
    if (!controls) { showAll(); return; }

    controls.autoRotate = false;
    controls.autoRotateSpeed = 0;

    const startPov = g.pointOfView();
    const startTime = performance.now();

    const hub = allPoints.find((p) => p.hub);
    setPointsData(hub ? [hub] : []);
    setRingsData(allRings);

    const tick = () => {
      const now = performance.now();
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / SETTLE_DURATION_MS);
      const e = easeInOutCubic(t);

      const lat = startPov.lat + (AFRICA_POV.lat - startPov.lat) * e;
      const lng = startPov.lng + (AFRICA_POV.lng - startPov.lng) * e;
      const alt = startPov.altitude + (AFRICA_POV.altitude - startPov.altitude) * e;
      g.pointOfView({ lat, lng, altitude: alt }, 0);

      if (t < 1) {
        const id = requestAnimationFrame(tick);
        rafIds.current.push(id);
      } else {
        scheduleTimer(revealRoutes, POST_SETTLE_PAUSE_MS);
      }
    };
    const id = requestAnimationFrame(tick);
    rafIds.current.push(id);

    function revealRoutes() {
      const orderMap = new Map(allArcs.map((arc, i) => [arc.id, i]));
      const orderedDestinations = allPoints
        .filter((p) => !p.hub)
        .sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));

      const orderedLabels = allLabels
        .slice()
        .sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));

      orderedDestinations.forEach((dest, idx) => {
        const delay = idx * ARC_STAGGER_MS;

        scheduleTimer(() => {
          setArcsData((prev) => {
            const arc = allArcs.find((a) => a.id === dest.id);
            return arc ? [...prev, arc] : prev;
          });

          scheduleTimer(() => {
            setPointsData((prev) => [...prev, dest]);
            const lbl = orderedLabels.find((l) => l.id === dest.id);
            if (lbl) setLabelsData((prev) => [...prev, lbl]);
          }, ARC_DRAW_DURATION_MS);
        }, delay);
      });
    }
  }, [allPoints, allRings, allArcs, allLabels, showAll, clearTimers, scheduleTimer]);

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
  }, [reduced, globeReady, sectionVisible, startArrival, showAll, clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const onGlobeReady = useCallback(() => {
    const g = globeRef.current;
    if (!g) return;
    g.pointOfView(AFRICA_POV, 0);
    const controls = g.controls();
    if (controls) {
      controls.autoRotate = false;
      controls.autoRotateSpeed = 0;
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.minPolarAngle = Math.PI * 0.25;
      controls.maxPolarAngle = Math.PI * 0.75;
    }
    setGlobeReady(true);
  }, []);

  useEffect(() => {
    if (!panelEl) {
      setSectionVisible(true);
      sectionVisibleRef.current = true;
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        const visible = !!(entries[0] && entries[0].isIntersecting);
        sectionVisibleRef.current = visible;
        setSectionVisible(visible);
      },
      { threshold: 0.05 },
    );
    io.observe(panelEl);
    return () => io.disconnect();
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
      animateIn={!reduced}
      onGlobeReady={onGlobeReady}
      pointsData={pointsData}
      pointLat="lat"
      pointLng="lng"
      pointColor="color"
      pointAltitude={0.01}
      pointRadius="size"
      pointResolution={12}
      ringsData={ringsData}
      ringColor={() => MARKER_WHITE_RING}
      ringMaxRadius="maxR"
      ringPropagationSpeed="propagationSpeed"
      ringRepeatPeriod="repeatPeriod"
      arcsData={arcsData}
      arcColor={() => [BRAND_YELLOW_SOFT, BRAND_YELLOW]}
      arcAltitudeAutoScale={0.15}
      arcStroke={0.4}
      arcDashLength={1}
      arcDashGap={0}
      arcDashInitialGap={0}
      arcDashAnimateTime={ARC_DRAW_DURATION_MS}
      labelsData={labelsData}
      labelLat="lat"
      labelLng="lng"
      labelText="text"
      labelColor="color"
      labelSize="size"
      labelAltitude={LABEL_ALTITUDE}
      labelIncludeDot
      labelDotRadius={LABEL_DOT_RADIUS}
      labelDotOrientation={() => 'top'}
      labelResolution={LABEL_RESOLUTION}
      enablePointerInteraction={!reduced}
    />
  );
}