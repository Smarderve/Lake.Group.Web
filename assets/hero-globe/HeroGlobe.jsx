import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import {
  TEX,
  BRAND_YELLOW,
  ROUTE_BLUE_START,
  ROUTE_BLUE_END,
  buildPoints,
  buildArcs,
  buildRings,
  buildLabels,
  prefersReducedMotion,
} from './locations.js';

/* Camera / timing constants */

const INITIAL_POV = { lat: 28, lng: -142, altitude: 2.12 };
const AFRICA_POV = { lat: -4, lng: 33, altitude: 1.85 };
const SETTLE_DURATION_MS = 2400;
const POST_SETTLE_PAUSE_MS = 400;
const ARC_DRAW_DURATION_MS = 1800;
const ARC_STAGGER_MS = 280;

/* Label / marker styling */

const LABEL_ALTITUDE = 0.022;
const LABEL_DOT_RADIUS = 0.18;
const LABEL_RESOLUTION = 12;

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

  const allPoints = useMemo(() => buildPoints(locations).map((p) => ({ ...p, color: p.hub ? BRAND_YELLOW : MARKER_WHITE })), [locations]);
  const allRings = useMemo(() => (reduced ? [] : buildRings(locations)), [locations, reduced]);
  const allArcs = useMemo(() => buildArcs(locations), [locations]);
  const allLabels = useMemo(() => {
    // Preserve a controlled label scale on phones, where the globe occupies a
    // smaller physical area but the country names remain essential content.
    const compactMultiplier = w < 600 ? 1.35 : 1;
    return buildLabels(locations).map((label) => ({
      ...label,
      size: label.size * compactMultiplier,
    }));
  }, [locations, w]);

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
    const hubLabel = allLabels.find((label) => label.id === hub?.id);
    setPointsData(hub ? [hub] : []);
    setRingsData(allRings);
    setLabelsData(hubLabel ? [hubLabel] : []);

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
          const arc = allArcs.find((item) => item.id === dest.id);
          if (!arc) return;
          setArcsData((prev) => [...prev, { ...arc, progress: 0.001 }]);

          const drawStartedAt = performance.now();
          const drawRoute = () => {
            const t = Math.min(1, (performance.now() - drawStartedAt) / ARC_DRAW_DURATION_MS);
            const progress = easeInOutCubic(t);
            setArcsData((prev) => prev.map((item) => item.id === arc.id ? { ...item, progress } : item));
            if (t < 1) {
              const id = requestAnimationFrame(drawRoute);
              rafIds.current.push(id);
              return;
            }
            setPointsData((prev) => [...prev, dest]);
            const lbl = orderedLabels.find((label) => label.id === dest.id);
            if (lbl) setLabelsData((prev) => [...prev, lbl]);
          };
          const id = requestAnimationFrame(drawRoute);
          rafIds.current.push(id);
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
    // Begin with a controlled global view, then run the single cinematic move
    // toward East Africa once the section becomes visible.
    g.pointOfView(reduced ? AFRICA_POV : INITIAL_POV, 0);
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
  }, [reduced]);

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
      animateIn={false}
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
      arcColor={() => [ROUTE_BLUE_START, ROUTE_BLUE_END]}
      arcAltitude="altitude"
      arcStroke={1.0}
      arcDashLength="progress"
      arcDashGap={0}
      arcDashInitialGap={0}
      arcDashAnimateTime={0}
      arcsTransitionDuration={0}
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
