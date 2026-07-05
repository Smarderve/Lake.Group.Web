/**
 * Suppress THREE.Clock deprecation noise until @react-three/fiber migrates to Timer.
 * Clock is read-only on the THREE namespace in r183+, so it cannot be replaced directly.
 */
import { setConsoleFunction } from "three";

let configured = false;

export function suppressThreeDeprecations() {
  if (configured || typeof window === "undefined") return;
  configured = true;

  setConsoleFunction((method, message, ...params) => {
    if (
      method === "warn" &&
      typeof message === "string" &&
      message.includes("Clock: This module has been deprecated")
    ) {
      return;
    }

    const fn =
      method === "error"
        ? console.error
        : method === "log"
          ? console.log
          : console.warn;

    fn(message, ...params);
  });
}

suppressThreeDeprecations();
