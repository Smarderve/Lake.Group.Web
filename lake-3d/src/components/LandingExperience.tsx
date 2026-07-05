"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { ScrollProvider, useScrollProgress } from "@/context/ScrollContext";
import { PerformanceProvider } from "@/context/PerformanceContext";
import { useScrollTriggerSetup } from "@/hooks/useScrollTrigger";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { HeroOverlay } from "@/components/ui/HeroOverlay";
import { EndingOverlay } from "@/components/ui/EndingOverlay";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
import { ScrollIndicator } from "@/components/ui/ScrollIndicator";
import { FilmGrain } from "@/components/ui/FilmGrain";
import { ReplayButton } from "@/components/ui/ReplayButton";

const SceneCanvas = dynamic(
  () => import("@/components/scene/SceneCanvas").then((m) => m.SceneCanvas),
  { ssr: false, loading: () => null }
);

function ScrollContent() {
  const { containerRef } = useScrollProgress();
  const [loading, setLoading] = useState(true);

  useScrollTriggerSetup();
  useAutoScroll({ enabled: !loading, duration: 50 });

  const handleReady = useCallback(() => {
    setTimeout(() => setLoading(false), 600);
  }, []);

  return (
    <>
      <LoadingOverlay visible={loading} />
      <AnimatedBackground />
      <FilmGrain />
      <SceneCanvas onReady={handleReady} />
      <HeroOverlay />
      <EndingOverlay />
      <ScrollIndicator />
      <ReplayButton />

      <div ref={containerRef} className="relative z-20 scroll-spacer" />
    </>
  );
}

export function LandingExperience() {
  return (
    <PerformanceProvider>
      <ScrollProvider>
        <ScrollContent />
      </ScrollProvider>
    </PerformanceProvider>
  );
}
