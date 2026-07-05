"use client";

export type PerformanceTier = "high" | "low";

function detectTier(): PerformanceTier {
  if (typeof window === "undefined") return "high";

  const mobile = window.matchMedia("(max-width: 768px)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const lowMemory = nav.deviceMemory !== undefined && nav.deviceMemory <= 4;
  const lowCores = navigator.hardwareConcurrency <= 4;

  return mobile || coarse || lowMemory || lowCores ? "low" : "high";
}

export function usePerformanceTier(): PerformanceTier {
  return detectTier();
}
