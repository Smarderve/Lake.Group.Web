"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Float } from "@react-three/drei";
import * as THREE from "three";
import { useScrollProgress } from "@/context/ScrollContext";
import { getTankFillLevel } from "@/lib/curveUtils";
import { createPressureData } from "@/lib/randomUtils";
import { TANK_Y, TANK_HEIGHT, TANK_RADIUS } from "@/lib/tankConstants";

const PRESSURE_OFFSETS = createPressureData(20, TANK_RADIUS * 0.85);

export function StorageTank() {
  const fillRef = useRef<THREE.Mesh>(null);
  const pressureRef = useRef<THREE.InstancedMesh>(null);
  const { progress } = useScrollProgress();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    const fill = getTankFillLevel(progress);
    const time = state.clock.elapsedTime;

    if (fillRef.current) {
      const fillHeight = TANK_HEIGHT * fill * 0.92;
      fillRef.current.scale.y = fillHeight;
      fillRef.current.position.y = TANK_Y - TANK_HEIGHT / 2 + fillHeight / 2 + 0.5;
      fillRef.current.visible = fill > 0.01;
    }

    if (pressureRef.current && fill > 0.85) {
      const intensity = (fill - 0.85) / 0.15;
      PRESSURE_OFFSETS.forEach((p, i) => {
        const y = TANK_Y + TANK_HEIGHT / 2 + Math.sin(time * p.speed + p.phase) * 0.3;
        dummy.position.set(
          Math.cos(p.angle + time * 0.2) * p.radius,
          y,
          Math.sin(p.angle + time * 0.2) * p.radius
        );
        dummy.scale.setScalar(0.03 * intensity);
        dummy.updateMatrix();
        pressureRef.current!.setMatrixAt(i, dummy.matrix);
      });
      pressureRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  const tankOpacity = Math.min(1, Math.max(0, (progress - 0.45) * 3));
  const fill = getTankFillLevel(progress);

  return (
    <group position={[0, TANK_Y, 0]} visible={tankOpacity > 0.01}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[TANK_RADIUS, TANK_RADIUS, TANK_HEIGHT, 64, 1, true]} />
        <meshPhysicalMaterial
          color="#0A3D91"
          metalness={0.7}
          roughness={0.25}
          clearcoat={0.4}
          clearcoatRoughness={0.3}
          side={THREE.DoubleSide}
          envMapIntensity={1.5}
        />
      </mesh>

      <mesh position={[0, TANK_HEIGHT / 2, 0]} castShadow>
        <cylinderGeometry args={[TANK_RADIUS, TANK_RADIUS, 0.3, 64]} />
        <meshPhysicalMaterial
          color="#083060"
          metalness={0.8}
          roughness={0.2}
          clearcoat={0.5}
        />
      </mesh>
      <mesh position={[0, -TANK_HEIGHT / 2, 0]} receiveShadow>
        <cylinderGeometry args={[TANK_RADIUS, TANK_RADIUS, 0.3, 64]} />
        <meshPhysicalMaterial
          color="#062848"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      <mesh position={[0, TANK_HEIGHT / 2 + 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.5, 3, 16]} />
        <meshPhysicalMaterial color="#0A3D91" metalness={0.8} roughness={0.2} />
      </mesh>

      <mesh ref={fillRef} position={[0, -TANK_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[TANK_RADIUS * 0.92, TANK_RADIUS * 0.92, 1, 48]} />
        <meshPhysicalMaterial
          color="#0a0a0c"
          metalness={0.9}
          roughness={0.08}
          clearcoat={1}
          clearcoatRoughness={0.02}
          emissive="#c9a227"
          emissiveIntensity={0.05 + fill * 0.1}
        />
      </mesh>

      <Float speed={0.5} rotationIntensity={0} floatIntensity={0.1}>
        <Text
          position={[0, -0.06, TANK_RADIUS + 0.03]}
          fontSize={1.2}
          color="#000000"
          fillOpacity={0.45}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.15}
        >
          LAKE OIL
        </Text>
        <Text
          position={[0, 0.04, TANK_RADIUS + 0.06]}
          fontSize={1.2}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.15}
          outlineWidth={0.015}
          outlineColor="#000000"
        >
          LAKE OIL
        </Text>
      </Float>

      <mesh position={[0, 0, TANK_RADIUS + 0.02]}>
        <planeGeometry args={[5, 1.8]} />
        <meshPhysicalMaterial
          color="#083060"
          metalness={0.6}
          roughness={0.4}
          transparent
          opacity={0.3}
        />
      </mesh>

      <instancedMesh ref={pressureRef} args={[undefined, undefined, 20]}>
        <sphereGeometry args={[1, 4, 4]} />
        <meshBasicMaterial color="#f5d78e" transparent opacity={0.7} />
      </instancedMesh>

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -TANK_HEIGHT / 2 - 0.1, 0]}
        receiveShadow
      >
        <circleGeometry args={[TANK_RADIUS * 1.5, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.4} />
      </mesh>
    </group>
  );
}
