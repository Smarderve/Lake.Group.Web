"use client";

import { motion } from "framer-motion";

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            "radial-gradient(ellipse 70% 45% at 25% 15%, rgba(26, 111, 212, 0.18) 0%, transparent 65%), radial-gradient(ellipse 55% 35% at 75% 55%, rgba(10, 61, 145, 0.14) 0%, transparent 55%)",
            "radial-gradient(ellipse 65% 50% at 35% 20%, rgba(26, 111, 212, 0.22) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 65% 50%, rgba(10, 61, 145, 0.18) 0%, transparent 50%)",
            "radial-gradient(ellipse 75% 40% at 20% 18%, rgba(26, 111, 212, 0.16) 0%, transparent 68%), radial-gradient(ellipse 60% 38% at 80% 58%, rgba(10, 61, 145, 0.15) 0%, transparent 52%)",
            "radial-gradient(ellipse 70% 45% at 25% 15%, rgba(26, 111, 212, 0.18) 0%, transparent 65%), radial-gradient(ellipse 55% 35% at 75% 55%, rgba(10, 61, 145, 0.14) 0%, transparent 55%)",
          ],
        }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -top-1/4 left-1/4 h-[60vh] w-[60vw] rounded-full blur-[120px]"
        style={{ background: "rgba(26, 111, 212, 0.08)" }}
        animate={{ x: [0, 40, -20, 0], y: [0, 30, 10, 0], opacity: [0.6, 1, 0.7, 0.6] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 right-1/4 h-[50vh] w-[50vw] rounded-full blur-[100px]"
        style={{ background: "rgba(10, 61, 145, 0.1)" }}
        animate={{ x: [0, -30, 20, 0], y: [0, -20, 10, 0], opacity: [0.5, 0.9, 0.6, 0.5] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
