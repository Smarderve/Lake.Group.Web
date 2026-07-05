"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useScrollProgress } from "@/context/ScrollContext";
import { getTankFillLevel } from "@/lib/curveUtils";
import { TANK_Y, TANK_HEIGHT, TANK_RADIUS } from "@/lib/tankConstants";

export function TankFullEffects() {
  const ringRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  const { progress } = useScrollProgress();

  useFrame((state) => {
    const fill = getTankFillLevel(progress);
    const full = fill > 0.92;
    const t = state.clock.elapsedTime;

    if (ringRef.current) {
      ringRef.current.visible = full;
      const scale = 1 + ((t * 0.8) % 1) * 0.15;
      ringRef.current.scale.set(scale, scale, 1);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.35 * (1 - ((t * 0.8) % 1));
    }

    if (glowRef.current) {
      glowRef.current.intensity = full ? 1.2 + Math.sin(t * 3) * 0.4 : 0;
    }
  });

  return (
    <group position={[0, TANK_Y + TANK_HEIGHT / 2 + 0.2, 0]}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[TANK_RADIUS * 0.7, TANK_RADIUS * 0.85, 48]} />
        <meshBasicMaterial color="#f5d78e" transparent opacity={0.3} depthWrite={false} />
      </mesh>
      <pointLight ref={glowRef} color="#c9a227" distance={20} intensity={0} />
    </group>
  );
}
