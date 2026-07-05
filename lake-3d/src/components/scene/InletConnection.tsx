"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useScrollProgress } from "@/context/ScrollContext";
import { createPetrolCurve, getStreamRadius } from "@/lib/curveUtils";
import { TANK_INLET_Y } from "@/lib/tankConstants";

export function InletConnection() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { progress } = useScrollProgress();

  useFrame((state) => {
    if (!meshRef.current) return;
    const inletPhase = Math.max(0, Math.min(1, (progress - 0.58) / 0.25));
    meshRef.current.visible = inletPhase > 0.05;

    const curve = createPetrolCurve(progress);
    const top = curve.getPoint(0.97);
    const bottom = new THREE.Vector3(
      THREE.MathUtils.lerp(top.x, 0, inletPhase),
      TANK_INLET_Y,
      THREE.MathUtils.lerp(top.z, 0, inletPhase)
    );
    const height = Math.max(0.3, top.distanceTo(bottom));
    const radius = getStreamRadius(progress) * 0.8;

    const mid = top.clone().lerp(bottom, 0.5);
    meshRef.current.position.copy(mid);
    meshRef.current.scale.set(radius * 2, height, radius * 2);

    const dir = bottom.clone().sub(top).normalize();
    meshRef.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

    const mat = meshRef.current.material as THREE.MeshPhysicalMaterial;
    mat.emissiveIntensity = 0.06 + Math.sin(state.clock.elapsedTime * 4) * 0.04;
    mat.opacity = 0.85 + inletPhase * 0.1;
  });

  return (
    <mesh ref={meshRef} visible={false}>
      <cylinderGeometry args={[1, 0.55, 1, 16]} />
      <meshPhysicalMaterial
        color="#0a0a0c"
        metalness={0.92}
        roughness={0.06}
        clearcoat={1}
        clearcoatRoughness={0.02}
        emissive="#c9a227"
        emissiveIntensity={0.08}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
}
