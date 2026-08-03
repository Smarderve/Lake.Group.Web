"use client";

import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import type { PerformanceTier } from "@/hooks/usePerformanceTier";

interface PostEffectsProps {
  tier?: PerformanceTier;
}

export function PostEffects({ tier = "high" }: PostEffectsProps) {
  if (tier === "low") {
    return (
      <EffectComposer multisampling={0}>
        <Vignette eskil={false} offset={0.1} darkness={0.5} />
      </EffectComposer>
    );
  }

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        luminanceThreshold={0.55}
        luminanceSmoothing={0.85}
        intensity={0.35}
        mipmapBlur
      />
      <Vignette eskil={false} offset={0.12} darkness={0.65} />
    </EffectComposer>
  );
}
