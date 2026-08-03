"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useScrollProgress } from "@/context/ScrollContext";

export function HeroOverlay() {
  const { progress } = useScrollProgress();

  const heroOpacity = Math.max(0, 1 - progress * 6);
  const dropOpacity = Math.max(0, Math.min(1, progress * 8) * (1 - progress * 3));

  return (
    <div
      className="overlay-fixed flex flex-col items-center justify-start pt-16 md:pt-24"
      style={{ opacity: heroOpacity }}
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="mb-8"
      >
        <Image
          src="/lake-group-logo.png"
          alt="Lake Group"
          width={410}
          height={123}
          priority
          className="h-auto w-48 md:w-72 drop-shadow-lg"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, delay: 0.3 }}
        className="text-center px-6"
      >
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-light tracking-wide text-white mb-4">
          Powering Tanzania{" "}
          <span className="text-gold-gradient font-medium">Forward</span>
        </h1>
        <p className="text-base md:text-xl text-white/60 font-light tracking-widest uppercase">
          Reliable Energy. Trusted Innovation.
        </p>
      </motion.div>

      {/* Forming drop hint */}
      <motion.div
        className="mt-16 flex flex-col items-center gap-3"
        style={{ opacity: dropOpacity }}
      >
        <div className="w-3 h-3 rounded-full bg-gradient-to-b from-[#f5d78e] to-[#c9a227] shadow-lg shadow-[#c9a227]/30" />
        <p className="text-xs text-white/30 tracking-[0.3em] uppercase">
          Scroll or watch the journey unfold
        </p>
      </motion.div>
    </div>
  );
}
