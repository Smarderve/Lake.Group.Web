"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

interface UseAutoScrollOptions {
  enabled: boolean;
  duration?: number;
  delay?: number;
}

export function useAutoScroll({
  enabled,
  duration = 50,
  delay = 1200,
}: UseAutoScrollOptions) {
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    cancelledRef.current = false;

    const cancel = () => {
      if (cancelledRef.current) return;
      cancelledRef.current = true;
      tweenRef.current?.kill();
    };

    const startTimer = window.setTimeout(() => {
      ScrollTrigger.refresh();
      const maxScroll = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight
      );
      if (maxScroll <= 0 || cancelledRef.current) return;

      const proxy = { y: window.scrollY };

      tweenRef.current = gsap.to(proxy, {
        y: maxScroll,
        duration,
        ease: "power1.inOut",
        onUpdate: () => {
          window.scrollTo(0, proxy.y);
        },
      });
    }, delay);

    window.addEventListener("wheel", cancel, { passive: true });
    window.addEventListener("touchstart", cancel, { passive: true });
    window.addEventListener("keydown", cancel);
    window.addEventListener("mousedown", cancel);

    return () => {
      window.clearTimeout(startTimer);
      cancel();
      window.removeEventListener("wheel", cancel);
      window.removeEventListener("touchstart", cancel);
      window.removeEventListener("keydown", cancel);
      window.removeEventListener("mousedown", cancel);
    };
  }, [enabled, duration, delay]);
}
