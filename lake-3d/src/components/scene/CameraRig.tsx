"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { useScrollProgress } from "@/context/ScrollContext";
import { getCameraState } from "@/lib/curveUtils";

const SMOOTH = 0.04;

export function CameraRig() {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const { progress } = useScrollProgress();

  const currentPos = useRef(new THREE.Vector3(0, 16, 12));
  const currentTarget = useRef(new THREE.Vector3(0, 10, 0));
  const currentFov = useRef(50);

  useFrame(() => {
    const cam = cameraRef.current;
    if (!cam) return;

    const state = getCameraState(progress);

    currentPos.current.lerp(state.position, SMOOTH);
    currentTarget.current.lerp(state.target, SMOOTH);
    currentFov.current += (state.fov - currentFov.current) * SMOOTH;

    cam.position.copy(currentPos.current);
    cam.lookAt(currentTarget.current);
    cam.fov = currentFov.current;
    cam.updateProjectionMatrix();
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      fov={50}
      near={0.1}
      far={200}
      position={[0, 16, 12]}
    />
  );
}
