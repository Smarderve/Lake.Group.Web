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

  const points = useMemo(() => {
    return buildPoints().map((p) => ({
      ...p,
      color: brandYellow,
    }));
  }, [brandYellow]);

  const arcs = useMemo(() => {
    return buildArcs().map((a) => ({
      ...a,
      color: brandYellow,
    }));
  }, [brandYellow]);

  const rings = useMemo(() => (reduced ? [] : buildRings()), [reduced]);

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
    if (!panelEl) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        const g = globeRef.current;
        if (!g) return;
        const controls = g.controls && g.controls();
        const visible = entries[0] && entries[0].isIntersecting;
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
      pointsData={points}
      pointLat="lat"
      pointLng="lng"
      pointColor="color"
      pointAltitude={0.01}
      pointRadius="size"
      pointResolution={12}
      arcsData={arcs}
      arcColor="color"
      arcAltitude={0.18}
      arcStroke={0.6}
      arcDashLength={reduced ? 1 : 0.45}
      arcDashGap={reduced ? 0 : 0.35}
      arcDashAnimateTime={reduced ? 0 : 2200}
      arcDashInitialGap="dashInitialGap"
      ringsData={rings}
      ringColor={() => BRAND_YELLOW_RING}
      ringMaxRadius="maxR"
      ringPropagationSpeed="propagationSpeed"
      ringRepeatPeriod="repeatPeriod"
      enablePointerInteraction={!reduced}
    />
  );
}
