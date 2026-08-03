"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useScrollProgress } from "@/context/ScrollContext";

export function SceneLights() {
  const spotRef = useRef<THREE.SpotLight>(null);
  const blueRef = useRef<THREE.PointLight>(null);
  const goldRef = useRef<THREE.PointLight>(null);
  const tankRef = useRef<THREE.PointLight>(null);
  const { progress } = useScrollProgress();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const tankPhase = Math.max(0, (progress - 0.5) / 0.5);

    if (spotRef.current) {
      spotRef.current.position.x = Math.sin(t * 0.3) * 8;
      spotRef.current.position.z = Math.cos(t * 0.2) * 8;
      spotRef.current.intensity = 1.8 + progress * 0.6;
    }
    if (blueRef.current) {
      blueRef.current.intensity = 1.2 + Math.sin(t * 0.8) * 0.3 + progress * 0.4;
    }
    if (goldRef.current) {
      goldRef.current.position.y = 5 + Math.sin(t * 0.5) * 2 - progress * 8;
      goldRef.current.intensity = 1 + Math.sin(t * 0.6) * 0.3;
    }
    if (tankRef.current) {
      tankRef.current.intensity = tankPhase * (1.5 + Math.sin(t * 1.2) * 0.3);
    }
  });

  return (
    <>
      <ambientLight intensity={0.12 + progress * 0.06} color="#1a2840" />
      <directionalLight
        position={[10, 20, 10]}
        intensity={0.7 + progress * 0.3}
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={80}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-60}
      />
      <spotLight
        ref={spotRef}
        position={[5, 15, 5]}
        angle={0.4}
        penumbra={0.8}
        intensity={2}
        color="#4a90d9"
        castShadow
      />
      <pointLight ref={blueRef} position={[-8, 10, -5]} intensity={1.5} color="#1a6fd4" />
      <pointLight ref={goldRef} position={[6, 8, 4]} intensity={1.2} color="#c9a227" />
      <pointLight ref={tankRef} position={[0, -35, 6]} intensity={0} color="#0A3D91" distance={25} />
      <hemisphereLight args={["#1a3a6a", "#020611", 0.35 + progress * 0.15]} />
    </>
  );
}
