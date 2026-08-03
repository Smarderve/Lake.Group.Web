"use client";

import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useScrollProgress } from "@/context/ScrollContext";

gsap.registerPlugin(ScrollTrigger);

export function useScrollTriggerSetup() {
  const { setProgress, containerRef } = useScrollProgress();

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const trigger = ScrollTrigger.create({
      trigger: container,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.6,
      onUpdate: (self) => {
        setProgress(self.progress);
      },
    });

    const refresh = () => ScrollTrigger.refresh();
    refresh();
    const t1 = window.setTimeout(refresh, 100);
    const t2 = window.setTimeout(refresh, 800);
    window.addEventListener("resize", refresh);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("resize", refresh);
      trigger.kill();
    };
  }, [containerRef, setProgress]);
}
