"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface LoadingOverlayProps {
  visible: boolean;
}

export function LoadingOverlay({ visible }: LoadingOverlayProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1, ease: "easeInOut" }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#020611]"
        >
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Image
              src="/lake-group-logo.png"
              alt="Lake Group"
              width={410}
              height={123}
              priority
              className="h-auto w-56 md:w-72"
            />
          </motion.div>
          <motion.div
            className="mt-8 h-px w-32 bg-gradient-to-r from-transparent via-[#0A3D91] to-transparent"
            animate={{ scaleX: [0.3, 1, 0.3], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
