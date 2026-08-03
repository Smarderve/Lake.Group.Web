import * as THREE from "three";
import { TANK_INLET_Y } from "./tankConstants";

function phase(progress: number, start: number, end: number): number {
  if (progress <= start) return 0;
  if (progress >= end) return 1;
  return (progress - start) / (end - start);
}

export function createPetrolCurve(progress: number): THREE.CatmullRomCurve3 {
  const twist = progress * Math.PI * 2.5;
  const widenPhase = phase(progress, 0.2, 0.55);
  const narrowPhase = phase(progress, 0.55, 0.75);
  const widen = 1 + Math.sin(widenPhase * Math.PI) * 0.7 - narrowPhase * 0.3;
  const bend = Math.sin(progress * Math.PI * 1.8) * 2.8;
  const accel = Math.pow(Math.sin(progress * Math.PI * 0.65), 1.4);
  const slow = 1 - phase(progress, 0.6, 0.78) * 0.4;
  const inletBlend = phase(progress, 0.62, 0.82);

  const yDrop = (y: number) => y - progress * 3 * slow;

  const points = [
    new THREE.Vector3(0, yDrop(14), 0),
    new THREE.Vector3(
      Math.sin(twist * 0.3) * 0.6 * widen,
      yDrop(10 - accel * 5),
      Math.cos(twist * 0.2) * 0.4
    ),
    new THREE.Vector3(
      Math.sin(twist * 0.6 + 0.5) * 1.8 * widen + bend * 0.35,
      yDrop(3 - accel * 3),
      Math.cos(twist * 0.5) * 1.4
    ),
    new THREE.Vector3(
      Math.sin(twist + 1) * 2.2 * widen + bend * 0.5,
      yDrop(-4 - progress * 4),
      Math.cos(twist * 0.8) * 1.6
    ),
    new THREE.Vector3(
      Math.sin(twist * 1.2 + 2) * 1.4 * (1 + inletBlend * -0.5),
      yDrop(-12 - progress * 6),
      Math.cos(twist * 1.1) * 0.8 * (1 - inletBlend * 0.6)
    ),
    new THREE.Vector3(
      Math.sin(twist * 0.2) * 0.3 * (1 - inletBlend),
      THREE.MathUtils.lerp(yDrop(-22), TANK_INLET_Y + 4, inletBlend),
      Math.cos(twist * 0.15) * 0.2 * (1 - inletBlend)
    ),
    new THREE.Vector3(
      0,
      THREE.MathUtils.lerp(yDrop(-30), TANK_INLET_Y, inletBlend),
      0
    ),
  ];

  return new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.5);
}

export function getCameraState(progress: number) {
  const curve = createPetrolCurve(progress);
  const followT = Math.min(0.97, progress * 0.92 + 0.03);
  const lookT = Math.min(0.99, followT + 0.035 + phase(progress, 0.5, 0.8) * 0.02);

  const orbitStart = 0.86;
  if (progress > orbitStart) {
    const orbitT = (progress - orbitStart) / (1 - orbitStart);
    const angle = orbitT * Math.PI * 0.85;
    const radius = 11 + orbitT * 5;
    const tankY = -42;
    return {
      position: new THREE.Vector3(
        Math.sin(angle) * radius,
        tankY + 5 + orbitT * 3,
        Math.cos(angle) * radius
      ),
      target: new THREE.Vector3(0, tankY + 3, 0),
      fov: 44 + orbitT * 6,
    };
  }

  const position = curve.getPoint(followT);
  const target = curve.getPoint(lookT);

  const offset = new THREE.Vector3(
    Math.sin(progress * Math.PI * 2.2) * (2.8 - progress * 0.8),
    2.2 + Math.sin(progress * Math.PI) * 1.8,
    4.5 + Math.cos(progress * Math.PI * 1.6) * 2.5
  );

  return {
    position: position.clone().add(offset),
    target: target.clone(),
    fov: 52 - progress * 10,
  };
}

export function getTankFillLevel(progress: number): number {
  const fillStart = 0.68;
  if (progress < fillStart) return 0;
  const t = (progress - fillStart) / (0.97 - fillStart);
  return Math.min(1, Math.pow(t, 0.8));
}

export function getStreamRadius(progress: number): number {
  const base = 0.32;
  const pulse = Math.sin(progress * Math.PI * 4) * 0.06;
  const widen = Math.sin(progress * Math.PI) * 0.18;
  const inlet = phase(progress, 0.7, 0.85);
  const neck = inlet * 0.12;
  return base + pulse + widen - neck;
}
