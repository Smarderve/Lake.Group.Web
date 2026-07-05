"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import { useScrollProgress } from "@/context/ScrollContext";

export function HeroDrop() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { progress } = useScrollProgress();

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;

    const forming = Math.max(0, 1 - progress * 12);
    const scale = 0.08 + forming * 0.18 + Math.sin(t * 2) * 0.01 * forming;
    meshRef.current.scale.setScalar(scale);
    meshRef.current.position.y = 12.5 - progress * 2;
    meshRef.current.visible = forming > 0.01;
    meshRef.current.rotation.y = t * 0.3;
  });

  return (
    <mesh ref={meshRef} position={[0, 12.5, 0]} castShadow>
      <sphereGeometry args={[1, 32, 32]} />
      <meshPhysicalMaterial
        color="#0a0a0c"
        metalness={0.95}
        roughness={0.06}
        clearcoat={1}
        clearcoatRoughness={0.02}
        emissive="#c9a227"
        emissiveIntensity={0.15}
        envMapIntensity={2.5}
      />
    </mesh>
  );
}
