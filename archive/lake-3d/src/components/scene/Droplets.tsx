"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useScrollProgress } from "@/context/ScrollContext";
import { createPetrolCurve } from "@/lib/curveUtils";
import { createDropletData } from "@/lib/randomUtils";

const DROPLET_COUNT = 40;
const DROPLET_OFFSETS = createDropletData(DROPLET_COUNT);

export function Droplets() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { progress } = useScrollProgress();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const curve = createPetrolCurve(progress);
    const time = state.clock.elapsedTime;

    DROPLET_OFFSETS.forEach((drop, i) => {
      const t = (drop.t + time * 0.02 * drop.speed * progress) % 1;
      const point = curve.getPoint(Math.min(t, 0.99));
      const tangent = curve.getTangent(Math.min(t, 0.99));

      dummy.position.copy(point);
      if (drop.detach && progress > 0.2) {
        dummy.position.x += Math.sin(time * drop.speed + drop.phase) * 0.3;
        dummy.position.y -= (time * drop.speed * 0.05) % 2;
        dummy.position.z += Math.cos(time * drop.speed + drop.phase) * 0.3;
      }

      dummy.position.add(
        tangent.clone().multiplyScalar(Math.sin(time + drop.phase) * 0.1)
      );

      const scale =
        drop.scale * (1 + Math.sin(time * 3 + drop.phase) * 0.2) * (progress > 0.05 ? 1 : 0);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, DROPLET_COUNT]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshPhysicalMaterial
        color="#0a0a0c"
        metalness={0.95}
        roughness={0.1}
        clearcoat={1}
        clearcoatRoughness={0.05}
        envMapIntensity={2}
        transparent
        opacity={0.9}
      />
    </instancedMesh>
  );
}
