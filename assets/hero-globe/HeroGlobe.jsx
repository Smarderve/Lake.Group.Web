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
const ROUTE_FRAME_INTERVAL_MS = 1000 / 30;

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

function useDocumentVisible() {
  const [visible, setVisible] = useState(() => !document.hidden);

  useEffect(() => {
    const onVisibilityChange = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  return visible;
}

/* Component */

export default function HeroGlobe({ panelEl, locations }) {
  const globeRef = useRef(null);
  const { w, h } = usePanelSize(panelEl);
  const reduced = useReducedMotion();
  const documentVisible = useDocumentVisible();

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
  const cameraFrameRef = useRef(null);
  const routeAnimationFrame = useRef(null);
  const timersRef = useRef([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
    if (cameraFrameRef.current !== null) cancelAnimationFrame(cameraFrameRef.current);
    if (routeAnimationFrame.current !== null) cancelAnimationFrame(routeAnimationFrame.current);
    cameraFrameRef.current = null;
    routeAnimationFrame.current = null;
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
        cameraFrameRef.current = requestAnimationFrame(tick);
      } else {
        cameraFrameRef.current = null;
        scheduleTimer(revealRoutes, POST_SETTLE_PAUSE_MS);
      }
    };
    cameraFrameRef.current = requestAnimationFrame(tick);

    function revealRoutes() {
      const orderMap = new Map(allArcs.map((arc, i) => [arc.id, i]));
      const orderedDestinations = allPoints
        .filter((p) => !p.hub)
        .sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));

      const orderedLabels = allLabels
        .slice()
        .sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));

      const routePlan = orderedDestinations
        .map((dest, index) => ({
          arc: allArcs.find((item) => item.id === dest.id),
          destination: dest,
          label: orderedLabels.find((item) => item.id === dest.id),
          startAt: performance.now() + index * ARC_STAGGER_MS,
        }))
        .filter((route) => route.arc);
      const hubPoint = allPoints.find((point) => point.hub);
      const hubLabel = allLabels.find((label) => label.id === hubPoint?.id);
      let lastCommit = 0;

      /* One coordinated RAF commits the whole route plan at 30fps. The
         previous per-route RAFs could overlap and force many React renders in
         one display frame as the network built. */
      const drawRoutes = (now) => {
        const shownArcs = [];
        const shownPoints = hubPoint ? [hubPoint] : [];
        const shownLabels = hubLabel ? [hubLabel] : [];
        let complete = true;

        routePlan.forEach((route) => {
          if (now < route.startAt) {
            complete = false;
            return;
          }
          const progress = Math.min(1, (now - route.startAt) / ARC_DRAW_DURATION_MS);
          shownArcs.push({ ...route.arc, progress: Math.max(0.001, easeInOutCubic(progress)) });
          if (progress < 1) complete = false;
          else {
            shownPoints.push(route.destination);
            if (route.label) shownLabels.push(route.label);
          }
        });

        if (complete || now - lastCommit >= ROUTE_FRAME_INTERVAL_MS) {
          lastCommit = now;
          setArcsData(shownArcs);
          setPointsData(shownPoints);
          setLabelsData(shownLabels);
        }
        if (!complete) {
          routeAnimationFrame.current = requestAnimationFrame(drawRoutes);
        } else {
          routeAnimationFrame.current = null;
        }
      };

      routeAnimationFrame.current = requestAnimationFrame(drawRoutes);
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

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !globeReady) return undefined;
    const active = sectionVisible && documentVisible;
    if (active) {
      globe.resumeAnimation();
      return undefined;
    }

    globe.pauseAnimation();
    /* Do not keep route/camera RAF work alive after the panel leaves view.
       Returning visitors see the already-complete approved network rather
       than a hidden animation consuming CPU or restarting unexpectedly. */
    if (arrivalRef.current && !reduced) {
      clearTimers();
      showAll();
    }
    return undefined;
  }, [globeReady, sectionVisible, documentVisible, reduced, clearTimers, showAll]);

  useEffect(() => {
    const renderer = globeRef.current?.renderer?.();
    if (renderer) renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio));
  }, [globeReady, w, h]);

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
    const renderer = g.renderer?.();
    if (renderer) renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio));
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
