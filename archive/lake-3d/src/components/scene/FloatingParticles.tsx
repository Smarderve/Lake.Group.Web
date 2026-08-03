"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useScrollProgress } from "@/context/ScrollContext";
import { useTier } from "@/context/PerformanceContext";
import { createParticleData } from "@/lib/randomUtils";

const PARTICLE_COUNT = 200;
const PARTICLE_COUNT_LOW = 80;
const PARTICLES = createParticleData(PARTICLE_COUNT);

export function FloatingParticles() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { progress } = useScrollProgress();
  const tier = useTier();
  const count = tier === "low" ? PARTICLE_COUNT_LOW : PARTICLE_COUNT;
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      const p = PARTICLES[i];
      dummy.position.set(
        p.x + Math.sin(time * p.speed + p.phase) * 0.5,
        p.y + Math.sin(time * p.speed * 0.7 + p.phase) * 0.8 - progress * 5,
        p.z + Math.cos(time * p.speed + p.phase) * 0.5
      );
      const flicker = 0.5 + Math.sin(time * 4 + p.phase) * 0.5;
      dummy.scale.setScalar(p.scale * flicker);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, tier === "low" ? 3 : 4, tier === "low" ? 3 : 4]} />
      <meshBasicMaterial color="#4a90d9" transparent opacity={0.6} />
    </instancedMesh>
  );
}
