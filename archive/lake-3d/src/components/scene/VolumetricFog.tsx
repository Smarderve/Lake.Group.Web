"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useScrollProgress } from "@/context/ScrollContext";

export function VolumetricFog() {
  const backRef = useRef<THREE.Mesh>(null);
  const sideRef = useRef<THREE.Mesh>(null);
  const groundRef = useRef<THREE.Mesh>(null);
  const { progress } = useScrollProgress();

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (backRef.current) {
      backRef.current.rotation.y = t * 0.015;
      const mat = backRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.04 + Math.sin(t * 0.3) * 0.012 + progress * 0.025;
    }
    if (sideRef.current) {
      sideRef.current.rotation.y = -t * 0.01;
      const mat = sideRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.03 + progress * 0.02;
    }
    if (groundRef.current) {
      const mat = groundRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.025 + progress * 0.03;
    }
  });

  return (
    <group>
      <mesh ref={backRef} position={[0, 0, -8]}>
        <planeGeometry args={[70, 90]} />
        <meshBasicMaterial
          color="#1a6fd4"
          transparent
          opacity={0.05}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={sideRef} position={[12, -5, 0]} rotation={[0, -Math.PI / 4, 0]}>
        <planeGeometry args={[50, 70]} />
        <meshBasicMaterial
          color="#0A3D91"
          transparent
          opacity={0.04}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={groundRef} position={[0, -25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[90, 90]} />
        <meshBasicMaterial
          color="#0A3D91"
          transparent
          opacity={0.03}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
