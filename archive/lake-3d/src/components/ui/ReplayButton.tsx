"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useScrollProgress } from "@/context/ScrollContext";

export function ReplayButton() {
  const { progress } = useScrollProgress();
  const visible = progress > 0.985;

  const replay = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, delay: 2 }}
          onClick={replay}
          className="fixed bottom-8 left-1/2 z-40 -translate-x-1/2 pointer-events-auto px-6 py-2.5 rounded-full border border-white/15 bg-white/5 backdrop-blur-md text-xs tracking-[0.25em] uppercase text-white/70 hover:text-white hover:border-[#0A3D91]/60 hover:bg-[#0A3D91]/20 transition-all duration-300"
        >
          Replay Journey
        </motion.button>
      )}
    </AnimatePresence>
  );
}
