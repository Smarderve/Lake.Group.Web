"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useScrollProgress } from "@/context/ScrollContext";
import { createPetrolCurve } from "@/lib/curveUtils";

const SPARKLE_COUNT = 35;

export function StreamSparkles() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { progress } = useScrollProgress();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const samples = useMemo(
    () =>
      Array.from({ length: SPARKLE_COUNT }, (_, i) => ({
        t: (i / SPARKLE_COUNT) * 0.95 + 0.02,
        phase: (i * 1.7) % (Math.PI * 2),
        speed: 0.8 + (i % 5) * 0.15,
      })),
    []
  );

  useFrame((state) => {
    if (!meshRef.current || progress < 0.03) return;
    const curve = createPetrolCurve(progress);
    const time = state.clock.elapsedTime;

    samples.forEach((s, i) => {
      const t = (s.t + time * 0.015 * s.speed) % 0.98;
      const point = curve.getPoint(t);
      const tangent = curve.getTangent(t);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      point.add(normal.multiplyScalar(Math.sin(time * s.speed + s.phase) * 0.25));

      dummy.position.copy(point);
      const flicker = 0.5 + Math.sin(time * 5 + s.phase) * 0.5;
      dummy.scale.setScalar(0.025 * flicker * Math.min(1, progress * 3));
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, SPARKLE_COUNT]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#f5d78e" transparent opacity={0.85} />
    </instancedMesh>
  );
}
