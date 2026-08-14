import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import { TEX, buildPoints, buildRings, prefersReducedMotion } from './locations.js';

/** Slow, deliberate sweep — one full revolution, then stop facing Africa. */
const ROTATE_SPEED = 1.6; // ~18–24 s per orbit (measured azimuth, not wall time)
const ROTATE_FALLBACK_MS = 26000; // safety stop if azimuth polling is unavailable

/** Destination labels — a pointer dot with the country name above it. */
const LABEL_SIZE = 2.5; // text height in deg — clearly readable (was 1.5)
const LABEL_DOT_RADIUS = 0.5; // pointer dot radius in deg — reads as a pin
const LABEL_ALTITUDE = 0.03; // float just above the surface
const LABEL_RESOLUTION = 10; // smoother text curves

/** Location markers are white so they read cleanly against the globe. */
const MARKER_WHITE = '#ffffff';
const MARKER_WHITE_RING = (t) => `rgba(255, 255, 255, ${Math.max(0, 1 - t)})`;

/** Africa-facing point of view — the destination cluster is centred here. */
const AFRICA_POV = { lat: -4.5, lng: 35, altitude: 2.15 };

function usePanelSize(panelEl) {
  const [size, setSize] = useState(() => {
    if (!panelEl) return { w: 640, h: 480 };
    const r = panelEl.getBoundingClientRect();
    return {
      w: Math.max(1, Math.floor(r.width)),
      h: Math.max(1, Math.floor(r.height)),
    };
  });

  useEffect(() => {
    if (!panelEl) return undefined;
    const measure = () => {
      const r = panelEl.getBoundingClientRect();
      setSize({
        w: Math.max(1, Math.floor(r.width)),
        h: Math.max(1, Math.floor(r.height)),
      });
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

export default function HeroGlobe({ panelEl, locations }) {
  const globeRef = useRef(null);
  const { w, h } = usePanelSize(panelEl);
  const reduced = useReducedMotion();

  const allPoints = useMemo(() => {
    return buildPoints(locations).map((p) => ({
      ...p,
      color: MARKER_WHITE,
    }));
  }, [locations]);

  const allRings = useMemo(() => (reduced ? [] : buildRings(locations)), [locations, reduced]);

  // Destination labels: pointer dot + country name, shown once the globe
  // settles facing Africa. No arcs/lines — locations only.
  const allLabels = useMemo(() => {
    return locations
      .filter((loc) => !loc.hub)
      .map((loc) => ({
        id: loc.id,
        lat: loc.lat,
        lng: loc.lng,
        text: loc.countryName || String(loc.name || '').split(' · ')[0] || loc.name,
        color: MARKER_WHITE,
      }));
  }, [locations]);

  const [pointsData, setPointsData] = useState([]);
  const [ringsData, setRingsData] = useState([]);
  const [labelsData, setLabelsData] = useState([]);
  const [globeReady, setGlobeReady] = useState(false);
  const [sectionVisible, setSectionVisible] = useState(false);
  const sectionVisibleRef = useRef(false);
  const arrivalStartedRef = useRef(false);
  const rafRef = useRef([]);

  const clearScheduled = useCallback(() => {
    rafRef.current.forEach((id) => cancelAnimationFrame(id));
    rafRef.current = [];
  }, []);

  const showFinalState = useCallback(() => {
    setPointsData(allPoints);
    setRingsData(allRings);
    setLabelsData(allLabels);
  }, [allPoints, allRings, allLabels]);

  const applySpin = useCallback(
    (visible) => {
      sectionVisibleRef.current = visible;
      setSectionVisible(visible);
      const g = globeRef.current;
      if (!g) return;
      if (typeof g.pauseAnimation === 'function' && typeof g.resumeAnimation === 'function') {
        if (visible) g.resumeAnimation();
        else g.pauseAnimation();
      }
    },
    [],
  );

  /**
   * Entrance: start facing Africa, sweep one full slow revolution, then STOP
   * exactly when Africa is centred again and reveal every location (points +
   * labels). Progress is measured from the orbit controls' azimuth — the stop
   * always lands on Africa regardless of frame rate or spin speed.
   */
  const startArrival = useCallback(() => {
    clearScheduled();
    setPointsData([]);
    setRingsData([]);
    setLabelsData([]);

    const g = globeRef.current;
    if (!g) {
      showFinalState();
      return;
    }
    const controls = g.controls && g.controls();
    if (!controls) {
      showFinalState();
      return;
    }

    // HQ marker + pulse ring ride along during the sweep.
    const hub = allPoints.find((p) => p.hub);
    setPointsData(hub ? [hub] : []);
    setRingsData(allRings);

    const useAzimuth = typeof controls.getAzimuthalAngle === 'function';
    let prev = useAzimuth ? controls.getAzimuthalAngle() : 0;
    let accumulated = 0;
    const startedAt = performance.now();

    controls.autoRotate = true;
    controls.autoRotateSpeed = ROTATE_SPEED;

    const tick = () => {
      const visible = sectionVisibleRef.current;
      controls.autoRotate = visible; // pause the sweep politely off-screen
      controls.autoRotateSpeed = visible ? ROTATE_SPEED : 0;

      let done = false;
      if (useAzimuth) {
        const cur = controls.getAzimuthalAngle();
        let delta = cur - prev;
        // wrap into (-π, π] so a 2π boundary crossing doesn't look like a jump
        delta = ((delta + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
        accumulated += Math.abs(delta);
        prev = cur;
        done = accumulated >= 2 * Math.PI; // one full turn → Africa again
      } else if (performance.now() - startedAt >= ROTATE_FALLBACK_MS) {
        done = true;
      }

      if (done) {
        controls.autoRotate = false;
        controls.autoRotateSpeed = 0;
        showFinalState();
        return;
      }
      const id = requestAnimationFrame(tick);
      rafRef.current.push(id);
    };
    const id = requestAnimationFrame(tick);
    rafRef.current.push(id);
  }, [allPoints, allRings, showFinalState, clearScheduled]);

  // Reduced motion: final state immediately. Else: one arrival once ready +
  // on screen. The globe then stays stopped facing Africa — no replay loop.
  useEffect(() => {
    if (reduced) {
      arrivalStartedRef.current = true;
      clearScheduled();
      showFinalState();
      return undefined;
    }
    if (!globeReady || !sectionVisible || arrivalStartedRef.current) {
      return undefined;
    }
    arrivalStartedRef.current = true;
    startArrival();
    return undefined;
  }, [reduced, globeReady, sectionVisible, startArrival, showFinalState, clearScheduled]);

  useEffect(() => () => clearScheduled(), [clearScheduled]);

  const onGlobeReady = useCallback(() => {
    const g = globeRef.current;
    if (!g) return;
    g.pointOfView(AFRICA_POV, 0);
    const controls = g.controls();
    if (controls) {
      controls.autoRotate = false; // the arrival sequence owns rotation
      controls.autoRotateSpeed = 0;
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.minPolarAngle = Math.PI * 0.25;
      controls.maxPolarAngle = Math.PI * 0.75;
    }
    setGlobeReady(true);
  }, []);

  useEffect(() => {
    applySpin(sectionVisibleRef.current);
  }, [reduced, applySpin]);

  useEffect(() => {
    if (!panelEl) {
      applySpin(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        applySpin(!!(entries[0] && entries[0].isIntersecting));
      },
      { threshold: 0.05 },
    );
    io.observe(panelEl);
    return () => io.disconnect();
  }, [panelEl, applySpin]);

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
      labelsData={labelsData}
      labelLat="lat"
      labelLng="lng"
      labelText="text"
      labelColor="color"
      labelSize={LABEL_SIZE}
      labelAltitude={LABEL_ALTITUDE}
      labelIncludeDot
      labelDotRadius={LABEL_DOT_RADIUS}
      labelDotOrientation={() => 'top'}
      labelResolution={LABEL_RESOLUTION}
      enablePointerInteraction={!reduced}
    />
  );
}
