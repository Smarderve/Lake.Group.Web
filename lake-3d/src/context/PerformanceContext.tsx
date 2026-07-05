"use client";

import { createContext, useContext, type ReactNode } from "react";
import { usePerformanceTier, type PerformanceTier } from "@/hooks/usePerformanceTier";

const PerformanceContext = createContext<PerformanceTier>("high");

export function PerformanceProvider({ children }: { children: ReactNode }) {
  const tier = usePerformanceTier();
  return (
    <PerformanceContext.Provider value={tier}>{children}</PerformanceContext.Provider>
  );
}

export function useTier() {
  return useContext(PerformanceContext);
}
