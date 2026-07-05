"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useScrollProgress } from "@/context/ScrollContext";

export function EndingOverlay() {
  const { progress } = useScrollProgress();

  const show = progress > 0.92;
  const fillComplete = progress > 0.97;
  const vignette = Math.min(1, Math.max(0, (progress - 0.9) * 5));

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="overlay-fixed flex flex-col items-center justify-end pb-16 md:pb-24"
          style={{
            background: `radial-gradient(ellipse 80% 50% at 50% 80%, rgba(10, 61, 145, ${0.2 * vignette}) 0%, transparent 70%)`,
            boxShadow: `inset 0 0 ${120 * vignette}px rgba(0,0,0,${0.4 * vignette})`,
          }}
        >
          <AnimatePresence>
            {fillComplete && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, delay: 0.5 }}
                className="flex flex-col items-center text-center px-6"
              >
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="mb-6"
                >
                  <Image
                    src="/lake-group-logo.png"
                    alt="Lake Group"
                    width={410}
                    height={123}
                    className="h-auto w-40 md:w-56 opacity-90"
                  />
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: 1 }}
                  className="text-2xl md:text-4xl font-light tracking-wide text-white mb-3"
                >
                  Fueling{" "}
                  <span className="text-gold-gradient font-medium">Progress</span>
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: 1.5 }}
                  className="text-lg md:text-2xl text-white/50 font-light tracking-[0.2em]"
                >
                  Lake Group
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
