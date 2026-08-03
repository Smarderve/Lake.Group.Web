/** Deterministic pseudo-random (module scope — safe for React render). */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function createParticleData(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const s = i + 1;
    return {
      x: (seededRandom(s * 1.1) - 0.5) * 30,
      y: seededRandom(s * 2.3) * 50 - 25,
      z: (seededRandom(s * 3.7) - 0.5) * 20,
      speed: 0.2 + seededRandom(s * 4.1) * 0.5,
      phase: seededRandom(s * 5.9) * Math.PI * 2,
      scale: 0.02 + seededRandom(s * 6.3) * 0.04,
    };
  });
}

export function createDropletData(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const s = i + 100;
    return {
      t: (i / count) * 0.9 + 0.05,
      phase: seededRandom(s * 1.7) * Math.PI * 2,
      speed: 0.3 + seededRandom(s * 2.1) * 0.7,
      scale: 0.04 + seededRandom(s * 3.3) * 0.06,
      detach: seededRandom(s * 4.5) > 0.7,
    };
  });
}

export function createPressureData(count: number, radius: number) {
  return Array.from({ length: count }, (_, i) => {
    const s = i + 200;
    return {
      angle: seededRandom(s * 1.3) * Math.PI * 2,
      radius,
      speed: 0.5 + seededRandom(s * 2.7),
      phase: seededRandom(s * 3.1) * Math.PI * 2,
    };
  });
}
