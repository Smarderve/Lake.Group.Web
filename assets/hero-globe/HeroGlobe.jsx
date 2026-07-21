import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import {
  TEX,
  buildArcs,
  buildPoints,
  buildRings,
  prefersReducedMotion,
  readBrandYellow,
  BRAND_YELLOW_RING,
} from './locations.js';

/** Entrance timing (ms) — ease-out draw, once per load when section is visible. */
const MARKER_START_MS = 350;
const MARKER_STAGGER_MS = 95;
const ARC_PAUSE_MS = 380;
const ARC_DRAW_MS = 720;
const ARC_STAGGER_MS = 160;
const ARC_DRAW_GAP = 1.2;

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function solidifyArc(arc) {
  return {
    ...arc,
    dashLength: 1,
    dashGap: 0,
    dashAnimateTime: 0,
  };
}

function drawingArc(arc, progress = 0) {
  return {
    ...arc,
    dashLength: progress,
    dashGap: ARC_DRAW_GAP,
    dashAnimateTime: 0,
  };
}

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

export default function HeroGlobe({ panelEl }) {
  const globeRef = useRef(null);
  const { w, h } = usePanelSize(panelEl);
  const reduced = useReducedMotion();
  const brandYellow = useMemo(() => readBrandYellow(), []);

  const allPoints = useMemo(() => {
    return buildPoints().map((p) => ({
      ...p,
      color: brandYellow,
    }));
  }, [brandYellow]);

  const allArcs = useMemo(() => {
    return buildArcs().map((a) => ({
      ...a,
      color: brandYellow,
    }));
  }, [brandYellow]);

  const allRings = useMemo(() => (reduced ? [] : buildRings()), [reduced]);

  const [pointsData, setPointsData] = useState([]);
  const [arcsData, setArcsData] = useState([]);
  const [ringsData, setRingsData] = useState([]);
  const [globeReady, setGlobeReady] = useState(false);
  const [sectionVisible, setSectionVisible] = useState(false);
  const sequenceStartedRef = useRef(false);
  const timersRef = useRef([]);
  const rafRef = useRef([]);

  const clearScheduled = useCallback(() => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
    rafRef.current.forEach((id) => cancelAnimationFrame(id));
    rafRef.current = [];
  }, []);

  const schedule = useCallback((fn, ms) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  const showFinalState = useCallback(() => {
    setPointsData(allPoints);
    setArcsData(allArcs.map(solidifyArc));
    setRingsData(allRings);
  }, [allPoints, allArcs, allRings]);

  const runEntrance = useCallback(() => {
    clearScheduled();
    setPointsData([]);
    setArcsData([]);
    setRingsData([]);

    // 1) Markers — HQ first (locations order), then spokes; ring with HQ.
    allPoints.forEach((point, i) => {
      schedule(() => {
        setPointsData((prev) => {
          if (prev.some((p) => p.id === point.id)) return prev;
          return [...prev, point];
        });
        if (point.hub && allRings.length) {
          setRingsData(allRings);
        }
      }, MARKER_START_MS + i * MARKER_STAGGER_MS);
    });

    const arcsStartAt =
      MARKER_START_MS + allPoints.length * MARKER_STAGGER_MS + ARC_PAUSE_MS;

    // 2) Arcs — TZ HQ → each country; progressive dashLength 0→1, then solid.
    allArcs.forEach((arc, i) => {
      const startAt = arcsStartAt + i * ARC_STAGGER_MS;

      schedule(() => {
        setArcsData((prev) => {
          if (prev.some((a) => a.id === arc.id)) return prev;
          return [...prev, drawingArc(arc, 0)];
        });

        const t0 = performance.now();
        const tick = (now) => {
          const raw = Math.min(1, (now - t0) / ARC_DRAW_MS);
          const progress = easeOutCubic(raw);
          setArcsData((prev) =>
            prev.map((a) => (a.id === arc.id ? drawingArc(arc, progress) : a)),
          );
          if (raw < 1) {
            const rafId = requestAnimationFrame(tick);
            rafRef.current.push(rafId);
          } else {
            setArcsData((prev) =>
              prev.map((a) => (a.id === arc.id ? solidifyArc(arc) : a)),
            );
          }
        };
        const rafId = requestAnimationFrame(tick);
        rafRef.current.push(rafId);
      }, startAt);
    });
  }, [allPoints, allArcs, allRings, clearScheduled, schedule]);

  // Reduced motion: final state immediately. Else: once when ready + visible.
  // Do not clear timers on dep churn — that would abort a running once-per-load sequence.
  useEffect(() => {
    if (reduced) {
      sequenceStartedRef.current = true;
      clearScheduled();
      showFinalState();
      return undefined;
    }
    if (!globeReady || !sectionVisible || sequenceStartedRef.current) {
      return undefined;
    }
    sequenceStartedRef.current = true;
    runEntrance();
    return undefined;
  }, [
    reduced,
    globeReady,
    sectionVisible,
    runEntrance,
    showFinalState,
    clearScheduled,
  ]);

  useEffect(() => () => clearScheduled(), [clearScheduled]);

  const onGlobeReady = useCallback(() => {
    const g = globeRef.current;
    if (!g) return;
    g.pointOfView({ lat: -4.5, lng: 32, altitude: 2.15 }, 0);
    const controls = g.controls();
    if (controls) {
      controls.autoRotate = !reduced;
      controls.autoRotateSpeed = reduced ? 0 : 0.35;
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.minPolarAngle = Math.PI * 0.25;
      controls.maxPolarAngle = Math.PI * 0.75;
    }
    setGlobeReady(true);
  }, [reduced]);

  useEffect(() => {
    const g = globeRef.current;
    if (!g) return undefined;
    const controls = g.controls && g.controls();
    if (controls) {
      controls.autoRotate = !reduced;
      controls.autoRotateSpeed = reduced ? 0 : 0.35;
    }
    return undefined;
  }, [reduced]);

  useEffect(() => {
    if (!panelEl) {
      setSectionVisible(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        const g = globeRef.current;
        const visible = !!(entries[0] && entries[0].isIntersecting);
        setSectionVisible(visible);
        if (!g) return;
        const controls = g.controls && g.controls();
        if (controls) {
          controls.autoRotate = !!(visible && !reduced);
        }
        if (typeof g.pauseAnimation === 'function' && typeof g.resumeAnimation === 'function') {
          if (visible) g.resumeAnimation();
          else g.pauseAnimation();
        }
      },
      { threshold: 0.05 },
    );
    io.observe(panelEl);
    return () => io.disconnect();
  }, [panelEl, reduced]);

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
      arcsData={arcsData}
      arcColor="color"
      arcAltitude={0.12}
      arcStroke={0.6}
      arcDashLength="dashLength"
      arcDashGap="dashGap"
      arcDashAnimateTime="dashAnimateTime"
      ringsData={ringsData}
      ringColor={() => BRAND_YELLOW_RING}
      ringMaxRadius="maxR"
      ringPropagationSpeed="propagationSpeed"
      ringRepeatPeriod="repeatPeriod"
      enablePointerInteraction={!reduced}
    />
  );
}
