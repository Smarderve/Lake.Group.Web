"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useScrollProgress } from "@/context/ScrollContext";
import { createPetrolCurve, getStreamRadius } from "@/lib/curveUtils";
import { createGoldEnvMap } from "@/lib/createEnvMap";

const petrolVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  uniform float uTime;
  uniform float uRipple;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);

    vec3 pos = position;
    float ripple = sin(pos.y * 8.0 + uTime * 3.0) * 0.015 * uRipple;
    ripple += sin(pos.y * 15.0 - uTime * 2.0) * 0.008 * uRipple;
    ripple += sin(pos.y * 25.0 + uTime * 4.5) * 0.004 * uRipple;
    pos += normal * ripple;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const petrolFragmentShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  uniform float uTime;
  uniform float uFlowSpeed;
  uniform samplerCube uEnvMap;

  void main() {
    vec3 viewDir = normalize(vViewPosition);
    vec3 normal = normalize(vNormal);

    vec3 reflectDir = reflect(-viewDir, normal);
    vec3 envColor = textureCube(uEnvMap, reflectDir).rgb;

    vec3 baseColor = vec3(0.02, 0.02, 0.025);
    vec3 goldTint = vec3(0.85, 0.65, 0.2);

    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
    float spec = pow(max(dot(reflectDir, normalize(vec3(0.2, 1.0, 0.3))), 0.0), 48.0);

    vec3 color = baseColor;
    color = mix(color, envColor * goldTint, fresnel * 0.9);
    color += goldTint * spec * 0.75;

    float flow = sin(vUv.y * 24.0 - uTime * uFlowSpeed) * 0.5 + 0.5;
    flow *= sin(vUv.y * 8.0 + uTime * uFlowSpeed * 0.4) * 0.5 + 0.5;
    color += goldTint * flow * 0.07 * fresnel;

    float alpha = 0.9 + fresnel * 0.1;
    gl_FragColor = vec4(color, alpha);
  }
`;

function buildTubeGeometry(progress: number) {
  const curve = createPetrolCurve(progress);
  const radius = getStreamRadius(progress);
  return new THREE.TubeGeometry(curve, 96, radius, 12, false);
}

export function PetrolStream() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const lastProgress = useRef(-1);
  const { progress } = useScrollProgress();

  const envMap = useMemo(() => createGoldEnvMap(), []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRipple: { value: 1 },
      uFlowSpeed: { value: 2.5 },
      uEnvMap: { value: envMap },
    }),
    [envMap]
  );

  const initialGeometry = useMemo(() => buildTubeGeometry(0), []);

  useFrame((state) => {
    const p = progress;

    if (materialRef.current) {
      const mat = materialRef.current;
      mat.uniforms.uTime.value = state.clock.elapsedTime;
      mat.uniforms.uRipple.value = 0.5 + Math.sin(p * Math.PI * 4) * 0.5;
      mat.uniforms.uFlowSpeed.value = 1.5 + p * 4 + Math.sin(p * Math.PI * 3) * 1.5;
    }

    if (meshRef.current && Math.abs(p - lastProgress.current) > 0.001) {
      lastProgress.current = p;
      const newGeo = buildTubeGeometry(p);
      meshRef.current.geometry.dispose();
      meshRef.current.geometry = newGeo;
    }
  });

  return (
    <mesh ref={meshRef} geometry={initialGeometry} castShadow receiveShadow>
      <shaderMaterial
        ref={materialRef}
        vertexShader={petrolVertexShader}
        fragmentShader={petrolFragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
        depthWrite
      />
    </mesh>
  );
}
