"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";

interface ScrollContextValue {
  progress: number;
  setProgress: (p: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const ScrollContext = createContext<ScrollContextValue>({
  progress: 0,
  setProgress: () => {},
  containerRef: { current: null },
});

export function ScrollProvider({ children }: { children: ReactNode }) {
  const [progress, setProgressState] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const setProgress = useCallback((p: number) => {
    setProgressState(Math.max(0, Math.min(1, p)));
  }, []);

  return (
    <ScrollContext.Provider value={{ progress, setProgress, containerRef }}>
      {children}
    </ScrollContext.Provider>
  );
}

export function useScrollProgress() {
  return useContext(ScrollContext);
}
