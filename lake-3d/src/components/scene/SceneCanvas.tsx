"use client";

import "@/lib/suppressThreeDeprecations";
import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, AdaptiveDpr, AdaptiveEvents, Preload } from "@react-three/drei";
import { useTier } from "@/context/PerformanceContext";
import { PetrolStream } from "./PetrolStream";
import { HeroDrop } from "./HeroDrop";
import { Droplets } from "./Droplets";
import { FloatingParticles } from "./FloatingParticles";
import { StorageTank } from "./StorageTank";
import { TankFullEffects } from "./TankFullEffects";
import { InletConnection } from "./InletConnection";
import { CameraRig } from "./CameraRig";
import { SceneLights } from "./SceneLights";
import { VolumetricFog } from "./VolumetricFog";
import { StreamSparkles } from "./StreamSparkles";
import { PostEffects } from "./PostEffects";

interface SceneCanvasProps {
  onReady?: () => void;
}

function SceneContent() {
  const tier = useTier();
  const isLow = tier === "low";

  return (
    <>
      <color attach="background" args={["#020611"]} />
      <fog attach="fog" args={["#020611", isLow ? 12 : 15, isLow ? 55 : 70]} />

      <SceneLights />
      <Environment preset="night" environmentIntensity={isLow ? 0.45 : 0.6} />

      <CameraRig />

      <HeroDrop />
      <PetrolStream />
      {!isLow && <StreamSparkles />}
      <InletConnection />
      {!isLow && <Droplets />}
      <FloatingParticles />
      <StorageTank />
      <TankFullEffects />
      {!isLow && <VolumetricFog />}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -50, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#020611" roughness={0.9} metalness={0.1} />
      </mesh>

      <Preload all />
      <PostEffects tier={tier} />
    </>
  );
}

function Loader() {
  return (
    <mesh>
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshBasicMaterial color="#0A3D91" wireframe />
    </mesh>
  );
}

export function SceneCanvas({ onReady }: SceneCanvasProps) {
  const tier = useTier();

  return (
    <div className="canvas-fixed">
      <Canvas
        shadows={tier !== "low"}
        dpr={tier === "low" ? [1, 1.5] : [1, 2]}
        gl={{
          antialias: tier !== "low",
          alpha: false,
          powerPreference: "high-performance",
          stencil: false,
        }}
        camera={{ fov: 50, near: 0.1, far: 200 }}
        onCreated={() => onReady?.()}
      >
        <AdaptiveDpr pixelated />
        <AdaptiveEvents />
        <Suspense fallback={<Loader />}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
}
