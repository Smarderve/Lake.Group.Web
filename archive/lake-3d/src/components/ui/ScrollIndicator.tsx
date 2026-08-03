"use client";

import { useScrollProgress } from "@/context/ScrollContext";

export function ScrollIndicator() {
  const { progress } = useScrollProgress();

  if (progress > 0.98) return null;

  return (
    <div className="fixed right-6 top-1/2 z-30 -translate-y-1/2 pointer-events-none">
      <div className="relative h-32 w-px bg-white/10 overflow-hidden rounded-full">
        <div
          className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[#0A3D91] to-[#c9a227] transition-[height] duration-150 ease-out"
          style={{ height: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
